// Linear Programming - Simplex Method Web Worker

self.onmessage = function(e) {
    const { problem } = e.data;
    solveSimplex(problem);
};

function solveSimplex(problem) {
    const { c, A, b, maximize } = problem;
    const m = A.length;      // Number of constraints
    const n = c.length;      // Number of variables

    const startTime = performance.now();
    const history = [];

    // Convert to standard form by adding slack variables
    // Tableau: [A | I | b]
    //          [c | 0 | 0]

    // Create initial tableau
    const numVars = n + m; // Original + slack variables
    const tableau = [];

    // Constraint rows
    for (let i = 0; i < m; i++) {
        const row = [];
        // Original variables
        for (let j = 0; j < n; j++) {
            row.push(A[i][j]);
        }
        // Slack variables
        for (let j = 0; j < m; j++) {
            row.push(i === j ? 1 : 0);
        }
        // RHS
        row.push(b[i]);
        tableau.push(row);
    }

    // Objective row (for maximization, negate coefficients)
    const objRow = [];
    for (let j = 0; j < n; j++) {
        objRow.push(maximize ? -c[j] : c[j]);
    }
    for (let j = 0; j < m; j++) {
        objRow.push(0);
    }
    objRow.push(0); // RHS of objective
    tableau.push(objRow);

    // Basic variables (initially slack variables)
    const basic = [];
    for (let i = 0; i < m; i++) {
        basic.push(n + i); // Slack variable indices
    }

    // Save initial tableau
    history.push({
        iteration: 0,
        tableau: copyTableau(tableau),
        basic: [...basic],
        entering: -1,
        leaving: -1
    });

    const maxIterations = 100;
    let iteration = 0;
    let status = 'optimal';

    while (iteration < maxIterations) {
        iteration++;

        // Find entering variable (most negative in objective row for max)
        let entering = -1;
        let minVal = -1e-10; // Tolerance

        for (let j = 0; j < numVars; j++) {
            if (tableau[m][j] < minVal) {
                minVal = tableau[m][j];
                entering = j;
            }
        }

        // If no entering variable, optimal solution found
        if (entering === -1) {
            status = 'optimal';
            break;
        }

        // Find leaving variable (minimum ratio test)
        let leaving = -1;
        let minRatio = Infinity;

        for (let i = 0; i < m; i++) {
            if (tableau[i][entering] > 1e-10) {
                const ratio = tableau[i][numVars] / tableau[i][entering];
                if (ratio >= 0 && ratio < minRatio) {
                    minRatio = ratio;
                    leaving = i;
                }
            }
        }

        // If no leaving variable, problem is unbounded
        if (leaving === -1) {
            status = 'unbounded';
            break;
        }

        // Pivot
        const pivotElement = tableau[leaving][entering];

        // Normalize pivot row
        for (let j = 0; j <= numVars; j++) {
            tableau[leaving][j] /= pivotElement;
        }

        // Eliminate other rows
        for (let i = 0; i <= m; i++) {
            if (i !== leaving) {
                const factor = tableau[i][entering];
                for (let j = 0; j <= numVars; j++) {
                    tableau[i][j] -= factor * tableau[leaving][j];
                }
            }
        }

        // Update basic variables
        basic[leaving] = entering;

        // Save iteration
        history.push({
            iteration,
            tableau: copyTableau(tableau),
            basic: [...basic],
            entering,
            leaving
        });

        // Progress update
        self.postMessage({
            type: 'progress',
            iteration,
            percent: Math.min(100, iteration * 10)
        });
    }

    if (iteration >= maxIterations) {
        status = 'max_iterations';
    }

    // Extract solution
    const solution = new Array(n).fill(0);
    for (let i = 0; i < m; i++) {
        if (basic[i] < n) {
            solution[basic[i]] = tableau[i][numVars];
        }
    }

    // Optimal value
    const optimalValue = maximize ? -tableau[m][numVars] : tableau[m][numVars];

    self.postMessage({
        type: 'result',
        status,
        solution,
        optimalValue,
        iterations: iteration,
        history,
        problem,
        executionTime: performance.now() - startTime
    });
}

function copyTableau(tableau) {
    return tableau.map(row => [...row]);
}
