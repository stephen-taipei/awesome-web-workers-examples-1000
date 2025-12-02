/**
 * Web Worker: Linear Regression Calculator
 *
 * Performs simple linear regression using the
 * ordinary least squares (OLS) method.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'fit':
                result = fitLinearRegression(data.x, data.y);
                break;
            case 'predict':
                result = predict(data.x, data.y, data.predictX);
                break;
            case 'residuals':
                result = calculateResiduals(data.x, data.y);
                break;
            case 'generate':
                result = generateAndFit(e.data.count, e.data.slope, e.data.intercept, e.data.noise);
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
 * Fit linear regression model using OLS
 */
function fitLinearRegression(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    // Calculate sums
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];

        if (i % 500000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / n) * 40) });
        }
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    // Calculate slope (b1) and intercept (b0)
    const numerator = sumXY - n * meanX * meanY;
    const denominator = sumX2 - n * meanX * meanX;

    if (denominator === 0) {
        throw new Error('Cannot fit regression: all X values are identical');
    }

    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;

    self.postMessage({ type: 'progress', percentage: 50 });

    // Calculate predictions and residuals
    let SSR = 0; // Sum of Squared Residuals
    let SST = 0; // Total Sum of Squares
    let SSE = 0; // Sum of Squares Explained

    for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * x[i];
        const residual = y[i] - predicted;
        SSR += residual * residual;
        SST += (y[i] - meanY) * (y[i] - meanY);
        SSE += (predicted - meanY) * (predicted - meanY);

        if (i % 500000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: 50 + Math.floor((i / n) * 40) });
        }
    }

    // R-squared (coefficient of determination)
    const rSquared = SST !== 0 ? 1 - SSR / SST : 0;
    const r = Math.sqrt(rSquared) * Math.sign(slope);

    // Standard errors
    const MSE = SSR / (n - 2); // Mean Squared Error
    const RMSE = Math.sqrt(MSE);

    // Standard error of slope
    const seSlope = Math.sqrt(MSE / (sumX2 - n * meanX * meanX));

    // Standard error of intercept
    const seIntercept = Math.sqrt(MSE * sumX2 / (n * (sumX2 - n * meanX * meanX)));

    // t-statistics
    const tSlope = slope / seSlope;
    const tIntercept = intercept / seIntercept;

    // F-statistic
    const fStatistic = (SSE / 1) / (SSR / (n - 2));

    // Adjusted R-squared
    const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - 2);

    // Standard deviation of X and Y
    const stdX = Math.sqrt((sumX2 - n * meanX * meanX) / n);
    const stdY = Math.sqrt((sumY2 - n * meanY * meanY) / n);

    return {
        slope,
        intercept,
        rSquared,
        r,
        adjRSquared,
        standardError: RMSE,
        seSlope,
        seIntercept,
        tSlope,
        tIntercept,
        fStatistic,
        meanX,
        meanY,
        stdX,
        stdY,
        n,
        degreesOfFreedom: n - 2,
        SSR,
        SST,
        SSE,
        equation: formatEquation(slope, intercept),
        interpretation: interpretRegression(rSquared, slope)
    };
}

/**
 * Predict Y values for given X values
 */
function predict(x, y, predictX) {
    const model = fitLinearRegression(x, y);

    const predictions = predictX.map(xVal => ({
        x: xVal,
        predicted: model.intercept + model.slope * xVal
    }));

    // Prediction intervals (95%)
    const tCritical = 1.96; // Approximate for large n
    const n = x.length;
    let sumX = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumX2 += x[i] * x[i];
    }
    const meanX = sumX / n;
    const SSx = sumX2 - n * meanX * meanX;

    predictions.forEach(pred => {
        const sePred = model.standardError * Math.sqrt(1 + 1/n + Math.pow(pred.x - meanX, 2) / SSx);
        pred.lower = pred.predicted - tCritical * sePred;
        pred.upper = pred.predicted + tCritical * sePred;
    });

    return {
        model,
        predictions
    };
}

/**
 * Calculate residuals and diagnostics
 */
function calculateResiduals(x, y) {
    const n = x.length;
    const model = fitLinearRegression(x, y);

    const residuals = [];
    let sumResiduals = 0;

    for (let i = 0; i < n; i++) {
        const predicted = model.intercept + model.slope * x[i];
        const residual = y[i] - predicted;
        const standardized = residual / model.standardError;

        residuals.push({
            index: i + 1,
            x: x[i],
            y: y[i],
            predicted,
            residual,
            standardized
        });

        sumResiduals += residual;
    }

    // Check for autocorrelation (Durbin-Watson statistic)
    let sumDiffSq = 0;
    let sumResSq = 0;
    for (let i = 0; i < residuals.length; i++) {
        sumResSq += residuals[i].residual * residuals[i].residual;
        if (i > 0) {
            const diff = residuals[i].residual - residuals[i-1].residual;
            sumDiffSq += diff * diff;
        }
    }
    const durbinWatson = sumResSq !== 0 ? sumDiffSq / sumResSq : 0;

    // Count outliers (|standardized residual| > 2)
    const outliers = residuals.filter(r => Math.abs(r.standardized) > 2);

    return {
        model,
        residuals: residuals.slice(0, 100), // Limit for display
        totalResiduals: n,
        meanResidual: sumResiduals / n,
        durbinWatson,
        outlierCount: outliers.length,
        outliers: outliers.slice(0, 10)
    };
}

/**
 * Generate data and fit regression
 */
function generateAndFit(count, trueSlope, trueIntercept, noiseLevel) {
    const x = [];
    const y = [];

    for (let i = 0; i < count; i++) {
        const xVal = Math.random() * 100;
        const noise = (Math.random() - 0.5) * 2 * noiseLevel;
        const yVal = trueIntercept + trueSlope * xVal + noise;

        x.push(xVal);
        y.push(yVal);

        if (i % 100000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / count) * 30) });
        }
    }

    const model = fitLinearRegression(x, y);

    // Calculate recovery accuracy
    const slopeError = Math.abs(model.slope - trueSlope);
    const interceptError = Math.abs(model.intercept - trueIntercept);

    return {
        ...model,
        trueSlope,
        trueIntercept,
        noiseLevel,
        slopeError,
        interceptError,
        slopeRecovery: (1 - slopeError / Math.abs(trueSlope)) * 100,
        generated: count,
        sampleX: x.slice(0, 10).map(v => v.toFixed(2)),
        sampleY: y.slice(0, 10).map(v => v.toFixed(2))
    };
}

/**
 * Format equation string
 */
function formatEquation(slope, intercept) {
    const slopeStr = slope.toFixed(4);
    const interceptStr = Math.abs(intercept).toFixed(4);
    const sign = intercept >= 0 ? '+' : '-';
    return `y = ${slopeStr}x ${sign} ${interceptStr}`;
}

/**
 * Interpret regression results
 */
function interpretRegression(rSquared, slope) {
    let fit;
    if (rSquared >= 0.9) fit = 'Excellent fit';
    else if (rSquared >= 0.7) fit = 'Good fit';
    else if (rSquared >= 0.5) fit = 'Moderate fit';
    else if (rSquared >= 0.3) fit = 'Weak fit';
    else fit = 'Poor fit';

    const direction = slope > 0 ? 'positive' : slope < 0 ? 'negative' : 'no';
    const pctExplained = (rSquared * 100).toFixed(1);

    return `${fit} (${direction} relationship). ${pctExplained}% of variance explained.`;
}
