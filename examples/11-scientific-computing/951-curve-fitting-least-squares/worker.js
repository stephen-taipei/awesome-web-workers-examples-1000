// Least Squares Fitting (Normal Equation)

let dataPoints = [];

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        const { n, noise } = e.data;
        dataPoints = [];
        // Generate random polynomial data: y = 1 - 2x + x^2 + noise
        // Or random periodic
        for (let i = 0; i < n; i++) {
            const x = i / (n - 1);
            const trueY = Math.sin(3 * Math.PI * x) + 0.5*x; 
            const y = trueY + (Math.random() - 0.5) * (noise / 50);
            dataPoints.push({x, y});
        }
        self.postMessage({ type: 'data', data: dataPoints });
    } 
    else if (command === 'fit') {
        try {
            const start = performance.now();
            const { degree } = e.data;
            
            // Solve for w: (X^T * X) * w = X^T * y
            // X is Vandermonde matrix [1, x, x^2 ...]
            
            const m = degree + 1;
            const n = dataPoints.length;
            
            // 1. Build X^T * X (Matrix A) and X^T * y (Vector b)
            // A is m x m symmetric
            // b is m x 1
            
            const A = new Float64Array(m * m);
            const b = new Float64Array(m);
            
            // We can compute sums of powers of x directly
            // Sum(x^k) needed for k=0 to 2*degree
            const xPowers = new Float64Array(2 * degree + 1);
            
            for (let i = 0; i < n; i++) {
                const x = dataPoints[i].x;
                let pow = 1;
                for (let k = 0; k <= 2 * degree; k++) {
                    xPowers[k] += pow;
                    pow *= x;
                }
            }
            
            // Fill A
            for (let r = 0; r < m; r++) {
                for (let c = 0; c < m; c++) {
                    A[r * m + c] = xPowers[r + c];
                }
            }
            
            // Fill b: sum(y * x^r)
            for (let i = 0; i < n; i++) {
                const x = dataPoints[i].x;
                const y = dataPoints[i].y;
                let pow = 1;
                for (let r = 0; r < m; r++) {
                    b[r] += y * pow;
                    pow *= x;
                }
            }
            
            // 2. Solve Ax = b using Gaussian Elimination
            const coeffs = solveLinear(A, b, m);
            
            // 3. Calculate R^2
            let ssRes = 0;
            let ssTot = 0;
            let meanY = 0;
            for(let p of dataPoints) meanY += p.y;
            meanY /= n;
            
            for(let p of dataPoints) {
                let pred = 0;
                for(let j=0; j<m; j++) pred += coeffs[j] * Math.pow(p.x, j);
                ssRes += (p.y - pred) ** 2;
                ssTot += (p.y - meanY) ** 2;
            }
            const r2 = 1 - (ssRes / ssTot);

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    coeffs,
                    r2,
                    duration: (end - start).toFixed(2)
                }
            });
            
        } catch (err) {
            self.postMessage({ type: 'error' });
        }
    }
};

function solveLinear(A, b, n) {
    // Gaussian elimination with partial pivoting
    // Clone to avoid messing up if reused (though here we don't)
    const M = new Float64Array(A);
    const x = new Float64Array(b);
    
    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(M[k*n + i]) > Math.abs(M[maxRow*n + i])) {
                maxRow = k;
            }
        }
        
        // Swap rows in M and x
        for (let k = i; k < n; k++) {
            const tmp = M[i*n + k]; M[i*n + k] = M[maxRow*n + k]; M[maxRow*n + k] = tmp;
        }
        const tmpX = x[i]; x[i] = x[maxRow]; x[maxRow] = tmpX;
        
        // Normalize pivot row
        // Only eliminate below
        for (let k = i + 1; k < n; k++) {
            const c = -M[k*n + i] / M[i*n + i];
            for (let j = i; j < n; j++) {
                if (i === j) M[k*n + j] = 0;
                else M[k*n + j] += c * M[i*n + j];
            }
            x[k] += c * x[i];
        }
    }
    
    // Back substitution
    const result = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += M[i*n + j] * result[j];
        }
        result[i] = (x[i] - sum) / M[i*n + i];
    }
    
    return result;
}
