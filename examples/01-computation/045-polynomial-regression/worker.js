/**
 * Web Worker: Polynomial Regression Calculator
 *
 * Fits polynomial curves of degree N using
 * matrix-based least squares method.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'fit':
                result = fitPolynomial(data.x, data.y, data.degree);
                break;
            case 'predict':
                result = predictValues(data.x, data.y, data.degree, data.predictX);
                break;
            case 'compare':
                result = compareDegrees(data.x, data.y, data.maxDegree);
                break;
            case 'generate':
                result = generateAndFit(e.data.count, e.data.coefficients, e.data.noise);
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
 * Fit polynomial regression using normal equations
 * (X'X)β = X'y
 */
function fitPolynomial(x, y, degree) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < degree + 1) throw new Error(`Need at least ${degree + 1} points for degree ${degree}`);
    if (degree < 1 || degree > 10) throw new Error('Degree must be between 1 and 10');

    self.postMessage({ type: 'progress', percentage: 10 });

    // Build Vandermonde matrix X
    const X = buildVandermonde(x, degree);

    self.postMessage({ type: 'progress', percentage: 30 });

    // Compute X'X (normal matrix)
    const XtX = multiplyTranspose(X);

    self.postMessage({ type: 'progress', percentage: 50 });

    // Compute X'y
    const Xty = multiplyVectorTranspose(X, y);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Solve system using Gaussian elimination
    const coefficients = solveSystem(XtX, Xty);

    self.postMessage({ type: 'progress', percentage: 70 });

    // Calculate predictions and residuals
    const predictions = [];
    let SSR = 0, SST = 0;
    let sumY = 0;

    for (let i = 0; i < n; i++) {
        sumY += y[i];
    }
    const meanY = sumY / n;

    for (let i = 0; i < n; i++) {
        let predicted = 0;
        for (let j = 0; j <= degree; j++) {
            predicted += coefficients[j] * Math.pow(x[i], j);
        }
        predictions.push(predicted);

        const residual = y[i] - predicted;
        SSR += residual * residual;
        SST += (y[i] - meanY) * (y[i] - meanY);

        if (i % 5000 === 0) {
            self.postMessage({ type: 'progress', percentage: 70 + Math.floor((i / n) * 25) });
        }
    }

    const rSquared = SST !== 0 ? 1 - SSR / SST : 0;
    const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - degree - 1);
    const MSE = SSR / (n - degree - 1);
    const RMSE = Math.sqrt(MSE);

    // AIC and BIC for model comparison
    const k = degree + 1; // number of parameters
    const AIC = n * Math.log(SSR / n) + 2 * k;
    const BIC = n * Math.log(SSR / n) + k * Math.log(n);

    return {
        coefficients,
        degree,
        rSquared,
        adjRSquared,
        RMSE,
        MSE,
        AIC,
        BIC,
        n,
        equation: formatEquation(coefficients),
        predictions: predictions.slice(0, 20),
        interpretation: interpretFit(rSquared, degree)
    };
}

/**
 * Build Vandermonde matrix for polynomial fitting
 */
function buildVandermonde(x, degree) {
    const n = x.length;
    const X = [];

    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j <= degree; j++) {
            row.push(Math.pow(x[i], j));
        }
        X.push(row);
    }

    return X;
}

/**
 * Multiply X transpose by X
 */
function multiplyTranspose(X) {
    const n = X.length;
    const m = X[0].length;
    const result = [];

    for (let i = 0; i < m; i++) {
        result[i] = [];
        for (let j = 0; j < m; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += X[k][i] * X[k][j];
            }
            result[i][j] = sum;
        }
    }

    return result;
}

/**
 * Multiply X transpose by vector y
 */
function multiplyVectorTranspose(X, y) {
    const n = X.length;
    const m = X[0].length;
    const result = [];

    for (let i = 0; i < m; i++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
            sum += X[k][i] * y[k];
        }
        result[i] = sum;
    }

    return result;
}

/**
 * Solve linear system using Gaussian elimination with partial pivoting
 */
function solveSystem(A, b) {
    const n = A.length;

    // Create augmented matrix
    const aug = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
                maxRow = k;
            }
        }

        // Swap rows
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

        if (Math.abs(aug[i][i]) < 1e-10) {
            throw new Error('Matrix is singular or nearly singular');
        }

        // Eliminate column
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
 * Predict values for new X
 */
function predictValues(x, y, degree, predictX) {
    const model = fitPolynomial(x, y, degree);

    const predictions = predictX.map(xVal => {
        let yPred = 0;
        for (let j = 0; j <= degree; j++) {
            yPred += model.coefficients[j] * Math.pow(xVal, j);
        }
        return { x: xVal, predicted: yPred };
    });

    return {
        model,
        predictions
    };
}

/**
 * Compare different polynomial degrees
 */
function compareDegrees(x, y, maxDegree) {
    const results = [];

    for (let d = 1; d <= maxDegree; d++) {
        try {
            const model = fitPolynomial(x, y, d);
            results.push({
                degree: d,
                rSquared: model.rSquared,
                adjRSquared: model.adjRSquared,
                RMSE: model.RMSE,
                AIC: model.AIC,
                BIC: model.BIC
            });
        } catch (e) {
            // Skip if not enough points
        }

        self.postMessage({ type: 'progress', percentage: Math.floor((d / maxDegree) * 90) });
    }

    // Find best model by adjusted R² and AIC
    const bestAdjR2 = results.reduce((best, r) =>
        r.adjRSquared > best.adjRSquared ? r : best, results[0]);
    const bestAIC = results.reduce((best, r) =>
        r.AIC < best.AIC ? r : best, results[0]);

    return {
        comparisons: results,
        bestByAdjR2: bestAdjR2.degree,
        bestByAIC: bestAIC.degree,
        recommendation: bestAIC.degree,
        n: x.length
    };
}

/**
 * Generate polynomial data and fit
 */
function generateAndFit(count, trueCoefficients, noiseLevel) {
    const x = [];
    const y = [];
    const degree = trueCoefficients.length - 1;

    for (let i = 0; i < count; i++) {
        const xVal = (i / count) * 10 - 5; // Range -5 to 5
        let yVal = 0;

        for (let j = 0; j < trueCoefficients.length; j++) {
            yVal += trueCoefficients[j] * Math.pow(xVal, j);
        }

        yVal += (Math.random() - 0.5) * 2 * noiseLevel;

        x.push(xVal);
        y.push(yVal);

        if (i % 5000 === 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / count) * 30) });
        }
    }

    const model = fitPolynomial(x, y, degree);

    // Calculate coefficient recovery
    const coeffErrors = model.coefficients.map((c, i) =>
        Math.abs(c - trueCoefficients[i])
    );

    return {
        ...model,
        trueCoefficients,
        noiseLevel,
        coefficientErrors: coeffErrors,
        generated: count,
        sampleX: x.filter((_, i) => i % Math.floor(count / 10) === 0).slice(0, 10).map(v => v.toFixed(2)),
        sampleY: y.filter((_, i) => i % Math.floor(count / 10) === 0).slice(0, 10).map(v => v.toFixed(2))
    };
}

/**
 * Format polynomial equation string
 */
function formatEquation(coefficients) {
    const terms = [];

    for (let i = coefficients.length - 1; i >= 0; i--) {
        const c = coefficients[i];
        if (Math.abs(c) < 1e-10) continue;

        let term = '';
        const absC = Math.abs(c);
        const sign = c >= 0 ? '+' : '-';

        if (i === 0) {
            term = absC.toFixed(4);
        } else if (i === 1) {
            term = absC === 1 ? 'x' : `${absC.toFixed(4)}x`;
        } else {
            term = absC === 1 ? `x^${i}` : `${absC.toFixed(4)}x^${i}`;
        }

        if (terms.length === 0) {
            terms.push(c < 0 ? `-${term}` : term);
        } else {
            terms.push(`${sign} ${term}`);
        }
    }

    return `y = ${terms.join(' ') || '0'}`;
}

/**
 * Interpret model fit
 */
function interpretFit(rSquared, degree) {
    let fitQuality;
    if (rSquared >= 0.95) fitQuality = 'Excellent';
    else if (rSquared >= 0.8) fitQuality = 'Good';
    else if (rSquared >= 0.6) fitQuality = 'Moderate';
    else if (rSquared >= 0.4) fitQuality = 'Weak';
    else fitQuality = 'Poor';

    const warning = degree >= 5 ? ' (Warning: high degree may cause overfitting)' : '';

    return `${fitQuality} fit with degree-${degree} polynomial.${warning}`;
}
