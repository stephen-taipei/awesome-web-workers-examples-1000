/**
 * Web Worker: Exponential Smoothing Calculator
 * Implements Single, Double, and Triple (Holt-Winters) exponential smoothing
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'single':
                result = singleExponentialSmoothing(data.values, data.alpha);
                break;
            case 'double':
                result = doubleExponentialSmoothing(data.values, data.alpha, data.beta);
                break;
            case 'triple':
                result = tripleExponentialSmoothing(data.values, data.alpha, data.beta, data.gamma, data.seasonLength);
                break;
            case 'optimize':
                result = optimizeParameters(data.values, data.method, data.seasonLength);
                break;
            case 'forecast':
                result = forecastWithBestMethod(data.values, data.periods, data.seasonLength);
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
 * Single Exponential Smoothing (SES)
 * Best for data without trend or seasonality
 */
function singleExponentialSmoothing(values, alpha) {
    const n = values.length;
    const smoothed = [values[0]]; // Initialize with first value

    for (let i = 1; i < n; i++) {
        if (i % Math.floor(n / 10) === 0) {
            self.postMessage({ type: 'progress', percentage: Math.round((i / n) * 100) });
        }
        // S(t) = α * Y(t) + (1 - α) * S(t-1)
        smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }

    const metrics = calculateMetrics(values, smoothed);

    return {
        method: 'Single Exponential Smoothing (SES)',
        alpha,
        formula: 'S(t) = α × Y(t) + (1 - α) × S(t-1)',
        description: 'Level only, no trend or seasonality',
        smoothed,
        metrics,
        forecast: smoothed[n - 1] // Flat forecast
    };
}

/**
 * Double Exponential Smoothing (Holt's Method)
 * Best for data with trend but no seasonality
 */
function doubleExponentialSmoothing(values, alpha, beta) {
    const n = values.length;
    const level = [values[0]];
    const trend = [values[1] - values[0]]; // Initial trend
    const smoothed = [values[0]];

    for (let i = 1; i < n; i++) {
        if (i % Math.floor(n / 10) === 0) {
            self.postMessage({ type: 'progress', percentage: Math.round((i / n) * 100) });
        }

        // Level: L(t) = α * Y(t) + (1 - α) * (L(t-1) + T(t-1))
        const newLevel = alpha * values[i] + (1 - alpha) * (level[i - 1] + trend[i - 1]);
        level.push(newLevel);

        // Trend: T(t) = β * (L(t) - L(t-1)) + (1 - β) * T(t-1)
        const newTrend = beta * (newLevel - level[i - 1]) + (1 - beta) * trend[i - 1];
        trend.push(newTrend);

        // Fitted: F(t) = L(t-1) + T(t-1)
        smoothed.push(level[i - 1] + trend[i - 1]);
    }

    const metrics = calculateMetrics(values, smoothed);

    return {
        method: "Double Exponential Smoothing (Holt's Method)",
        alpha,
        beta,
        formula: 'L(t) = α×Y(t) + (1-α)×(L(t-1)+T(t-1)), T(t) = β×(L(t)-L(t-1)) + (1-β)×T(t-1)',
        description: 'Level and trend, no seasonality',
        smoothed,
        level,
        trend,
        metrics,
        finalLevel: level[n - 1],
        finalTrend: trend[n - 1]
    };
}

/**
 * Triple Exponential Smoothing (Holt-Winters)
 * Best for data with trend and seasonality
 */
function tripleExponentialSmoothing(values, alpha, beta, gamma, seasonLength) {
    const n = values.length;

    if (n < seasonLength * 2) {
        throw new Error(`Need at least ${seasonLength * 2} data points for season length ${seasonLength}`);
    }

    // Initialize seasonal indices using first complete season
    const seasonalInit = [];
    const firstSeasonAvg = values.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
    for (let i = 0; i < seasonLength; i++) {
        seasonalInit.push(values[i] / firstSeasonAvg);
    }

    const level = [firstSeasonAvg];
    const trend = [(values[seasonLength] - values[0]) / seasonLength];
    const seasonal = [...seasonalInit];
    const smoothed = [];

    // Calculate smoothed values starting after initialization
    for (let i = 0; i < n; i++) {
        if (i % Math.floor(n / 10) === 0) {
            self.postMessage({ type: 'progress', percentage: Math.round((i / n) * 100) });
        }

        const seasonIdx = i % seasonLength;

        if (i === 0) {
            smoothed.push(level[0] * seasonal[seasonIdx]);
        } else {
            // Level: L(t) = α * (Y(t) / S(t-m)) + (1 - α) * (L(t-1) + T(t-1))
            const newLevel = alpha * (values[i] / seasonal[seasonIdx]) +
                           (1 - alpha) * (level[i - 1] + trend[i - 1]);
            level.push(newLevel);

            // Trend: T(t) = β * (L(t) - L(t-1)) + (1 - β) * T(t-1)
            const newTrend = beta * (newLevel - level[i - 1]) + (1 - beta) * trend[i - 1];
            trend.push(newTrend);

            // Seasonal: S(t) = γ * (Y(t) / L(t)) + (1 - γ) * S(t-m)
            const newSeasonal = gamma * (values[i] / newLevel) + (1 - gamma) * seasonal[seasonIdx];
            seasonal[seasonIdx] = newSeasonal;

            // Fitted: F(t) = (L(t-1) + T(t-1)) * S(t-m)
            smoothed.push((level[i - 1] + trend[i - 1]) * seasonal[seasonIdx]);
        }
    }

    const metrics = calculateMetrics(values, smoothed);

    return {
        method: 'Triple Exponential Smoothing (Holt-Winters)',
        alpha,
        beta,
        gamma,
        seasonLength,
        formula: 'Multiplicative seasonal model with level, trend, and seasonal components',
        description: 'Level, trend, and seasonality',
        smoothed,
        level,
        trend,
        seasonal,
        metrics,
        finalLevel: level[n - 1],
        finalTrend: trend[n - 1]
    };
}

/**
 * Optimize parameters using grid search
 */
function optimizeParameters(values, method, seasonLength) {
    const step = 0.1;
    let bestParams = {};
    let bestMSE = Infinity;
    const results = [];

    if (method === 'single') {
        for (let alpha = 0.1; alpha <= 0.9; alpha += step) {
            self.postMessage({ type: 'progress', percentage: Math.round((alpha / 0.9) * 100) });

            const result = singleExponentialSmoothing(values, alpha);
            const mse = parseFloat(result.metrics.mse);

            results.push({ alpha: alpha.toFixed(1), mse });

            if (mse < bestMSE) {
                bestMSE = mse;
                bestParams = { alpha };
            }
        }
    } else if (method === 'double') {
        let progress = 0;
        const total = 81; // 9 * 9
        for (let alpha = 0.1; alpha <= 0.9; alpha += step) {
            for (let beta = 0.1; beta <= 0.9; beta += step) {
                progress++;
                if (progress % 10 === 0) {
                    self.postMessage({ type: 'progress', percentage: Math.round((progress / total) * 100) });
                }

                const result = doubleExponentialSmoothing(values, alpha, beta);
                const mse = parseFloat(result.metrics.mse);

                if (mse < bestMSE) {
                    bestMSE = mse;
                    bestParams = { alpha, beta };
                }
            }
        }
    } else if (method === 'triple') {
        let progress = 0;
        const total = 125; // 5 * 5 * 5 (coarser grid for speed)
        for (let alpha = 0.1; alpha <= 0.9; alpha += 0.2) {
            for (let beta = 0.1; beta <= 0.9; beta += 0.2) {
                for (let gamma = 0.1; gamma <= 0.9; gamma += 0.2) {
                    progress++;
                    self.postMessage({ type: 'progress', percentage: Math.round((progress / total) * 100) });

                    try {
                        const result = tripleExponentialSmoothing(values, alpha, beta, gamma, seasonLength);
                        const mse = parseFloat(result.metrics.mse);

                        if (mse < bestMSE) {
                            bestMSE = mse;
                            bestParams = { alpha, beta, gamma };
                        }
                    } catch (e) {
                        // Skip invalid parameter combinations
                    }
                }
            }
        }
    }

    // Apply best parameters
    let optimizedResult;
    if (method === 'single') {
        optimizedResult = singleExponentialSmoothing(values, bestParams.alpha);
    } else if (method === 'double') {
        optimizedResult = doubleExponentialSmoothing(values, bestParams.alpha, bestParams.beta);
    } else {
        optimizedResult = tripleExponentialSmoothing(values, bestParams.alpha, bestParams.beta, bestParams.gamma, seasonLength);
    }

    return {
        method,
        bestParams,
        bestMSE: bestMSE.toFixed(4),
        optimizedResult,
        searchResults: results.length > 0 ? results : null
    };
}

/**
 * Forecast using best method
 */
function forecastWithBestMethod(values, periods, seasonLength) {
    self.postMessage({ type: 'progress', percentage: 10 });

    // Try all methods and pick best
    const sesResult = singleExponentialSmoothing(values, 0.3);
    self.postMessage({ type: 'progress', percentage: 30 });

    const desResult = doubleExponentialSmoothing(values, 0.3, 0.1);
    self.postMessage({ type: 'progress', percentage: 50 });

    let tesResult = null;
    if (values.length >= seasonLength * 2) {
        try {
            tesResult = tripleExponentialSmoothing(values, 0.3, 0.1, 0.1, seasonLength);
        } catch (e) {
            // Not enough data for seasonal
        }
    }
    self.postMessage({ type: 'progress', percentage: 70 });

    // Compare MSE
    const methods = [
        { name: 'SES', mse: parseFloat(sesResult.metrics.mse), result: sesResult },
        { name: 'DES', mse: parseFloat(desResult.metrics.mse), result: desResult }
    ];
    if (tesResult) {
        methods.push({ name: 'TES', mse: parseFloat(tesResult.metrics.mse), result: tesResult });
    }

    methods.sort((a, b) => a.mse - b.mse);
    const best = methods[0];

    // Generate forecasts
    const forecasts = [];
    const n = values.length;

    for (let h = 1; h <= periods; h++) {
        let forecast;

        if (best.name === 'SES') {
            forecast = best.result.forecast;
        } else if (best.name === 'DES') {
            forecast = best.result.finalLevel + h * best.result.finalTrend;
        } else {
            const seasonIdx = (n + h - 1) % seasonLength;
            forecast = (best.result.finalLevel + h * best.result.finalTrend) * best.result.seasonal[seasonIdx];
        }

        forecasts.push({
            period: n + h,
            forecast: forecast
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        bestMethod: best.name,
        methodComparison: methods.map(m => ({ name: m.name, mse: m.mse.toFixed(4) })),
        smoothed: best.result.smoothed,
        forecasts,
        metrics: best.result.metrics
    };
}

/**
 * Calculate accuracy metrics
 */
function calculateMetrics(actual, fitted) {
    let sumError = 0;
    let sumSquaredError = 0;
    let sumAbsError = 0;
    let sumAbsPercentError = 0;
    let count = 0;

    for (let i = 1; i < actual.length; i++) {
        const error = actual[i] - fitted[i];
        sumError += error;
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
    const bias = sumError / count;

    return {
        mse: mse.toFixed(4),
        rmse: rmse.toFixed(4),
        mae: mae.toFixed(4),
        mape: mape.toFixed(2) + '%',
        bias: bias.toFixed(4)
    };
}
