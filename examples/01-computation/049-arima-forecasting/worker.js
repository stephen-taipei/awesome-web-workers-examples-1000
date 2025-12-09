/**
 * Web Worker: ARIMA Forecasting
 * AutoRegressive Integrated Moving Average model implementation
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'ar':
                result = fitAR(data.values, data.p);
                break;
            case 'ma':
                result = fitMA(data.values, data.q);
                break;
            case 'arma':
                result = fitARMA(data.values, data.p, data.q);
                break;
            case 'arima':
                result = fitARIMA(data.values, data.p, data.d, data.q);
                break;
            case 'forecast':
                result = forecastARIMA(data.values, data.p, data.d, data.q, data.periods);
                break;
            case 'auto':
                result = autoARIMA(data.values, data.maxP, data.maxD, data.maxQ);
                break;
            default:
                throw new Error('Unknown calculation type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', calculationType: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Fit AR(p) model - AutoRegressive
 */
function fitAR(values, p) {
    const n = values.length;
    if (p >= n - 1) throw new Error('p must be less than n-1');

    self.postMessage({ type: 'progress', percentage: 10 });

    // Calculate mean
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const centered = values.map(v => v - mean);

    // Compute autocorrelations
    const acf = computeACF(centered, p + 1);

    self.postMessage({ type: 'progress', percentage: 30 });

    // Yule-Walker equations
    const coefficients = solveYuleWalker(acf, p);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Compute fitted values
    const fitted = [];
    const residuals = [];

    for (let i = 0; i < n; i++) {
        if (i < p) {
            fitted.push(mean);
        } else {
            let pred = mean;
            for (let j = 0; j < p; j++) {
                pred += coefficients[j] * (values[i - 1 - j] - mean);
            }
            fitted.push(pred);
        }
        residuals.push(values[i] - fitted[i]);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const metrics = calculateMetrics(values.slice(p), fitted.slice(p));
    const aic = computeAIC(residuals.slice(p), p + 1);

    return {
        model: `AR(${p})`,
        order: { p },
        coefficients,
        mean,
        fitted,
        residuals,
        acf: acf.slice(1),
        metrics,
        aic,
        interpretation: interpretCoefficients(coefficients, 'AR')
    };
}

/**
 * Fit MA(q) model - Moving Average
 */
function fitMA(values, q) {
    const n = values.length;
    if (q >= n / 2) throw new Error('q is too large for data size');

    self.postMessage({ type: 'progress', percentage: 10 });

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const centered = values.map(v => v - mean);

    // Estimate MA coefficients using innovations algorithm
    const coefficients = estimateMA(centered, q);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Compute fitted values
    const fitted = [];
    const residuals = [centered[0]];
    fitted.push(mean);

    for (let i = 1; i < n; i++) {
        let pred = 0;
        for (let j = 0; j < Math.min(q, i); j++) {
            pred += coefficients[j] * residuals[i - 1 - j];
        }
        fitted.push(mean + pred);
        residuals.push(centered[i] - pred);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const metrics = calculateMetrics(values.slice(q), fitted.slice(q));
    const aic = computeAIC(residuals.slice(q), q + 1);

    return {
        model: `MA(${q})`,
        order: { q },
        coefficients,
        mean,
        fitted,
        residuals,
        metrics,
        aic,
        interpretation: interpretCoefficients(coefficients, 'MA')
    };
}

/**
 * Fit ARMA(p,q) model
 */
function fitARMA(values, p, q) {
    const n = values.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const centered = values.map(v => v - mean);

    // Use iterative estimation
    const { arCoeffs, maCoeffs } = estimateARMA(centered, p, q);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Compute fitted values
    const fitted = [];
    const residuals = [];

    for (let i = 0; i < n; i++) {
        let pred = 0;

        // AR part
        for (let j = 0; j < Math.min(p, i); j++) {
            pred += arCoeffs[j] * centered[i - 1 - j];
        }

        // MA part
        for (let j = 0; j < Math.min(q, residuals.length); j++) {
            pred += maCoeffs[j] * residuals[residuals.length - 1 - j];
        }

        fitted.push(mean + pred);
        residuals.push(centered[i] - pred);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const startIdx = Math.max(p, q);
    const metrics = calculateMetrics(values.slice(startIdx), fitted.slice(startIdx));
    const aic = computeAIC(residuals.slice(startIdx), p + q + 1);

    return {
        model: `ARMA(${p},${q})`,
        order: { p, q },
        arCoefficients: arCoeffs,
        maCoefficients: maCoeffs,
        mean,
        fitted,
        residuals,
        metrics,
        aic
    };
}

/**
 * Fit ARIMA(p,d,q) model
 */
function fitARIMA(values, p, d, q) {
    self.postMessage({ type: 'progress', percentage: 10 });

    // Apply differencing
    let diffed = [...values];
    const diffHistory = [];

    for (let i = 0; i < d; i++) {
        diffHistory.push(diffed[0]);
        const newDiffed = [];
        for (let j = 1; j < diffed.length; j++) {
            newDiffed.push(diffed[j] - diffed[j - 1]);
        }
        diffed = newDiffed;
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Fit ARMA to differenced data
    let armaResult;
    if (p > 0 && q > 0) {
        armaResult = fitARMA(diffed, p, q);
    } else if (p > 0) {
        armaResult = fitAR(diffed, p);
    } else if (q > 0) {
        armaResult = fitMA(diffed, q);
    } else {
        // Just use mean
        const mean = diffed.reduce((a, b) => a + b, 0) / diffed.length;
        armaResult = {
            fitted: diffed.map(() => mean),
            residuals: diffed.map(v => v - mean),
            mean
        };
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Integrate fitted values back
    let integrated = [...armaResult.fitted];
    for (let i = d - 1; i >= 0; i--) {
        const newIntegrated = [diffHistory[i]];
        for (let j = 0; j < integrated.length; j++) {
            newIntegrated.push(newIntegrated[j] + integrated[j]);
        }
        integrated = newIntegrated;
    }

    // Align lengths
    while (integrated.length < values.length) {
        integrated.unshift(values[values.length - integrated.length - 1]);
    }
    integrated = integrated.slice(0, values.length);

    const residuals = values.map((v, i) => v - integrated[i]);

    self.postMessage({ type: 'progress', percentage: 100 });

    const startIdx = d + Math.max(p, q);
    const metrics = calculateMetrics(values.slice(startIdx), integrated.slice(startIdx));
    const aic = computeAIC(residuals.slice(startIdx), p + q + 1);

    return {
        model: `ARIMA(${p},${d},${q})`,
        order: { p, d, q },
        arCoefficients: armaResult.arCoefficients || armaResult.coefficients || [],
        maCoefficients: armaResult.maCoefficients || armaResult.coefficients || [],
        mean: armaResult.mean,
        fitted: integrated,
        residuals,
        diffHistory,
        metrics,
        aic,
        stationaryTest: testStationarity(diffed)
    };
}

/**
 * Forecast using ARIMA model
 */
function forecastARIMA(values, p, d, q, periods) {
    const arimaResult = fitARIMA(values, p, d, q);

    self.postMessage({ type: 'progress', percentage: 50 });

    // Generate forecasts on differenced scale
    let diffed = [...values];
    for (let i = 0; i < d; i++) {
        const newDiffed = [];
        for (let j = 1; j < diffed.length; j++) {
            newDiffed.push(diffed[j] - diffed[j - 1]);
        }
        diffed = newDiffed;
    }

    const forecasts = [];
    const extended = [...diffed];
    const residuals = [...arimaResult.residuals];

    const arCoeffs = arimaResult.arCoefficients || [];
    const maCoeffs = arimaResult.maCoefficients || [];
    const mean = arimaResult.mean || 0;

    for (let h = 0; h < periods; h++) {
        let forecast = mean;

        // AR part
        for (let j = 0; j < p; j++) {
            if (extended.length - 1 - j >= 0) {
                forecast += arCoeffs[j] * (extended[extended.length - 1 - j] - mean);
            }
        }

        // MA part (residuals go to 0 for future)
        for (let j = 0; j < q; j++) {
            if (residuals.length - 1 - j >= 0 && h === 0) {
                forecast += maCoeffs[j] * residuals[residuals.length - 1 - j];
            }
        }

        extended.push(forecast);
        forecasts.push(forecast);
    }

    // Integrate forecasts back
    let integratedForecasts = [...forecasts];
    for (let i = d - 1; i >= 0; i--) {
        const lastValue = i === d - 1 ? values[values.length - 1] :
            values[values.length - 1]; // Simplified
        const newIntegrated = [];
        let cumSum = lastValue;
        for (const f of integratedForecasts) {
            cumSum += f;
            newIntegrated.push(cumSum);
        }
        integratedForecasts = newIntegrated;
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Calculate confidence intervals (simplified: ±2*RMSE)
    const rmse = parseFloat(arimaResult.metrics.rmse);
    const forecastResults = integratedForecasts.map((f, i) => ({
        period: values.length + i + 1,
        forecast: f,
        lower95: f - 1.96 * rmse * Math.sqrt(i + 1),
        upper95: f + 1.96 * rmse * Math.sqrt(i + 1)
    }));

    return {
        model: arimaResult.model,
        order: arimaResult.order,
        fitted: arimaResult.fitted,
        forecasts: forecastResults,
        metrics: arimaResult.metrics,
        aic: arimaResult.aic
    };
}

/**
 * Auto ARIMA - find best parameters
 */
function autoARIMA(values, maxP, maxD, maxQ) {
    let bestAIC = Infinity;
    let bestOrder = { p: 0, d: 0, q: 0 };
    let bestResult = null;
    const results = [];

    let progress = 0;
    const total = (maxP + 1) * (maxD + 1) * (maxQ + 1);

    for (let d = 0; d <= maxD; d++) {
        for (let p = 0; p <= maxP; p++) {
            for (let q = 0; q <= maxQ; q++) {
                progress++;
                if (progress % 5 === 0) {
                    self.postMessage({ type: 'progress', percentage: Math.round((progress / total) * 100) });
                }

                try {
                    const result = fitARIMA(values, p, d, q);
                    const aic = parseFloat(result.aic);

                    results.push({
                        order: `(${p},${d},${q})`,
                        aic: aic.toFixed(2),
                        rmse: result.metrics.rmse
                    });

                    if (aic < bestAIC) {
                        bestAIC = aic;
                        bestOrder = { p, d, q };
                        bestResult = result;
                    }
                } catch (e) {
                    // Skip invalid combinations
                }
            }
        }
    }

    // Sort results by AIC
    results.sort((a, b) => parseFloat(a.aic) - parseFloat(b.aic));

    return {
        bestOrder,
        bestAIC: bestAIC.toFixed(2),
        bestResult,
        allResults: results.slice(0, 10) // Top 10
    };
}

/**
 * Compute autocorrelation function
 */
function computeACF(values, maxLag) {
    const n = values.length;
    const acf = [];

    // Variance (lag 0)
    let variance = 0;
    for (const v of values) {
        variance += v * v;
    }
    variance /= n;

    for (let lag = 0; lag <= maxLag; lag++) {
        let sum = 0;
        for (let i = lag; i < n; i++) {
            sum += values[i] * values[i - lag];
        }
        acf.push(sum / n / variance);
    }

    return acf;
}

/**
 * Solve Yule-Walker equations
 */
function solveYuleWalker(acf, p) {
    // Build Toeplitz matrix
    const R = [];
    for (let i = 0; i < p; i++) {
        R[i] = [];
        for (let j = 0; j < p; j++) {
            R[i][j] = acf[Math.abs(i - j)];
        }
    }

    // r vector
    const r = acf.slice(1, p + 1);

    // Solve R * phi = r using Gaussian elimination
    return solveLinearSystem(R, r);
}

/**
 * Solve linear system Ax = b
 */
function solveLinearSystem(A, b) {
    const n = b.length;
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
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

        if (Math.abs(aug[i][i]) < 1e-10) continue;

        for (let k = i + 1; k < n; k++) {
            const factor = aug[k][i] / aug[i][i];
            for (let j = i; j <= n; j++) {
                aug[k][j] -= factor * aug[i][j];
            }
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        if (Math.abs(aug[i][i]) < 1e-10) continue;
        x[i] = aug[i][n];
        for (let j = i + 1; j < n; j++) {
            x[i] -= aug[i][j] * x[j];
        }
        x[i] /= aug[i][i];
    }

    return x;
}

/**
 * Estimate MA coefficients using method of moments
 */
function estimateMA(values, q) {
    const acf = computeACF(values, q + 1);
    const coeffs = [];

    // Simple approximation using ACF
    for (let i = 0; i < q; i++) {
        coeffs.push(acf[i + 1] * 0.8); // Dampening factor
    }

    return coeffs;
}

/**
 * Estimate ARMA coefficients
 */
function estimateARMA(values, p, q) {
    // Use Hannan-Rissanen method (simplified)
    const arCoeffs = p > 0 ? fitAR(values, p + q).coefficients.slice(0, p) : [];
    const residuals = [];

    for (let i = 0; i < values.length; i++) {
        let pred = 0;
        for (let j = 0; j < Math.min(p, i); j++) {
            pred += arCoeffs[j] * values[i - 1 - j];
        }
        residuals.push(values[i] - pred);
    }

    const maCoeffs = q > 0 ? estimateMA(residuals, q) : [];

    return { arCoeffs, maCoeffs };
}

/**
 * Test stationarity using ADF-like statistic
 */
function testStationarity(values) {
    const n = values.length;
    if (n < 10) return { stationary: true, message: 'Insufficient data' };

    // Simple variance ratio test
    const firstHalf = values.slice(0, Math.floor(n / 2));
    const secondHalf = values.slice(Math.floor(n / 2));

    const var1 = variance(firstHalf);
    const var2 = variance(secondHalf);

    const ratio = var1 / var2;
    const stationary = ratio > 0.5 && ratio < 2;

    return {
        stationary,
        varianceRatio: ratio.toFixed(4),
        message: stationary ? 'Data appears stationary' : 'Data may be non-stationary'
    };
}

function variance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
}

/**
 * Compute AIC
 */
function computeAIC(residuals, k) {
    const n = residuals.length;
    const sse = residuals.reduce((sum, r) => sum + r * r, 0);
    const sigma2 = sse / n;

    return n * Math.log(sigma2) + 2 * k;
}

/**
 * Calculate accuracy metrics
 */
function calculateMetrics(actual, fitted) {
    let sumSquaredError = 0;
    let sumAbsError = 0;
    let sumAbsPercentError = 0;
    let count = 0;

    for (let i = 0; i < actual.length; i++) {
        const error = actual[i] - fitted[i];
        sumSquaredError += error * error;
        sumAbsError += Math.abs(error);
        if (actual[i] !== 0) {
            sumAbsPercentError += Math.abs(error / actual[i]);
        }
        count++;
    }

    const mse = sumSquaredError / count;
    const rmse = Math.sqrt(mse);
    const mae = sumAbsError / count;
    const mape = (sumAbsPercentError / count) * 100;

    return {
        mse: mse.toFixed(4),
        rmse: rmse.toFixed(4),
        mae: mae.toFixed(4),
        mape: mape.toFixed(2) + '%'
    };
}

/**
 * Interpret AR/MA coefficients
 */
function interpretCoefficients(coeffs, type) {
    if (coeffs.length === 0) return 'No coefficients';

    const absSum = coeffs.reduce((sum, c) => sum + Math.abs(c), 0);
    const maxAbs = Math.max(...coeffs.map(Math.abs));

    if (type === 'AR') {
        if (absSum > 1) return 'Model may be unstable (coefficients sum > 1)';
        if (maxAbs > 0.9) return 'Strong persistence in the series';
        if (maxAbs < 0.3) return 'Weak autocorrelation';
        return 'Moderate autocorrelation';
    } else {
        if (maxAbs > 0.9) return 'Strong shock persistence';
        if (maxAbs < 0.3) return 'Weak shock effects';
        return 'Moderate shock persistence';
    }
}
