/**
 * Web Worker: Wavelet Transform
 * Implements Discrete Wavelet Transform (DWT) and Continuous Wavelet Transform (CWT)
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'dwt':
                result = computeDWT(data.signal, data.wavelet, data.level);
                break;
            case 'idwt':
                result = computeIDWT(data.coefficients, data.wavelet);
                break;
            case 'cwt':
                result = computeCWT(data.signal, data.wavelet, data.scales);
                break;
            case 'denoise':
                result = denoiseSignal(data.signal, data.wavelet, data.threshold, data.level);
                break;
            case 'decompose':
                result = multiLevelDecomposition(data.signal, data.wavelet, data.level);
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

// Wavelet filter coefficients
const WAVELETS = {
    haar: {
        name: 'Haar',
        dec_lo: [0.7071067811865476, 0.7071067811865476],
        dec_hi: [-0.7071067811865476, 0.7071067811865476],
        rec_lo: [0.7071067811865476, 0.7071067811865476],
        rec_hi: [0.7071067811865476, -0.7071067811865476]
    },
    db2: {
        name: 'Daubechies 2',
        dec_lo: [-0.12940952255092145, 0.22414386804185735, 0.836516303737469, 0.48296291314469025],
        dec_hi: [-0.48296291314469025, 0.836516303737469, -0.22414386804185735, -0.12940952255092145],
        rec_lo: [0.48296291314469025, 0.836516303737469, 0.22414386804185735, -0.12940952255092145],
        rec_hi: [-0.12940952255092145, -0.22414386804185735, 0.836516303737469, -0.48296291314469025]
    },
    db4: {
        name: 'Daubechies 4',
        dec_lo: [-0.010597401784997278, 0.032883011666982945, 0.030841381835986965, -0.18703481171888114,
                 -0.02798376941698385, 0.6308807679295904, 0.7148465705525415, 0.23037781330885523],
        dec_hi: [-0.23037781330885523, 0.7148465705525415, -0.6308807679295904, -0.02798376941698385,
                 0.18703481171888114, 0.030841381835986965, -0.032883011666982945, -0.010597401784997278],
        rec_lo: [0.23037781330885523, 0.7148465705525415, 0.6308807679295904, -0.02798376941698385,
                 -0.18703481171888114, 0.030841381835986965, 0.032883011666982945, -0.010597401784997278],
        rec_hi: [-0.010597401784997278, -0.032883011666982945, 0.030841381835986965, 0.18703481171888114,
                 -0.02798376941698385, -0.6308807679295904, 0.7148465705525415, -0.23037781330885523]
    },
    sym4: {
        name: 'Symlet 4',
        dec_lo: [-0.07576571478927333, -0.02963552764599851, 0.49761866763201545, 0.8037387518059161,
                 0.29785779560527736, -0.09921954357684722, -0.012603967262037833, 0.032223100604042702],
        dec_hi: [-0.032223100604042702, -0.012603967262037833, 0.09921954357684722, 0.29785779560527736,
                 -0.8037387518059161, 0.49761866763201545, 0.02963552764599851, -0.07576571478927333],
        rec_lo: [0.032223100604042702, -0.012603967262037833, -0.09921954357684722, 0.29785779560527736,
                 0.8037387518059161, 0.49761866763201545, -0.02963552764599851, -0.07576571478927333],
        rec_hi: [-0.07576571478927333, 0.02963552764599851, 0.49761866763201545, -0.8037387518059161,
                 0.29785779560527736, 0.09921954357684722, -0.012603967262037833, -0.032223100604042702]
    }
};

/**
 * Discrete Wavelet Transform (DWT) - Single level
 */
function computeDWT(signal, waveletName, level = 1) {
    const wavelet = WAVELETS[waveletName] || WAVELETS.haar;
    let approx = [...signal];
    const details = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let l = 0; l < level; l++) {
        const result = dwtSingleLevel(approx, wavelet);
        approx = result.approximation;
        details.unshift(result.detail);

        self.postMessage({ type: 'progress', percentage: 10 + Math.round(((l + 1) / level) * 80) });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Calculate energy distribution
    const approxEnergy = approx.reduce((sum, v) => sum + v * v, 0);
    const detailEnergies = details.map(d => d.reduce((sum, v) => sum + v * v, 0));
    const totalEnergy = approxEnergy + detailEnergies.reduce((a, b) => a + b, 0);

    return {
        wavelet: wavelet.name,
        level,
        approximation: approx,
        details,
        energyDistribution: {
            approximation: (approxEnergy / totalEnergy * 100).toFixed(2) + '%',
            details: detailEnergies.map(e => (e / totalEnergy * 100).toFixed(2) + '%')
        },
        originalLength: signal.length
    };
}

/**
 * Single level DWT
 */
function dwtSingleLevel(signal, wavelet) {
    const n = signal.length;
    const filterLen = wavelet.dec_lo.length;

    // Pad signal for convolution
    const padded = padSignal(signal, filterLen);

    // Convolve with low-pass and high-pass filters
    const approxFull = convolve(padded, wavelet.dec_lo);
    const detailFull = convolve(padded, wavelet.dec_hi);

    // Downsample by 2
    const halfLen = Math.ceil(n / 2);
    const approximation = [];
    const detail = [];

    for (let i = 0; i < halfLen; i++) {
        const idx = i * 2 + filterLen - 1;
        if (idx < approxFull.length) {
            approximation.push(approxFull[idx]);
            detail.push(detailFull[idx]);
        }
    }

    return { approximation, detail };
}

/**
 * Inverse DWT
 */
function computeIDWT(coefficients, waveletName) {
    const wavelet = WAVELETS[waveletName] || WAVELETS.haar;
    const { approximation, details } = coefficients;

    self.postMessage({ type: 'progress', percentage: 10 });

    let signal = [...approximation];

    for (let l = 0; l < details.length; l++) {
        signal = idwtSingleLevel(signal, details[l], wavelet);
        self.postMessage({ type: 'progress', percentage: 10 + Math.round(((l + 1) / details.length) * 80) });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        wavelet: wavelet.name,
        reconstructed: signal
    };
}

/**
 * Single level IDWT
 */
function idwtSingleLevel(approx, detail, wavelet) {
    const n = approx.length;

    // Upsample by 2 (insert zeros)
    const upApprox = new Array(n * 2).fill(0);
    const upDetail = new Array(n * 2).fill(0);

    for (let i = 0; i < n; i++) {
        upApprox[i * 2] = approx[i];
        upDetail[i * 2] = detail[i];
    }

    // Convolve with reconstruction filters
    const recApprox = convolve(upApprox, wavelet.rec_lo);
    const recDetail = convolve(upDetail, wavelet.rec_hi);

    // Add results
    const filterLen = wavelet.rec_lo.length;
    const result = [];
    const offset = filterLen - 1;

    for (let i = 0; i < n * 2; i++) {
        const idx = i + offset;
        if (idx < recApprox.length) {
            result.push(recApprox[idx] + recDetail[idx]);
        }
    }

    return result;
}

/**
 * Continuous Wavelet Transform (CWT) using Morlet wavelet
 */
function computeCWT(signal, waveletType, scales) {
    const n = signal.length;
    const numScales = scales.length;
    const coefficients = [];

    for (let s = 0; s < numScales; s++) {
        self.postMessage({ type: 'progress', percentage: Math.round((s / numScales) * 100) });

        const scale = scales[s];
        const scaleCoeffs = [];

        for (let t = 0; t < n; t++) {
            let sum = 0;
            for (let tau = 0; tau < n; tau++) {
                const waveletValue = morletWavelet((tau - t) / scale, waveletType);
                sum += signal[tau] * waveletValue;
            }
            scaleCoeffs.push(sum / Math.sqrt(scale));
        }

        coefficients.push(scaleCoeffs);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Find scalogram (magnitude)
    const scalogram = coefficients.map(row => row.map(v => Math.abs(v)));

    // Find dominant scale at each time point
    const dominantScales = [];
    for (let t = 0; t < n; t++) {
        let maxIdx = 0;
        let maxVal = 0;
        for (let s = 0; s < numScales; s++) {
            if (scalogram[s][t] > maxVal) {
                maxVal = scalogram[s][t];
                maxIdx = s;
            }
        }
        dominantScales.push(scales[maxIdx]);
    }

    return {
        scales,
        coefficients,
        scalogram,
        dominantScales,
        signalLength: n
    };
}

/**
 * Morlet wavelet function
 */
function morletWavelet(t, type = 'real') {
    const sigma = 1;
    const omega0 = 5;

    if (type === 'real') {
        return Math.exp(-t * t / (2 * sigma * sigma)) * Math.cos(omega0 * t);
    } else {
        // Complex (return magnitude)
        const real = Math.exp(-t * t / (2 * sigma * sigma)) * Math.cos(omega0 * t);
        const imag = Math.exp(-t * t / (2 * sigma * sigma)) * Math.sin(omega0 * t);
        return Math.sqrt(real * real + imag * imag);
    }
}

/**
 * Denoise signal using wavelet thresholding
 */
function denoiseSignal(signal, waveletName, thresholdType, level) {
    const wavelet = WAVELETS[waveletName] || WAVELETS.haar;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Forward DWT
    let approx = [...signal];
    const details = [];

    for (let l = 0; l < level; l++) {
        const result = dwtSingleLevel(approx, wavelet);
        approx = result.approximation;
        details.unshift(result.detail);
    }

    self.postMessage({ type: 'progress', percentage: 40 });

    // Calculate threshold
    const allDetails = details.flat();
    const sigma = medianAbsoluteDeviation(allDetails) / 0.6745;
    const threshold = sigma * Math.sqrt(2 * Math.log(signal.length));

    // Apply thresholding to details
    const thresholdedDetails = details.map(d => {
        return d.map(v => {
            if (thresholdType === 'soft') {
                return softThreshold(v, threshold);
            } else {
                return hardThreshold(v, threshold);
            }
        });
    });

    self.postMessage({ type: 'progress', percentage: 70 });

    // Inverse DWT
    let denoised = [...approx];
    for (let l = 0; l < thresholdedDetails.length; l++) {
        denoised = idwtSingleLevel(denoised, thresholdedDetails[l], wavelet);
    }

    // Trim to original length
    denoised = denoised.slice(0, signal.length);

    self.postMessage({ type: 'progress', percentage: 100 });

    // Calculate SNR improvement
    const noiseEstimate = signal.map((v, i) => v - denoised[i]);
    const signalPower = signal.reduce((sum, v) => sum + v * v, 0) / signal.length;
    const noisePower = noiseEstimate.reduce((sum, v) => sum + v * v, 0) / signal.length;
    const snrImprovement = noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : Infinity;

    return {
        wavelet: wavelet.name,
        thresholdType,
        threshold: threshold.toFixed(4),
        level,
        original: signal,
        denoised,
        removed: noiseEstimate,
        snrImprovement: snrImprovement.toFixed(2) + ' dB'
    };
}

/**
 * Multi-level decomposition for analysis
 */
function multiLevelDecomposition(signal, waveletName, level) {
    const wavelet = WAVELETS[waveletName] || WAVELETS.haar;
    let approx = [...signal];
    const levels = [];

    for (let l = 0; l < level; l++) {
        self.postMessage({ type: 'progress', percentage: Math.round((l / level) * 100) });

        const result = dwtSingleLevel(approx, wavelet);

        levels.push({
            level: l + 1,
            approximation: result.approximation,
            detail: result.detail,
            approxEnergy: result.approximation.reduce((sum, v) => sum + v * v, 0),
            detailEnergy: result.detail.reduce((sum, v) => sum + v * v, 0)
        });

        approx = result.approximation;
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const totalEnergy = signal.reduce((sum, v) => sum + v * v, 0);

    return {
        wavelet: wavelet.name,
        levels,
        totalEnergy,
        originalLength: signal.length
    };
}

/**
 * Helper: Convolution
 */
function convolve(signal, filter) {
    const n = signal.length;
    const m = filter.length;
    const result = new Array(n + m - 1).fill(0);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            result[i + j] += signal[i] * filter[j];
        }
    }

    return result;
}

/**
 * Helper: Pad signal for convolution
 */
function padSignal(signal, filterLen) {
    const padLen = filterLen - 1;
    const padded = new Array(padLen).fill(0).concat(signal).concat(new Array(padLen).fill(0));
    return padded;
}

/**
 * Helper: Soft thresholding
 */
function softThreshold(x, t) {
    if (Math.abs(x) <= t) return 0;
    return x > 0 ? x - t : x + t;
}

/**
 * Helper: Hard thresholding
 */
function hardThreshold(x, t) {
    return Math.abs(x) <= t ? 0 : x;
}

/**
 * Helper: Median Absolute Deviation
 */
function medianAbsoluteDeviation(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const deviations = arr.map(v => Math.abs(v - median));
    deviations.sort((a, b) => a - b);
    return deviations[Math.floor(deviations.length / 2)];
}
