// Levenberg-Marquardt Algorithm for Non-Linear Least Squares

// Model: y = a * exp(-b * x) + c
// Params: p[0]=a, p[1]=b, p[2]=c

function model(x, p) {
    return p[0] * Math.exp(-p[1] * x) + p[2];
}

// Jacobian Matrix (Partial derivatives with respect to params)
// J[i][j] = df(xi)/dpj
function jacobian(x, p) {
    const expTerm = Math.exp(-p[1] * x);
    return [
        expTerm,                // df/da = exp(-bx)
        -p[0] * x * expTerm,    // df/db = -ax * exp(-bx)
        1.0                     // df/dc = 1
    ];
}

self.onmessage = async function(e) {
    const { command, data, initialParams } = e.data;

    if (command === 'fit') {
        let p = [...initialParams]; // [a, b, c]
        let lambda = 0.01; // Damping factor
        const maxIter = 100;
        
        let prevRSS = calculateRSS(data, p);

        for (let k = 0; k < maxIter; k++) {
            // 1. Compute Jacobian (J) and Residuals (r)
            const n = data.length;
            const numParams = p.length;
            
            // JTJ (Approximate Hessian) and JTr (Gradient)
            const JTJ = Array(numParams).fill(0).map(() => Array(numParams).fill(0));
            const JTr = Array(numParams).fill(0);
            
            for (let i = 0; i < n; i++) {
                const x = data[i].x;
                const y = data[i].y;
                const yPred = model(x, p);
                const r = y - yPred; // Residual
                
                const Jrow = jacobian(x, p);
                
                // Accumulate J^T * J and J^T * r
                for (let j = 0; j < numParams; j++) {
                    JTr[j] += Jrow[j] * r;
                    for (let l = 0; l < numParams; l++) {
                        JTJ[j][l] += Jrow[j] * Jrow[l];
                    }
                }
            }
            
            // 2. Apply Damping (Marquardt)
            // (JTJ + lambda * I) * delta = JTr
            // Augmented Normal Equations
            const A = JTJ.map(row => [...row]);
            for (let j = 0; j < numParams; j++) {
                A[j][j] += lambda * (A[j][j] === 0 ? 1 : A[j][j]); // Or just + lambda
                // Standard LM adds lambda * diag(JTJ)
            }
            
            // 3. Solve for delta (Gaussian Elimination)
            const delta = solveLinearSystem(A, JTr);
            
            // 4. Evaluate Candidate
            const pNew = p.map((val, i) => val + delta[i]);
            const newRSS = calculateRSS(data, pNew);
            
            // 5. Update Logic
            if (newRSS < prevRSS) {
                // Accept step
                p = pNew;
                lambda /= 10;
                prevRSS = newRSS;
                
                self.postMessage({
                    type: 'step',
                    data: { iter: k, rss: prevRSS, params: p }
                });
                
                await new Promise(r => setTimeout(r, 50)); // Visualization delay
                
                // Convergence check
                if (Math.abs(delta[0]) < 1e-5 && Math.abs(delta[1]) < 1e-5) break;
            } else {
                // Reject step, increase damping
                lambda *= 10;
            }
        }
        
        self.postMessage({ type: 'done' });
    }
};

function calculateRSS(data, p) {
    let sum = 0;
    for (let d of data) {
        sum += (d.y - model(d.x, p)) ** 2;
    }
    return sum;
}

// Simple Gaussian Elimination Solver for Ax = b
function solveLinearSystem(A, b) {
    const n = b.length;
    // Clone to avoid mutation
    const M = A.map(row => [...row]);
    const x = [...b];
    
    // Forward Elimination
    for (let i = 0; i < n; i++) {
        let pivot = M[i][i];
        for (let j = i + 1; j < n; j++) {
            const factor = M[j][i] / pivot;
            x[j] -= factor * x[i];
            for (let k = i; k < n; k++) {
                M[j][k] -= factor * M[i][k];
            }
        }
    }
    
    // Back Substitution
    const res = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += M[i][j] * res[j];
        }
        res[i] = (x[i] - sum) / M[i][i];
    }
    return res;
}
