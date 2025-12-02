/**
 * Web Worker: Multiple Regression Calculator
 *
 * Performs multiple linear regression with
 * multiple independent variables using matrix operations.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'fit':
                result = fitMultipleRegression(data.X, data.y);
                break;
            case 'predict':
                result = predictValues(data.X, data.y, data.newX);
                break;
            case 'stepwise':
                result = stepwiseSelection(data.X, data.y, data.method);
                break;
            case 'generate':
                result = generateAndFit(e.data.n, e.data.numVars, e.data.trueCoeffs, e.data.noise);
                break;
            default:
                throw new Error('Unknown calculation type');
        }

        self.postMessage({
            type: 'result',
            calculationType: type,
            result,
            executionTime: (performance.now() - startTime).toFixed(2)
        });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Fit multiple regression using OLS
 * y = β₀ + β₁x₁ + β₂x₂ + ... + βₚxₚ
 */
function fitMultipleRegression(X, y) {
    const n = y.length;
    const p = X[0].length;

    if (X.length !== n) throw new Error('X and y dimensions mismatch');
    if (n < p + 1) throw new Error(`Need at least ${p + 1} observations for ${p} variables`);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Add intercept column (column of 1s)
    const Xaug = X.map(row => [1, ...row]);
    const numParams = p + 1;

    self.postMessage({ type: 'progress', percentage: 20 });

    // Compute X'X
    const XtX = matrixMultiplyTranspose(Xaug, Xaug);

    self.postMessage({ type: 'progress', percentage: 40 });

    // Compute X'y
    const Xty = vectorMultiplyTranspose(Xaug, y);

    self.postMessage({ type: 'progress', percentage: 50 });

    // Solve (X'X)β = X'y using Gaussian elimination
    const coefficients = solveSystem(XtX, Xty);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Calculate predictions and residuals
    let SSR = 0, SST = 0;
    const predictions = [];
    const residuals = [];

    const meanY = y.reduce((a, b) => a + b, 0) / n;

    for (let i = 0; i < n; i++) {
        let predicted = coefficients[0]; // Intercept
        for (let j = 0; j < p; j++) {
            predicted += coefficients[j + 1] * X[i][j];
        }
        predictions.push(predicted);

        const residual = y[i] - predicted;
        residuals.push(residual);
        SSR += residual * residual;
        SST += (y[i] - meanY) * (y[i] - meanY);

        if (i % 5000 === 0) {
            self.postMessage({ type: 'progress', percentage: 60 + Math.floor((i / n) * 30) });
        }
    }

    const SSE = SST - SSR;
    const rSquared = SST !== 0 ? 1 - SSR / SST : 0;
    const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - numParams);
    const MSE = SSR / (n - numParams);
    const RMSE = Math.sqrt(MSE);
    const MSR = SSE / (numParams - 1);
    const fStatistic = MSE !== 0 ? MSR / MSE : 0;

    // Standard errors of coefficients
    const XtXinv = invertMatrix(XtX);
    const seCoeffs = [];
    for (let i = 0; i < numParams; i++) {
        seCoeffs.push(Math.sqrt(MSE * XtXinv[i][i]));
    }

    // t-statistics
    const tStats = coefficients.map((c, i) => seCoeffs[i] !== 0 ? c / seCoeffs[i] : 0);

    // VIF (Variance Inflation Factor) for multicollinearity
    const vif = calculateVIF(X);

    // AIC and BIC
    const AIC = n * Math.log(SSR / n) + 2 * numParams;
    const BIC = n * Math.log(SSR / n) + numParams * Math.log(n);

    return {
        coefficients,
        intercept: coefficients[0],
        slopes: coefficients.slice(1),
        standardErrors: seCoeffs,
        tStatistics: tStats,
        vif,
        rSquared,
        adjRSquared,
        RMSE,
        MSE,
        fStatistic,
        AIC,
        BIC,
        n,
        numVariables: p,
        degreesOfFreedom: n - numParams,
        predictions: predictions.slice(0, 20),
        residuals: residuals.slice(0, 20),
        equation: formatEquation(coefficients, p),
        interpretation: interpretModel(rSquared, fStatistic, vif)
    };
}

/**
 * Matrix multiply X' * Y (transpose of X times Y)
 */
function matrixMultiplyTranspose(X, Y) {
    const m = X[0].length;
    const n = Y[0].length;
    const result = [];

    for (let i = 0; i < m; i++) {
        result[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < X.length; k++) {
                sum += X[k][i] * Y[k][j];
            }
            result[i][j] = sum;
        }
    }

    return result;
}

/**
 * Vector multiply X' * y
 */
function vectorMultiplyTranspose(X, y) {
    const m = X[0].length;
    const result = [];

    for (let i = 0; i < m; i++) {
        let sum = 0;
        for (let k = 0; k < X.length; k++) {
            sum += X[k][i] * y[k];
        }
        result[i] = sum;
    }

    return result;
}

/**
 * Solve linear system using Gaussian elimination
 */
function solveSystem(A, b) {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    // Forward elimination with partial pivoting
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
                maxRow = k;
            }
        }
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

        if (Math.abs(aug[i][i]) < 1e-12) {
            throw new Error('Matrix is singular - check for multicollinearity');
        }

        for (let k = i + 1; k < n; k++) {
            const factor = aug[k][i] / aug[i][i];
            for (let j = i; j <= n; j++) {
                aug[k][j] -= factor * aug[i][j];
            }
        }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = aug[i][n];
        for (let j = i + 1; j < n; j++) {
            x[i] -= aug[i][j] * x[j];
        }
        x[i] /= aug[i][i];
    }

    return x;
}

/**
 * Matrix inversion using Gauss-Jordan elimination
 */
function invertMatrix(A) {
    const n = A.length;
    const aug = A.map((row, i) => {
        const newRow = [...row];
        for (let j = 0; j < n; j++) {
            newRow.push(i === j ? 1 : 0);
        }
        return newRow;
    });

    // Forward elimination
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
                maxRow = k;
            }
        }
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

        if (Math.abs(aug[i][i]) < 1e-12) {
            return null; // Singular matrix
        }

        const pivot = aug[i][i];
        for (let j = 0; j < 2 * n; j++) {
            aug[i][j] /= pivot;
        }

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = aug[k][i];
                for (let j = 0; j < 2 * n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
    }

    return aug.map(row => row.slice(n));
}

/**
 * Calculate VIF for each variable
 */
function calculateVIF(X) {
    const p = X[0].length;
    const n = X.length;
    const vif = [];

    for (let j = 0; j < p; j++) {
        // Regress Xj on all other X variables
        const y = X.map(row => row[j]);
        const otherX = X.map(row => row.filter((_, i) => i !== j));

        if (otherX[0].length === 0) {
            vif.push(1);
            continue;
        }

        try {
            // Simple R² calculation
            const meanY = y.reduce((a, b) => a + b, 0) / n;
            let SST = 0;
            for (let i = 0; i < n; i++) {
                SST += (y[i] - meanY) * (y[i] - meanY);
            }

            // Fit regression
            const Xaug = otherX.map(row => [1, ...row]);
            const XtX = matrixMultiplyTranspose(Xaug, Xaug);
            const Xty = vectorMultiplyTranspose(Xaug, y);
            const coeffs = solveSystem(XtX, Xty);

            let SSR = 0;
            for (let i = 0; i < n; i++) {
                let pred = coeffs[0];
                for (let k = 0; k < otherX[i].length; k++) {
                    pred += coeffs[k + 1] * otherX[i][k];
                }
                SSR += (y[i] - pred) * (y[i] - pred);
            }

            const rSquared = 1 - SSR / SST;
            vif.push(1 / (1 - rSquared));
        } catch (e) {
            vif.push(Infinity);
        }
    }

    return vif;
}

/**
 * Predict values for new X
 */
function predictValues(X, y, newX) {
    const model = fitMultipleRegression(X, y);

    const predictions = newX.map(row => {
        let pred = model.intercept;
        for (let j = 0; j < row.length; j++) {
            pred += model.slopes[j] * row[j];
        }
        return { x: row, predicted: pred };
    });

    return { model, predictions };
}

/**
 * Stepwise variable selection
 */
function stepwiseSelection(X, y, method = 'forward') {
    const p = X[0].length;
    const n = y.length;

    if (method === 'forward') {
        return forwardSelection(X, y, p, n);
    } else {
        return backwardElimination(X, y, p, n);
    }
}

function forwardSelection(X, y, p, n) {
    const selectedVars = [];
    const results = [];
    let remainingVars = Array.from({ length: p }, (_, i) => i);

    while (remainingVars.length > 0) {
        let bestVar = -1;
        let bestAIC = Infinity;
        let bestModel = null;

        for (const varIdx of remainingVars) {
            const testVars = [...selectedVars, varIdx];
            const Xsubset = X.map(row => testVars.map(i => row[i]));

            try {
                const model = fitMultipleRegression(Xsubset, y);
                if (model.AIC < bestAIC) {
                    bestAIC = model.AIC;
                    bestVar = varIdx;
                    bestModel = model;
                }
            } catch (e) {
                // Skip if singular
            }
        }

        if (bestVar === -1) break;

        selectedVars.push(bestVar);
        remainingVars = remainingVars.filter(v => v !== bestVar);

        results.push({
            step: results.length + 1,
            addedVar: bestVar + 1,
            variables: [...selectedVars].map(v => v + 1),
            AIC: bestAIC,
            rSquared: bestModel.rSquared,
            adjRSquared: bestModel.adjRSquared
        });

        self.postMessage({
            type: 'progress',
            percentage: Math.floor((results.length / p) * 90)
        });
    }

    return {
        method: 'Forward Selection',
        steps: results,
        finalVariables: selectedVars.map(v => v + 1),
        bestModel: results[results.length - 1]
    };
}

function backwardElimination(X, y, p, n) {
    let currentVars = Array.from({ length: p }, (_, i) => i);
    const results = [];

    while (currentVars.length > 1) {
        let worstVar = -1;
        let bestAIC = Infinity;
        let bestModel = null;

        for (const varToRemove of currentVars) {
            const testVars = currentVars.filter(v => v !== varToRemove);
            const Xsubset = X.map(row => testVars.map(i => row[i]));

            try {
                const model = fitMultipleRegression(Xsubset, y);
                if (model.AIC < bestAIC) {
                    bestAIC = model.AIC;
                    worstVar = varToRemove;
                    bestModel = model;
                }
            } catch (e) {
                // Skip if singular
            }
        }

        // Check if removing helps
        const currentXsubset = X.map(row => currentVars.map(i => row[i]));
        const currentModel = fitMultipleRegression(currentXsubset, y);

        if (bestAIC >= currentModel.AIC) break;

        currentVars = currentVars.filter(v => v !== worstVar);

        results.push({
            step: results.length + 1,
            removedVar: worstVar + 1,
            variables: [...currentVars].map(v => v + 1),
            AIC: bestAIC,
            rSquared: bestModel.rSquared,
            adjRSquared: bestModel.adjRSquared
        });

        self.postMessage({
            type: 'progress',
            percentage: Math.floor((results.length / p) * 90)
        });
    }

    return {
        method: 'Backward Elimination',
        steps: results,
        finalVariables: currentVars.map(v => v + 1),
        bestModel: results.length > 0 ? results[results.length - 1] : null
    };
}

/**
 * Generate data and fit
 */
function generateAndFit(n, numVars, trueCoeffs, noise) {
    const X = [];
    const y = [];

    for (let i = 0; i < n; i++) {
        const row = [];
        let yVal = trueCoeffs[0]; // Intercept

        for (let j = 0; j < numVars; j++) {
            const xVal = Math.random() * 10;
            row.push(xVal);
            yVal += trueCoeffs[j + 1] * xVal;
        }

        yVal += (Math.random() - 0.5) * 2 * noise;
        X.push(row);
        y.push(yVal);

        if (i % 5000 === 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / n) * 30) });
        }
    }

    const model = fitMultipleRegression(X, y);

    return {
        ...model,
        trueCoefficients: trueCoeffs,
        noiseLevel: noise,
        generated: n,
        sampleX: X.slice(0, 5).map(row => row.map(v => v.toFixed(2))),
        sampleY: y.slice(0, 5).map(v => v.toFixed(2))
    };
}

/**
 * Format equation string
 */
function formatEquation(coefficients, numVars) {
    let eq = `y = ${coefficients[0].toFixed(4)}`;

    for (let i = 1; i <= numVars; i++) {
        const c = coefficients[i];
        const sign = c >= 0 ? '+' : '-';
        eq += ` ${sign} ${Math.abs(c).toFixed(4)}x${i}`;
    }

    return eq;
}

/**
 * Interpret model results
 */
function interpretModel(rSquared, fStatistic, vif) {
    let interpretation = '';

    if (rSquared >= 0.8) interpretation = 'Strong explanatory power. ';
    else if (rSquared >= 0.5) interpretation = 'Moderate explanatory power. ';
    else interpretation = 'Weak explanatory power. ';

    const maxVIF = Math.max(...vif);
    if (maxVIF > 10) {
        interpretation += 'Warning: High multicollinearity detected (VIF > 10).';
    } else if (maxVIF > 5) {
        interpretation += 'Moderate multicollinearity present (VIF > 5).';
    }

    return interpretation;
}
