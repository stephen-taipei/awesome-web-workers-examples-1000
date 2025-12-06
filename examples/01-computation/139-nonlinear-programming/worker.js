// Nonlinear Programming - Sequential Quadratic Programming Web Worker

self.onmessage = function(e) {
    const { problem, maxIter, tolerance, penaltyInit, hessianUpdate } = e.data;
    solveSQP(problem, maxIter, tolerance, penaltyInit, hessianUpdate);
};

function solveSQP(problem, maxIter, tolerance, penaltyInit, hessianUpdate) {
    const { objective, equalityConstraints, inequalityConstraints, initial, bounds } = problem;
    const n = initial.length;
    const startTime = performance.now();

    const history = [];
    let x = initial.slice();
    let mu = penaltyInit; // Penalty parameter

    // Initialize Hessian approximation to identity
    let B = [];
    for (let i = 0; i < n; i++) {
        B.push(new Array(n).fill(0));
        B[i][i] = 1.0;
    }

    const path = [x.slice()];
    let iterations = 0;
    let qpSolves = 0;
    let converged = false;

    // Lagrange multipliers
    let lambdaEq = new Array(equalityConstraints.length).fill(0);
    let lambdaIneq = new Array(inequalityConstraints.length).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
        iterations = iter + 1;

        // Evaluate objective and constraints
        const f = evaluateFunction(objective, x);
        const gradF = evaluateGradient(objective, x);

        const hVals = equalityConstraints.map(c => evaluateFunction(c, x));
        const hGrads = equalityConstraints.map(c => evaluateGradient(c, x));

        const gVals = inequalityConstraints.map(c => evaluateFunction(c, x));
        const gGrads = inequalityConstraints.map(c => evaluateGradient(c, x));

        // Compute constraint violation
        const eqViol = hVals.reduce((s, h) => s + Math.abs(h), 0);
        const ineqViol = gVals.reduce((s, g) => s + Math.max(0, g), 0);
        const totalViol = eqViol + ineqViol;

        // Compute KKT residual
        const kktResidual = computeKKTResidual(gradF, hGrads, gGrads, lambdaEq, lambdaIneq, gVals);

        history.push({
            iteration: iter + 1,
            x: x.slice(),
            objective: f,
            constraintViol: totalViol,
            kktResidual,
            stepSize: 0
        });

        // Progress report
        if (iter % 5 === 0) {
            self.postMessage({
                type: 'progress',
                iteration: iter + 1,
                objective: f,
                violation: totalViol,
                percent: Math.min(100, Math.round((iter / maxIter) * 100))
            });
        }

        // Check convergence
        if (kktResidual < tolerance && totalViol < tolerance) {
            converged = true;
            break;
        }

        // Solve QP subproblem
        const qpResult = solveQPSubproblem(gradF, B, hVals, hGrads, gVals, gGrads, bounds, x);
        qpSolves++;

        if (!qpResult.success) {
            // QP failed, try smaller step
            continue;
        }

        const d = qpResult.d;
        lambdaEq = qpResult.lambdaEq;
        lambdaIneq = qpResult.lambdaIneq;

        // Update penalty parameter
        const maxLambda = Math.max(
            ...lambdaEq.map(Math.abs),
            ...lambdaIneq.map(Math.abs),
            1
        );
        mu = Math.max(mu, maxLambda * 1.1);

        // Line search using merit function
        const alpha = lineSearch(x, d, objective, equalityConstraints, inequalityConstraints, mu, gradF);

        // Update x
        const xOld = x.slice();
        const gradOld = gradF.slice();

        for (let i = 0; i < n; i++) {
            x[i] += alpha * d[i];
        }

        // Apply bounds
        if (bounds) {
            for (let i = 0; i < n; i++) {
                if (bounds.lower && bounds.lower[i] !== undefined) {
                    x[i] = Math.max(x[i], bounds.lower[i]);
                }
                if (bounds.upper && bounds.upper[i] !== undefined) {
                    x[i] = Math.min(x[i], bounds.upper[i]);
                }
            }
        }

        path.push(x.slice());
        history[history.length - 1].stepSize = alpha;

        // Update Hessian approximation
        const gradNew = evaluateGradient(objective, x);
        const s = x.map((xi, i) => xi - xOld[i]);
        const y = gradNew.map((gi, i) => gi - gradOld[i]);

        // Add second-order correction from constraints
        for (let j = 0; j < equalityConstraints.length; j++) {
            const gradHOld = evaluateGradient(equalityConstraints[j], xOld);
            const gradHNew = evaluateGradient(equalityConstraints[j], x);
            for (let i = 0; i < n; i++) {
                y[i] += lambdaEq[j] * (gradHNew[i] - gradHOld[i]);
            }
        }

        B = updateHessian(B, s, y, hessianUpdate);
    }

    // Final evaluation
    const finalF = evaluateFunction(objective, x);
    const finalHVals = equalityConstraints.map(c => evaluateFunction(c, x));
    const finalGVals = inequalityConstraints.map(c => evaluateFunction(c, x));
    const finalViol = finalHVals.reduce((s, h) => s + Math.abs(h), 0) +
                      finalGVals.reduce((s, g) => s + Math.max(0, g), 0);

    const gradF = evaluateGradient(objective, x);
    const hGrads = equalityConstraints.map(c => evaluateGradient(c, x));
    const gGrads = inequalityConstraints.map(c => evaluateGradient(c, x));
    const finalKKT = computeKKTResidual(gradF, hGrads, gGrads, lambdaEq, lambdaIneq, finalGVals);

    self.postMessage({
        type: 'result',
        status: converged ? 'optimal' : 'max_iterations',
        solution: x,
        optimalValue: finalF,
        iterations,
        qpSolves,
        constraintViolation: finalViol,
        kktResidual: finalKKT,
        history,
        problem,
        path,
        executionTime: performance.now() - startTime
    });
}

function solveQPSubproblem(gradF, B, hVals, hGrads, gVals, gGrads, bounds, x) {
    const n = gradF.length;
    const p = hVals.length;
    const m = gVals.length;

    // Active set method for QP
    // min 0.5 d^T B d + gradF^T d
    // s.t. hGrads[i]^T d + hVals[i] = 0
    //      gGrads[j]^T d + gVals[j] <= 0

    // Start with simple approach: equality constraints only, ignore inactive inequalities
    let activeIneq = [];
    for (let j = 0; j < m; j++) {
        if (gVals[j] >= -1e-6) {
            activeIneq.push(j);
        }
    }

    // Build KKT system for active constraints
    const numActive = p + activeIneq.length;
    const size = n + numActive;

    if (numActive === 0) {
        // Unconstrained QP: solve Bd = -gradF
        const d = solveLinearSystem(B, gradF.map(g => -g));
        return { success: true, d, lambdaEq: [], lambdaIneq: new Array(m).fill(0) };
    }

    // KKT matrix: [B A^T; A 0]
    const K = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(B[i][j]);
        for (let j = 0; j < p; j++) row.push(hGrads[j][i]);
        for (let j = 0; j < activeIneq.length; j++) row.push(gGrads[activeIneq[j]][i]);
        K.push(row);
    }

    for (let i = 0; i < p; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(hGrads[i][j]);
        for (let j = 0; j < numActive; j++) row.push(0);
        K.push(row);
    }

    for (let i = 0; i < activeIneq.length; i++) {
        const idx = activeIneq[i];
        const row = [];
        for (let j = 0; j < n; j++) row.push(gGrads[idx][j]);
        for (let j = 0; j < numActive; j++) row.push(0);
        K.push(row);
    }

    // RHS: [-gradF; -hVals; -gVals_active]
    const rhs = [];
    for (let i = 0; i < n; i++) rhs.push(-gradF[i]);
    for (let i = 0; i < p; i++) rhs.push(-hVals[i]);
    for (let i = 0; i < activeIneq.length; i++) rhs.push(-gVals[activeIneq[i]]);

    const sol = solveLinearSystem(K, rhs);

    const d = sol.slice(0, n);
    const lambdaEqSol = sol.slice(n, n + p);
    const lambdaIneqActive = sol.slice(n + p);

    // Map back to full lambda
    const lambdaIneq = new Array(m).fill(0);
    for (let i = 0; i < activeIneq.length; i++) {
        lambdaIneq[activeIneq[i]] = lambdaIneqActive[i];
    }

    return { success: true, d, lambdaEq: lambdaEqSol, lambdaIneq };
}

function lineSearch(x, d, objective, eqCons, ineqCons, mu, gradF) {
    const n = x.length;
    const alpha0 = 0.0001;
    const beta = 0.5;

    // Current merit function value
    const merit0 = meritFunction(x, objective, eqCons, ineqCons, mu);

    // Directional derivative of merit function
    const dirDeriv = dot(gradF, d) -
        mu * eqCons.reduce((s, c) => s + Math.abs(evaluateFunction(c, x)), 0);

    let alpha = 1.0;
    const xNew = new Array(n);

    for (let iter = 0; iter < 30; iter++) {
        for (let i = 0; i < n; i++) {
            xNew[i] = x[i] + alpha * d[i];
        }

        const meritNew = meritFunction(xNew, objective, eqCons, ineqCons, mu);

        if (meritNew <= merit0 + alpha0 * alpha * Math.min(dirDeriv, 0)) {
            return alpha;
        }

        alpha *= beta;
    }

    return alpha;
}

function meritFunction(x, objective, eqCons, ineqCons, mu) {
    let val = evaluateFunction(objective, x);

    for (const c of eqCons) {
        val += mu * Math.abs(evaluateFunction(c, x));
    }

    for (const c of ineqCons) {
        val += mu * Math.max(0, evaluateFunction(c, x));
    }

    return val;
}

function computeKKTResidual(gradF, hGrads, gGrads, lambdaEq, lambdaIneq, gVals) {
    const n = gradF.length;

    // Lagrangian gradient
    const lagGrad = gradF.slice();
    for (let j = 0; j < hGrads.length; j++) {
        for (let i = 0; i < n; i++) {
            lagGrad[i] += lambdaEq[j] * hGrads[j][i];
        }
    }
    for (let j = 0; j < gGrads.length; j++) {
        for (let i = 0; i < n; i++) {
            lagGrad[i] += lambdaIneq[j] * gGrads[j][i];
        }
    }

    let residual = norm(lagGrad);

    // Complementarity
    for (let j = 0; j < gVals.length; j++) {
        residual += Math.abs(lambdaIneq[j] * gVals[j]);
    }

    return residual;
}

function updateHessian(B, s, y, method) {
    const n = B.length;
    const sTy = dot(s, y);
    const Bs = matVec(B, s);
    const sTBs = dot(s, Bs);

    if (method === 'bfgs') {
        if (sTy < 1e-10) return B; // Skip update

        const Bnew = [];
        for (let i = 0; i < n; i++) {
            Bnew.push([]);
            for (let j = 0; j < n; j++) {
                Bnew[i][j] = B[i][j] - (Bs[i] * Bs[j]) / sTBs + (y[i] * y[j]) / sTy;
            }
        }
        return Bnew;
    }

    if (method === 'dampedBfgs') {
        // Powell's damped BFGS
        let theta = 1.0;
        if (sTy < 0.2 * sTBs) {
            theta = 0.8 * sTBs / (sTBs - sTy);
        }

        const r = [];
        for (let i = 0; i < n; i++) {
            r[i] = theta * y[i] + (1 - theta) * Bs[i];
        }
        const sTr = dot(s, r);

        if (sTr < 1e-10) return B;

        const Bnew = [];
        for (let i = 0; i < n; i++) {
            Bnew.push([]);
            for (let j = 0; j < n; j++) {
                Bnew[i][j] = B[i][j] - (Bs[i] * Bs[j]) / sTBs + (r[i] * r[j]) / sTr;
            }
        }
        return Bnew;
    }

    if (method === 'sr1') {
        const yMinusBs = y.map((yi, i) => yi - Bs[i]);
        const denom = dot(yMinusBs, s);

        if (Math.abs(denom) < 1e-8 * norm(s) * norm(yMinusBs)) return B;

        const Bnew = [];
        for (let i = 0; i < n; i++) {
            Bnew.push([]);
            for (let j = 0; j < n; j++) {
                Bnew[i][j] = B[i][j] + (yMinusBs[i] * yMinusBs[j]) / denom;
            }
        }
        return Bnew;
    }

    return B;
}

function evaluateFunction(func, x) {
    return func.eval(x);
}

function evaluateGradient(func, x) {
    return func.grad(x);
}

function solveLinearSystem(A, b) {
    const n = A.length;
    const aug = [];
    for (let i = 0; i < n; i++) {
        aug.push([...A[i], b[i]]);
    }

    for (let col = 0; col < n; col++) {
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                maxRow = row;
            }
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        if (Math.abs(aug[col][col]) < 1e-12) continue;

        for (let row = col + 1; row < n; row++) {
            const factor = aug[row][col] / aug[col][col];
            for (let j = col; j <= n; j++) {
                aug[row][j] -= factor * aug[col][j];
            }
        }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        if (Math.abs(aug[i][i]) < 1e-12) {
            x[i] = 0;
        } else {
            let sum = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                sum -= aug[i][j] * x[j];
            }
            x[i] = sum / aug[i][i];
        }
    }

    return x;
}

function matVec(M, v) {
    const result = [];
    for (let i = 0; i < M.length; i++) {
        let sum = 0;
        for (let j = 0; j < v.length; j++) {
            sum += M[i][j] * v[j];
        }
        result.push(sum);
    }
    return result;
}

function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

function norm(v) {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}
