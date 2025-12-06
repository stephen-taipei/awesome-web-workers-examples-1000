// Convex Optimization - Interior Point (Barrier) Method Web Worker

self.onmessage = function(e) {
    const { problem, mu, tolerance, maxOuter, maxInner } = e.data;
    solveBarrierMethod(problem, mu, tolerance, maxOuter, maxInner);
};

function solveBarrierMethod(problem, mu, tolerance, maxOuter, maxInner) {
    const { objective, constraints, initial } = problem;
    const n = initial.length;
    const m = constraints.length;
    const startTime = performance.now();

    const history = [];
    let x = initial.slice();
    let t = 1.0; // Initial barrier parameter
    let outerIter = 0;
    let totalNewton = 0;

    const path = [x.slice()];
    let converged = false;

    // Phase I: Find strictly feasible starting point if needed
    if (!isStrictlyFeasible(x, constraints)) {
        x = findStrictlyFeasible(constraints, n);
        if (!x) {
            self.postMessage({
                type: 'result',
                status: 'infeasible',
                solution: null,
                optimalValue: null,
                outerIterations: 0,
                newtonSteps: 0,
                finalT: t,
                dualityGap: null,
                history: [],
                problem,
                path: [],
                executionTime: performance.now() - startTime
            });
            return;
        }
        path.push(x.slice());
    }

    // Main barrier method loop
    for (let outer = 0; outer < maxOuter; outer++) {
        outerIter = outer + 1;

        // Centering step: minimize t*f(x) + barrier using Newton's method
        let newtonIter = 0;
        for (let inner = 0; inner < maxInner; inner++) {
            newtonIter++;
            totalNewton++;

            // Compute gradient and Hessian of barrier function
            const { grad, hess } = computeBarrierDerivatives(x, objective, constraints, t);

            // Newton decrement
            const delta = solveLinearSystem(hess, grad.map(g => -g));
            const lambdaSq = dot(grad, delta.map(d => -d)); // Newton decrement squared

            // Check convergence of centering
            if (lambdaSq / 2 < 1e-8) {
                break;
            }

            // Backtracking line search
            const alpha = backtrackingLineSearch(x, delta, objective, constraints, t, 0.01, 0.5);

            // Update x
            for (let i = 0; i < n; i++) {
                x[i] += alpha * delta[i];
            }

            path.push(x.slice());
        }

        // Record iteration
        const objVal = evaluateObjective(objective, x);
        const dualityGap = m / t;

        history.push({
            outer: outerIter,
            t: t,
            objective: objVal,
            dualityGap: dualityGap,
            newtonSteps: newtonIter,
            x: x.slice()
        });

        // Progress report
        self.postMessage({
            type: 'progress',
            iteration: outerIter,
            objective: objVal,
            dualityGap: dualityGap,
            percent: Math.min(100, Math.round(Math.log(t) / Math.log(t * Math.pow(mu, maxOuter)) * 100))
        });

        // Check stopping criterion
        if (dualityGap < tolerance) {
            converged = true;
            break;
        }

        // Increase barrier parameter
        t *= mu;
    }

    const finalObjVal = evaluateObjective(objective, x);
    const finalDualityGap = m / t;

    self.postMessage({
        type: 'result',
        status: converged ? 'optimal' : 'max_iterations',
        solution: x,
        optimalValue: finalObjVal,
        outerIterations: outerIter,
        newtonSteps: totalNewton,
        finalT: t,
        dualityGap: finalDualityGap,
        history,
        problem,
        path,
        executionTime: performance.now() - startTime
    });
}

function isStrictlyFeasible(x, constraints) {
    for (const c of constraints) {
        if (evaluateConstraint(c, x) >= -1e-6) {
            return false;
        }
    }
    return true;
}

function findStrictlyFeasible(constraints, n) {
    // Simple heuristic to find strictly feasible point
    // Start from origin and move away from constraint boundaries
    let x = new Array(n).fill(0.5);

    for (let iter = 0; iter < 100; iter++) {
        let feasible = true;
        let minSlack = Infinity;

        for (const c of constraints) {
            const val = evaluateConstraint(c, x);
            if (val >= -1e-6) {
                feasible = false;
                // Move in negative gradient direction of constraint
                const grad = constraintGradient(c, x);
                const gradNorm = Math.sqrt(dot(grad, grad));
                if (gradNorm > 1e-10) {
                    for (let i = 0; i < n; i++) {
                        x[i] -= 0.5 * grad[i] / gradNorm;
                    }
                }
            }
            minSlack = Math.min(minSlack, -val);
        }

        if (feasible && minSlack > 1e-6) {
            return x;
        }
    }

    // Try random points
    for (let trial = 0; trial < 50; trial++) {
        x = new Array(n).fill(0).map(() => Math.random() * 2);
        if (isStrictlyFeasible(x, constraints)) {
            return x;
        }
    }

    return null;
}

function computeBarrierDerivatives(x, objective, constraints, t) {
    const n = x.length;

    // Gradient of t*f(x)
    const objGrad = objectiveGradient(objective, x);
    const grad = objGrad.map(g => t * g);

    // Hessian of t*f(x)
    const objHess = objectiveHessian(objective, x);
    const hess = objHess.map(row => row.map(h => t * h));

    // Add barrier contributions: -sum(log(-g_i(x)))
    for (const c of constraints) {
        const gi = evaluateConstraint(c, x);
        const gradGi = constraintGradient(c, x);
        const hessGi = constraintHessian(c, x);

        // Gradient contribution: (1/g_i) * grad_g_i
        for (let i = 0; i < n; i++) {
            grad[i] -= gradGi[i] / gi;
        }

        // Hessian contribution: (1/g_i^2) * grad_g_i * grad_g_i^T - (1/g_i) * hess_g_i
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                hess[i][j] += (gradGi[i] * gradGi[j]) / (gi * gi);
                hess[i][j] -= hessGi[i][j] / gi;
            }
        }
    }

    return { grad, hess };
}

function backtrackingLineSearch(x, delta, objective, constraints, t, alpha0, beta) {
    const n = x.length;
    let alpha = 1.0;

    // First, ensure we stay strictly feasible
    for (let iter = 0; iter < 50; iter++) {
        const xNew = x.map((xi, i) => xi + alpha * delta[i]);
        if (isStrictlyFeasible(xNew, constraints)) {
            break;
        }
        alpha *= beta;
    }

    // Then do standard backtracking on barrier objective
    const currentVal = barrierObjective(x, objective, constraints, t);
    const { grad } = computeBarrierDerivatives(x, objective, constraints, t);
    const slope = dot(grad, delta);

    for (let iter = 0; iter < 50; iter++) {
        const xNew = x.map((xi, i) => xi + alpha * delta[i]);
        if (!isStrictlyFeasible(xNew, constraints)) {
            alpha *= beta;
            continue;
        }

        const newVal = barrierObjective(xNew, objective, constraints, t);
        if (newVal <= currentVal + alpha0 * alpha * slope) {
            break;
        }
        alpha *= beta;
    }

    return alpha;
}

function barrierObjective(x, objective, constraints, t) {
    let val = t * evaluateObjective(objective, x);

    for (const c of constraints) {
        const gi = evaluateConstraint(c, x);
        if (gi >= 0) return Infinity;
        val -= Math.log(-gi);
    }

    return val;
}

function evaluateObjective(obj, x) {
    // Quadratic: 0.5 * x^T Q x + c^T x
    if (obj.type === 'quadratic') {
        const { Q, c } = obj;
        let val = 0;
        for (let i = 0; i < x.length; i++) {
            val += c[i] * x[i];
            for (let j = 0; j < x.length; j++) {
                val += 0.5 * Q[i][j] * x[i] * x[j];
            }
        }
        return val;
    }

    // Log-sum-exp: log(sum(exp(a_i^T x + b_i)))
    if (obj.type === 'logsumexp') {
        const { A, b: bb } = obj;
        let maxVal = -Infinity;
        const terms = [];
        for (let i = 0; i < A.length; i++) {
            const term = dot(A[i], x) + bb[i];
            maxVal = Math.max(maxVal, term);
            terms.push(term);
        }
        let sum = 0;
        for (const term of terms) {
            sum += Math.exp(term - maxVal);
        }
        return maxVal + Math.log(sum);
    }

    // Default: simple quadratic (x - target)^2
    const target = obj.target || [0, 0];
    let val = 0;
    for (let i = 0; i < x.length; i++) {
        val += (x[i] - target[i]) * (x[i] - target[i]);
    }
    return val;
}

function objectiveGradient(obj, x) {
    const n = x.length;

    if (obj.type === 'quadratic') {
        const { Q, c } = obj;
        const grad = c.slice();
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                grad[i] += Q[i][j] * x[j];
            }
        }
        return grad;
    }

    if (obj.type === 'logsumexp') {
        const { A, b: bb } = obj;
        const terms = A.map((ai, i) => Math.exp(dot(ai, x) + bb[i]));
        const sumTerms = terms.reduce((s, t) => s + t, 0);
        const grad = new Array(n).fill(0);
        for (let i = 0; i < A.length; i++) {
            const weight = terms[i] / sumTerms;
            for (let j = 0; j < n; j++) {
                grad[j] += weight * A[i][j];
            }
        }
        return grad;
    }

    // Default quadratic
    const target = obj.target || [0, 0];
    return x.map((xi, i) => 2 * (xi - target[i]));
}

function objectiveHessian(obj, x) {
    const n = x.length;

    if (obj.type === 'quadratic') {
        return obj.Q;
    }

    if (obj.type === 'logsumexp') {
        const { A, b: bb } = obj;
        const terms = A.map((ai, i) => Math.exp(dot(ai, x) + bb[i]));
        const sumTerms = terms.reduce((s, t) => s + t, 0);

        const hess = new Array(n).fill(0).map(() => new Array(n).fill(0));
        const avgA = new Array(n).fill(0);

        for (let i = 0; i < A.length; i++) {
            const weight = terms[i] / sumTerms;
            for (let j = 0; j < n; j++) {
                avgA[j] += weight * A[i][j];
            }
        }

        for (let i = 0; i < A.length; i++) {
            const weight = terms[i] / sumTerms;
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < n; k++) {
                    hess[j][k] += weight * A[i][j] * A[i][k];
                }
            }
        }

        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                hess[j][k] -= avgA[j] * avgA[k];
            }
        }

        return hess;
    }

    // Default: 2*I
    return new Array(n).fill(0).map((_, i) =>
        new Array(n).fill(0).map((_, j) => i === j ? 2 : 0)
    );
}

function evaluateConstraint(c, x) {
    // Linear: a^T x - b <= 0
    return dot(c.a, x) - c.b;
}

function constraintGradient(c, x) {
    return c.a.slice();
}

function constraintHessian(c, x) {
    const n = x.length;
    return new Array(n).fill(0).map(() => new Array(n).fill(0));
}

function solveLinearSystem(A, b) {
    const n = A.length;

    // Create augmented matrix
    const aug = [];
    for (let i = 0; i < n; i++) {
        aug.push([...A[i], b[i]]);
    }

    // Gaussian elimination with partial pivoting
    for (let col = 0; col < n; col++) {
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                maxRow = row;
            }
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        if (Math.abs(aug[col][col]) < 1e-12) {
            continue;
        }

        for (let row = col + 1; row < n; row++) {
            const factor = aug[row][col] / aug[col][col];
            for (let j = col; j <= n; j++) {
                aug[row][j] -= factor * aug[col][j];
            }
        }
    }

    // Back substitution
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

function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}
