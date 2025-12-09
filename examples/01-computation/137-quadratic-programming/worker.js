// Quadratic Programming - Active Set Method Web Worker

self.onmessage = function(e) {
    const { problem, maxIter, tolerance } = e.data;
    solveQP(problem, maxIter, tolerance);
};

function solveQP(problem, maxIter, tolerance) {
    const { Q, c, A, b } = problem;
    const n = c.length;
    const m = A.length;
    const startTime = performance.now();

    const history = [];
    let iterations = 0;

    // Initialize with feasible point (if possible)
    let x = findFeasiblePoint(A, b, n);
    if (!x) {
        self.postMessage({
            type: 'result',
            status: 'infeasible',
            solution: null,
            optimalValue: null,
            iterations: 0,
            activeSet: [],
            gradNorm: null,
            kktResidual: null,
            history: [],
            problem,
            path: [],
            executionTime: performance.now() - startTime
        });
        return;
    }

    // Active set (indices of constraints currently treated as equalities)
    let activeSet = [];

    // Find initial active constraints
    for (let i = 0; i < m; i++) {
        const slack = b[i] - dot(A[i], x);
        if (Math.abs(slack) < tolerance) {
            activeSet.push(i);
        }
    }

    const path = [x.slice()];
    let converged = false;

    for (let iter = 0; iter < maxIter; iter++) {
        iterations = iter + 1;

        // Compute gradient: g = Qx + c
        const g = add(matVec(Q, x), c);
        const gradNorm = norm(g);

        // Extract active constraint matrix
        const Aeq = activeSet.map(i => A[i]);

        // Solve equality-constrained QP subproblem
        // min 0.5 * p^T Q p + g^T p  s.t. Aeq * p = 0
        const { p, lambda } = solveEqualityQP(Q, g, Aeq, tolerance);

        const pNorm = norm(p);

        history.push({
            iteration: iter + 1,
            x: x.slice(),
            objective: objectiveValue(Q, c, x),
            gradNorm,
            activeSet: activeSet.slice(),
            stepNorm: pNorm
        });

        // Progress report
        if (iter % 5 === 0) {
            self.postMessage({
                type: 'progress',
                iteration: iter + 1,
                objective: objectiveValue(Q, c, x),
                percent: Math.min(100, Math.round((iter / maxIter) * 100))
            });
        }

        if (pNorm < tolerance) {
            // Check Lagrange multipliers for active constraints
            if (activeSet.length === 0 || lambda.every(l => l >= -tolerance)) {
                // KKT conditions satisfied
                converged = true;
                break;
            } else {
                // Remove constraint with most negative multiplier
                let minIdx = 0;
                for (let i = 1; i < lambda.length; i++) {
                    if (lambda[i] < lambda[minIdx]) minIdx = i;
                }
                activeSet.splice(minIdx, 1);
            }
        } else {
            // Line search with constraint checking
            let alpha = 1.0;

            // Check step length for inactive constraints
            for (let i = 0; i < m; i++) {
                if (!activeSet.includes(i)) {
                    const ap = dot(A[i], p);
                    if (ap > tolerance) {
                        const slack = b[i] - dot(A[i], x);
                        const maxAlpha = slack / ap;
                        if (maxAlpha < alpha) {
                            alpha = maxAlpha;
                        }
                    }
                }
            }

            // Update x
            for (let i = 0; i < n; i++) {
                x[i] += alpha * p[i];
            }

            path.push(x.slice());

            // Add newly active constraints
            for (let i = 0; i < m; i++) {
                if (!activeSet.includes(i)) {
                    const slack = b[i] - dot(A[i], x);
                    if (Math.abs(slack) < tolerance) {
                        activeSet.push(i);
                    }
                }
            }
        }
    }

    // Final gradient and KKT residual
    const finalGrad = add(matVec(Q, x), c);
    const gradNorm = norm(finalGrad);
    const kktResidual = computeKKTResidual(Q, c, A, b, x, activeSet, tolerance);

    self.postMessage({
        type: 'result',
        status: converged ? 'optimal' : 'max_iterations',
        solution: x,
        optimalValue: objectiveValue(Q, c, x),
        iterations,
        activeSet,
        gradNorm,
        kktResidual,
        history,
        problem,
        path,
        executionTime: performance.now() - startTime
    });
}

function findFeasiblePoint(A, b, n) {
    // Try origin first
    let x = new Array(n).fill(0);
    if (isFeasible(x, A, b)) return x;

    // Try simple heuristic: move in direction of violated constraints
    for (let iter = 0; iter < 100; iter++) {
        let feasible = true;
        for (let i = 0; i < A.length; i++) {
            const violation = dot(A[i], x) - b[i];
            if (violation > 1e-6) {
                feasible = false;
                // Move away from violated constraint
                const aNorm = norm(A[i]);
                if (aNorm > 1e-10) {
                    for (let j = 0; j < n; j++) {
                        x[j] -= (violation / (aNorm * aNorm)) * A[i][j] * 1.1;
                    }
                }
            }
        }
        if (feasible) return x;
    }

    // Try a few random points
    for (let trial = 0; trial < 20; trial++) {
        x = new Array(n).fill(0).map(() => (Math.random() - 0.5) * 10);
        if (isFeasible(x, A, b)) return x;
    }

    return null;
}

function isFeasible(x, A, b, tol = 1e-6) {
    for (let i = 0; i < A.length; i++) {
        if (dot(A[i], x) > b[i] + tol) return false;
    }
    return true;
}

function solveEqualityQP(Q, g, Aeq, tolerance) {
    const n = Q.length;
    const m = Aeq.length;

    if (m === 0) {
        // Unconstrained: solve Qp = -g
        const p = solveLinearSystem(Q, g.map(v => -v));
        return { p, lambda: [] };
    }

    // Build KKT system:
    // [Q  A^T] [p]   [-g]
    // [A  0  ] [λ] = [0 ]

    const size = n + m;
    const K = [];

    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(Q[i][j]);
        for (let j = 0; j < m; j++) row.push(Aeq[j][i]);
        K.push(row);
    }

    for (let i = 0; i < m; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(Aeq[i][j]);
        for (let j = 0; j < m; j++) row.push(0);
        K.push(row);
    }

    const rhs = [];
    for (let i = 0; i < n; i++) rhs.push(-g[i]);
    for (let i = 0; i < m; i++) rhs.push(0);

    const solution = solveLinearSystem(K, rhs);

    const p = solution.slice(0, n);
    const lambda = solution.slice(n);

    return { p, lambda };
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
        // Find pivot
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                maxRow = row;
            }
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        if (Math.abs(aug[col][col]) < 1e-12) {
            // Singular or nearly singular
            continue;
        }

        // Eliminate
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

function computeKKTResidual(Q, c, A, b, x, activeSet, tolerance) {
    const n = x.length;

    // Gradient of Lagrangian
    const grad = add(matVec(Q, x), c);

    // Add contribution from active constraints
    // This is a simplified KKT residual computation
    let residual = norm(grad);

    // Check constraint violations
    for (let i = 0; i < A.length; i++) {
        const violation = Math.max(0, dot(A[i], x) - b[i]);
        residual += violation;
    }

    return residual;
}

function objectiveValue(Q, c, x) {
    // 0.5 * x^T Q x + c^T x
    let quadTerm = 0;
    for (let i = 0; i < x.length; i++) {
        for (let j = 0; j < x.length; j++) {
            quadTerm += x[i] * Q[i][j] * x[j];
        }
    }
    return 0.5 * quadTerm + dot(c, x);
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

function add(a, b) {
    return a.map((v, i) => v + b[i]);
}

function norm(v) {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}
