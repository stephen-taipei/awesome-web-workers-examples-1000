/**
 * Web Worker: Moving Average Calculator
 * Calculates SMA, EMA, and WMA with various window sizes
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'sma':
                result = calculateSMA(data.values, data.period);
                break;
            case 'ema':
                result = calculateEMA(data.values, data.period);
                break;
            case 'wma':
                result = calculateWMA(data.values, data.period);
                break;
            case 'compare':
                result = compareAll(data.values, data.period);
                break;
            case 'generate':
                result = generateAndAnalyze(data.n, data.period, data.trend, data.volatility);
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
 * Simple Moving Average (SMA)
 * Average of last n values
 */
function calculateSMA(values, period) {
    const n = values.length;
    const sma = [];

    for (let i = 0; i < n; i++) {
        self.postMessage({ type: 'progress', percentage: Math.round((i / n) * 100) });

        if (i < period - 1) {
            sma.push(null); // Not enough data
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += values[i - j];
            }
            sma.push(sum / period);
        }
    }

    return {
        type: 'Simple Moving Average (SMA)',
        period,
        values: sma,
        formula: `SMA(t) = (1/n) * \u03a3[i=0 to n-1] X(t-i)`,
        description: 'Equal weight to all values in the window',
        stats: computeMAStats(values, sma)
    };
}

/**
 * Exponential Moving Average (EMA)
 * More weight to recent values
 */
function calculateEMA(values, period) {
    const n = values.length;
    const ema = [];
    const multiplier = 2 / (period + 1); // Smoothing factor

    for (let i = 0; i < n; i++) {
        self.postMessage({ type: 'progress', percentage: Math.round((i / n) * 100) });

        if (i === 0) {
            ema.push(values[0]); // Start with first value
        } else if (i < period - 1) {
            // Use SMA for initial values
            let sum = 0;
            for (let j = 0; j <= i; j++) {
                sum += values[j];
            }
            ema.push(sum / (i + 1));
        } else if (i === period - 1) {
            // First real EMA is SMA of first period
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += values[j];
            }
            ema.push(sum / period);
        } else {
            // EMA = (Value - Previous EMA) * multiplier + Previous EMA
            ema.push((values[i] - ema[i - 1]) * multiplier + ema[i - 1]);
        }
    }

    return {
        type: 'Exponential Moving Average (EMA)',
        period,
        multiplier: multiplier.toFixed(4),
        values: ema,
        formula: `EMA(t) = \u03b1 * X(t) + (1-\u03b1) * EMA(t-1), \u03b1 = 2/(n+1)`,
        description: 'Exponentially decreasing weights for older values',
        stats: computeMAStats(values, ema)
    };
}

/**
 * Weighted Moving Average (WMA)
 * Linear weights (most recent has highest weight)
 */
function calculateWMA(values, period) {
    const n = values.length;
    const wma = [];
    const weightSum = (period * (period + 1)) / 2; // Sum of 1+2+...+n

    for (let i = 0; i < n; i++) {
        self.postMessage({ type: 'progress', percentage: Math.round((i / n) * 100) });

        if (i < period - 1) {
            wma.push(null); // Not enough data
        } else {
            let weightedSum = 0;
            for (let j = 0; j < period; j++) {
                const weight = period - j; // Most recent gets highest weight
                weightedSum += values[i - j] * weight;
            }
            wma.push(weightedSum / weightSum);
        }
    }

    return {
        type: 'Weighted Moving Average (WMA)',
        period,
        weights: Array.from({ length: period }, (_, i) => period - i),
        values: wma,
        formula: `WMA(t) = \u03a3[i=0 to n-1] (n-i) * X(t-i) / \u03a3[j=1 to n] j`,
        description: 'Linear weights with most recent having highest weight',
        stats: computeMAStats(values, wma)
    };
}

/**
 * Compare all three moving average types
 */
function compareAll(values, period) {
    self.postMessage({ type: 'progress', percentage: 10 });
    const sma = calculateSMA(values, period);

    self.postMessage({ type: 'progress', percentage: 40 });
    const ema = calculateEMA(values, period);

    self.postMessage({ type: 'progress', percentage: 70 });
    const wma = calculateWMA(values, period);

    self.postMessage({ type: 'progress', percentage: 100 });

    // Find crossovers and divergences
    const analysis = analyzeComparison(values, sma.values, ema.values, wma.values);

    return {
        period,
        original: values,
        sma: sma.values,
        ema: ema.values,
        wma: wma.values,
        smaStats: sma.stats,
        emaStats: ema.stats,
        wmaStats: wma.stats,
        analysis
    };
}

/**
 * Generate synthetic data and analyze
 */
function generateAndAnalyze(n, period, trend, volatility) {
    const values = [];
    let value = 100;

    for (let i = 0; i < n; i++) {
        if (i % Math.floor(n / 10) === 0) {
            self.postMessage({ type: 'progress', percentage: Math.round((i / n) * 30) });
        }

        // Add trend
        value += trend;

        // Add random noise
        value += (Math.random() - 0.5) * 2 * volatility;

        // Add some cyclical patterns
        value += Math.sin(i / 20) * volatility * 0.5;

        values.push(Math.max(0, value)); // Ensure non-negative
    }

    self.postMessage({ type: 'progress', percentage: 40 });
    const comparison = compareAll(values, period);

    return {
        generated: true,
        dataPoints: n,
        trend,
        volatility,
        ...comparison
    };
}

/**
 * Compute statistics for MA
 */
function computeMAStats(original, ma) {
    const validPairs = [];
    for (let i = 0; i < original.length; i++) {
        if (ma[i] !== null) {
            validPairs.push({ orig: original[i], avg: ma[i] });
        }
    }

    if (validPairs.length === 0) return null;

    // Calculate tracking error (difference between original and MA)
    let sumError = 0;
    let sumSquaredError = 0;
    let maxError = 0;

    for (const pair of validPairs) {
        const error = Math.abs(pair.orig - pair.avg);
        sumError += error;
        sumSquaredError += error * error;
        maxError = Math.max(maxError, error);
    }

    const mae = sumError / validPairs.length;
    const rmse = Math.sqrt(sumSquaredError / validPairs.length);

    // Calculate lag by finding correlation at different offsets
    let bestLag = 0;
    let bestCorrelation = -Infinity;

    for (let lag = 0; lag < Math.min(20, Math.floor(validPairs.length / 2)); lag++) {
        const correlation = calculateCorrelation(original, ma, lag);
        if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestLag = lag;
        }
    }

    return {
        mae: mae.toFixed(4),
        rmse: rmse.toFixed(4),
        maxError: maxError.toFixed(4),
        estimatedLag: bestLag,
        correlation: bestCorrelation.toFixed(4)
    };
}

/**
 * Calculate correlation with lag
 */
function calculateCorrelation(x, y, lag) {
    const pairs = [];
    for (let i = lag; i < x.length; i++) {
        if (y[i - lag] !== null) {
            pairs.push({ x: x[i], y: y[i - lag] });
        }
    }

    if (pairs.length < 3) return 0;

    const n = pairs.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (const p of pairs) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
        sumY2 += p.y * p.y;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Analyze comparison of different MAs
 */
function analyzeComparison(original, sma, ema, wma) {
    const crossovers = [];
    const n = original.length;

    // Find EMA-SMA crossovers (common trading signal)
    for (let i = 1; i < n; i++) {
        if (ema[i] !== null && sma[i] !== null && ema[i - 1] !== null && sma[i - 1] !== null) {
            const prevDiff = ema[i - 1] - sma[i - 1];
            const currDiff = ema[i] - sma[i];

            if (prevDiff <= 0 && currDiff > 0) {
                crossovers.push({ index: i, type: 'bullish', signal: 'EMA crosses above SMA' });
            } else if (prevDiff >= 0 && currDiff < 0) {
                crossovers.push({ index: i, type: 'bearish', signal: 'EMA crosses below SMA' });
            }
        }
    }

    // Calculate average divergence between MAs
    let divergenceSum = 0;
    let divergenceCount = 0;

    for (let i = 0; i < n; i++) {
        if (sma[i] !== null && ema[i] !== null && wma[i] !== null) {
            const avg = (sma[i] + ema[i] + wma[i]) / 3;
            const divergence = Math.abs(sma[i] - avg) + Math.abs(ema[i] - avg) + Math.abs(wma[i] - avg);
            divergenceSum += divergence;
            divergenceCount++;
        }
    }

    const avgDivergence = divergenceCount > 0 ? divergenceSum / divergenceCount : 0;

    // Determine responsiveness ranking
    const responsiveness = ['EMA (fastest)', 'WMA (medium)', 'SMA (slowest)'];

    return {
        crossovers: crossovers.slice(-10), // Last 10 crossovers
        totalCrossovers: crossovers.length,
        avgDivergence: avgDivergence.toFixed(4),
        responsiveness,
        recommendation: getRecommendation(avgDivergence, crossovers.length)
    };
}

/**
 * Get usage recommendation based on analysis
 */
function getRecommendation(divergence, crossoverCount) {
    if (divergence < 1) {
        return 'Low divergence: All MAs perform similarly. Use SMA for simplicity.';
    } else if (crossoverCount > 10) {
        return 'High volatility detected: Consider longer period or use WMA for balance.';
    } else {
        return 'Moderate conditions: EMA recommended for trend following.';
    }
}
