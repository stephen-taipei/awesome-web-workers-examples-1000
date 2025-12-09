/**
 * Web Worker: Correlation Computation
 * Implements various correlation methods for signal analysis
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'autocorrelation':
                result = computeAutocorrelation(data.signal, data.maxLag);
                break;
            case 'crosscorrelation':
                result = computeCrossCorrelation(data.signal1, data.signal2, data.mode);
                break;
            case 'pearson':
                result = computePearsonCorrelation(data.x, data.y);
                break;
            case 'timedelay':
                result = findTimeDelay(data.signal1, data.signal2);
                break;
            case 'correlogram':
                result = computeCorrelogram(data.signal, data.maxLag);
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
 * Autocorrelation - correlation of signal with itself
 */
function computeAutocorrelation(signal, maxLag) {
    const n = signal.length;
    maxLag = maxLag || n - 1;
    maxLag = Math.min(maxLag, n - 1);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Compute mean
    const mean = signal.reduce((a, b) => a + b, 0) / n;
    const centered = signal.map(v => v - mean);

    // Compute variance
    const variance = centered.reduce((sum, v) => sum + v * v, 0);

    const autocorr = [];
    const lags = [];

    for (let lag = 0; lag <= maxLag; lag++) {
        if (lag % Math.max(1, Math.floor(maxLag / 20)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((lag / maxLag) * 80) });
        }

        let sum = 0;
        for (let i = 0; i < n - lag; i++) {
            sum += centered[i] * centered[i + lag];
        }

        // Normalize
        const r = variance > 0 ? sum / variance : 0;
        autocorr.push(r);
        lags.push(lag);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Find first significant peak (after lag 0)
    const peaks = findPeaks(autocorr.slice(1), 0.1).map(p => ({
        ...p,
        lag: p.index + 1
    }));

    // Estimate periodicity
    const periodicity = peaks.length > 0 ? peaks[0].lag : null;

    return {
        method: 'Autocorrelation',
        lags,
        values: autocorr,
        maxLag,
        variance: variance.toFixed(4),
        peaks,
        estimatedPeriod: periodicity,
        interpretation: interpretAutocorrelation(autocorr, peaks)
    };
}

/**
 * Cross-correlation between two signals
 */
function computeCrossCorrelation(signal1, signal2, mode = 'full') {
    const n1 = signal1.length;
    const n2 = signal2.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Compute means
    const mean1 = signal1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = signal2.reduce((a, b) => a + b, 0) / n2;
    const centered1 = signal1.map(v => v - mean1);
    const centered2 = signal2.map(v => v - mean2);

    // Compute standard deviations
    const std1 = Math.sqrt(centered1.reduce((sum, v) => sum + v * v, 0) / n1);
    const std2 = Math.sqrt(centered2.reduce((sum, v) => sum + v * v, 0) / n2);

    let outputLength, startLag;
    if (mode === 'full') {
        outputLength = n1 + n2 - 1;
        startLag = -(n2 - 1);
    } else { // 'same'
        outputLength = Math.max(n1, n2);
        startLag = -Math.floor((n2 - 1) / 2);
    }

    const crosscorr = [];
    const lags = [];

    for (let i = 0; i < outputLength; i++) {
        if (i % Math.max(1, Math.floor(outputLength / 20)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / outputLength) * 80) });
        }

        const lag = startLag + i;
        lags.push(lag);

        let sum = 0;
        let count = 0;

        for (let j = 0; j < n1; j++) {
            const k = j - lag;
            if (k >= 0 && k < n2) {
                sum += centered1[j] * centered2[k];
                count++;
            }
        }

        // Normalize
        const normFactor = std1 * std2 * count;
        crosscorr.push(normFactor > 0 ? sum / normFactor : 0);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Find max correlation
    let maxCorr = -Infinity;
    let maxLag = 0;
    for (let i = 0; i < crosscorr.length; i++) {
        if (crosscorr[i] > maxCorr) {
            maxCorr = crosscorr[i];
            maxLag = lags[i];
        }
    }

    return {
        method: 'Cross-Correlation',
        mode,
        lags,
        values: crosscorr,
        maxCorrelation: maxCorr.toFixed(4),
        lagAtMax: maxLag,
        signal1Length: n1,
        signal2Length: n2,
        interpretation: interpretCrossCorrelation(maxCorr, maxLag)
    };
}

/**
 * Pearson correlation coefficient with detailed analysis
 */
function computePearsonCorrelation(x, y) {
    if (x.length !== y.length) {
        throw new Error('Arrays must have same length');
    }

    const n = x.length;

    self.postMessage({ type: 'progress', percentage: 20 });

    // Compute means
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    // Compute covariance and standard deviations
    let sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        sumXY += dx * dy;
        sumX2 += dx * dx;
        sumY2 += dy * dy;
    }

    self.postMessage({ type: 'progress', percentage: 60 });

    const stdX = Math.sqrt(sumX2 / n);
    const stdY = Math.sqrt(sumY2 / n);
    const covariance = sumXY / n;
    const correlation = (stdX * stdY > 0) ? covariance / (stdX * stdY) : 0;

    // Coefficient of determination
    const r2 = correlation * correlation;

    // T-statistic for significance
    const tStat = correlation * Math.sqrt((n - 2) / (1 - r2));

    // Simple linear regression
    const slope = sumXY / sumX2;
    const intercept = meanY - slope * meanX;

    // Residuals
    const residuals = y.map((yi, i) => yi - (slope * x[i] + intercept));
    const sse = residuals.reduce((sum, r) => sum + r * r, 0);
    const rmse = Math.sqrt(sse / n);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Pearson Correlation',
        correlation: correlation.toFixed(6),
        rSquared: r2.toFixed(6),
        covariance: covariance.toFixed(6),
        tStatistic: tStat.toFixed(4),
        regression: {
            slope: slope.toFixed(6),
            intercept: intercept.toFixed(6),
            equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
            rmse: rmse.toFixed(6)
        },
        stats: {
            meanX: meanX.toFixed(4),
            meanY: meanY.toFixed(4),
            stdX: stdX.toFixed(4),
            stdY: stdY.toFixed(4),
            n
        },
        data: { x, y, residuals },
        interpretation: interpretPearson(correlation)
    };
}

/**
 * Find time delay between two signals using cross-correlation
 */
function findTimeDelay(signal1, signal2) {
    self.postMessage({ type: 'progress', percentage: 10 });

    const crosscorr = computeCrossCorrelation(signal1, signal2, 'full');

    self.postMessage({ type: 'progress', percentage: 70 });

    const lags = crosscorr.lags;
    const values = crosscorr.values;

    // Find peak correlation
    let maxIdx = 0;
    let maxVal = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] > maxVal) {
            maxVal = values[i];
            maxIdx = i;
        }
    }

    const delay = lags[maxIdx];

    // Sub-sample interpolation for better precision
    let refinedDelay = delay;
    if (maxIdx > 0 && maxIdx < values.length - 1) {
        const y1 = values[maxIdx - 1];
        const y2 = values[maxIdx];
        const y3 = values[maxIdx + 1];
        const delta = (y1 - y3) / (2 * (y1 - 2 * y2 + y3));
        if (!isNaN(delta) && Math.abs(delta) < 1) {
            refinedDelay = delay + delta;
        }
    }

    // Confidence based on peak sharpness
    const peakValue = maxVal;
    const surrounding = [];
    for (let i = Math.max(0, maxIdx - 5); i <= Math.min(values.length - 1, maxIdx + 5); i++) {
        if (i !== maxIdx) surrounding.push(values[i]);
    }
    const avgSurrounding = surrounding.reduce((a, b) => a + b, 0) / surrounding.length;
    const confidence = Math.min(1, (peakValue - avgSurrounding) / (1 - avgSurrounding + 0.001));

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Time Delay Estimation',
        delay: delay,
        refinedDelay: refinedDelay.toFixed(3),
        correlation: maxVal.toFixed(4),
        confidence: (confidence * 100).toFixed(1) + '%',
        crossCorrelation: crosscorr,
        interpretation: interpretTimeDelay(delay, maxVal, confidence)
    };
}

/**
 * Compute correlogram for multiple lags
 */
function computeCorrelogram(signal, maxLag) {
    const n = signal.length;
    maxLag = Math.min(maxLag || Math.floor(n / 4), n - 1);

    const autocorr = computeAutocorrelation(signal, maxLag);

    self.postMessage({ type: 'progress', percentage: 80 });

    // Compute confidence bounds (95%)
    const confidenceBound = 1.96 / Math.sqrt(n);

    // Check for white noise
    const outsideBounds = autocorr.values.slice(1).filter(v => Math.abs(v) > confidenceBound).length;
    const isWhiteNoise = outsideBounds <= Math.ceil(maxLag * 0.05);

    // Compute partial autocorrelation (PACF)
    const pacf = computePACF(autocorr.values);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Correlogram',
        acf: autocorr.values,
        pacf,
        lags: autocorr.lags,
        maxLag,
        confidenceBound: confidenceBound.toFixed(4),
        outsideBounds,
        isWhiteNoise,
        interpretation: interpretCorrelogram(autocorr.values, pacf, isWhiteNoise)
    };
}

/**
 * Compute Partial Autocorrelation Function (PACF)
 */
function computePACF(acf) {
    const n = acf.length;
    const pacf = [1]; // PACF at lag 0 is 1

    // Levinson-Durbin recursion
    let phi = [[acf[1]]];
    pacf.push(acf[1]);

    for (let k = 2; k < n; k++) {
        // Compute phi[k][k]
        let num = acf[k];
        for (let j = 1; j < k; j++) {
            num -= phi[k - 2][j - 1] * acf[k - j];
        }

        let den = 1;
        for (let j = 1; j < k; j++) {
            den -= phi[k - 2][j - 1] * acf[j];
        }

        const phikk = den !== 0 ? num / den : 0;
        pacf.push(phikk);

        // Update phi matrix
        const newPhi = [];
        for (let j = 1; j < k; j++) {
            newPhi.push(phi[k - 2][j - 1] - phikk * phi[k - 2][k - 1 - j]);
        }
        newPhi.push(phikk);
        phi.push(newPhi);
    }

    return pacf;
}

/**
 * Helper: Find peaks in array
 */
function findPeaks(arr, threshold = 0) {
    const peaks = [];
    for (let i = 1; i < arr.length - 1; i++) {
        if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1] && arr[i] > threshold) {
            peaks.push({ index: i, value: arr[i] });
        }
    }
    peaks.sort((a, b) => b.value - a.value);
    return peaks.slice(0, 5);
}

/**
 * Interpretation functions
 */
function interpretAutocorrelation(acf, peaks) {
    if (acf[1] > 0.8) {
        return 'Strong positive autocorrelation - trend or persistence present';
    } else if (acf[1] < -0.5) {
        return 'Strong negative autocorrelation - alternating pattern';
    } else if (peaks.length > 0) {
        return `Periodic pattern detected with period ~${peaks[0].lag}`;
    } else {
        return 'Weak autocorrelation - may be random or white noise';
    }
}

function interpretCrossCorrelation(maxCorr, lag) {
    let strength;
    if (Math.abs(maxCorr) > 0.8) strength = 'Strong';
    else if (Math.abs(maxCorr) > 0.5) strength = 'Moderate';
    else if (Math.abs(maxCorr) > 0.3) strength = 'Weak';
    else strength = 'Very weak';

    let direction = lag > 0 ? 'Signal 1 leads Signal 2' : lag < 0 ? 'Signal 2 leads Signal 1' : 'No time shift';

    return `${strength} correlation (r=${maxCorr}). ${direction} by ${Math.abs(lag)} samples.`;
}

function interpretPearson(r) {
    const absR = Math.abs(r);
    let strength, direction;

    if (absR > 0.9) strength = 'Very strong';
    else if (absR > 0.7) strength = 'Strong';
    else if (absR > 0.5) strength = 'Moderate';
    else if (absR > 0.3) strength = 'Weak';
    else strength = 'Very weak or no';

    direction = r > 0 ? 'positive' : r < 0 ? 'negative' : '';

    return `${strength} ${direction} linear relationship`;
}

function interpretTimeDelay(delay, corr, confidence) {
    if (confidence < 0.3) {
        return 'Low confidence - signals may be uncorrelated';
    }
    if (delay === 0) {
        return 'Signals appear synchronized (no delay)';
    }
    return `Signal 2 ${delay > 0 ? 'lags' : 'leads'} Signal 1 by ${Math.abs(delay)} samples`;
}

function interpretCorrelogram(acf, pacf, isWhiteNoise) {
    if (isWhiteNoise) {
        return 'Data appears to be white noise (random)';
    }

    const acfDecay = acf[1] > 0.5 && acf[2] > 0.3;
    const pacfCutoff = Math.abs(pacf[2]) < 0.2;

    if (acfDecay && pacfCutoff) {
        return 'Pattern suggests AR(1) process';
    } else if (!acfDecay && !pacfCutoff) {
        return 'Complex autocorrelation structure';
    } else {
        return 'Mixed autocorrelation pattern';
    }
}
