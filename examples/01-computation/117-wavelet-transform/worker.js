/**
 * Web Worker for Wavelet Transform
 * Implements Haar and Daubechies wavelets with multi-level decomposition
 */

// Wavelet filter coefficients
const WAVELETS = {
    haar: {
        low: [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
        high: [1 / Math.sqrt(2), -1 / Math.sqrt(2)]
    },
    db2: {
        // Daubechies-2 coefficients
        low: [
            (1 + Math.sqrt(3)) / (4 * Math.sqrt(2)),
            (3 + Math.sqrt(3)) / (4 * Math.sqrt(2)),
            (3 - Math.sqrt(3)) / (4 * Math.sqrt(2)),
            (1 - Math.sqrt(3)) / (4 * Math.sqrt(2))
        ],
        high: [
            (1 - Math.sqrt(3)) / (4 * Math.sqrt(2)),
            -(3 - Math.sqrt(3)) / (4 * Math.sqrt(2)),
            (3 + Math.sqrt(3)) / (4 * Math.sqrt(2)),
            -(1 + Math.sqrt(3)) / (4 * Math.sqrt(2))
        ]
    },
    db4: {
        // Daubechies-4 coefficients (8-tap)
        low: [
            0.32580343,
            1.01094572,
            0.89220014,
            -0.03957503,
            -0.26450717,
            0.0436163,
            0.0465036,
            -0.01498699
        ].map(x => x / Math.sqrt(2)),
        high: [
            -0.01498699,
            -0.0465036,
            0.0436163,
            0.26450717,
            -0.03957503,
            -0.89220014,
            1.01094572,
            -0.32580343
        ].map(x => x / Math.sqrt(2))
    }
};

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { signal, waveletType, levels, thresholdPercent } = data;
        const N = signal.length;

        // Validate signal length is power of 2
        if ((N & (N - 1)) !== 0) {
            throw new Error('Signal length must be a power of 2');
        }

        const wavelet = WAVELETS[waveletType];
        if (!wavelet) {
            throw new Error('Unknown wavelet type');
        }

        reportProgress(10);

        // Compute maximum levels
        const maxLevels = Math.floor(Math.log2(N)) - Math.floor(Math.log2(wavelet.low.length)) + 1;
        const actualLevels = levels === 'max' ? maxLevels : Math.min(parseInt(levels), maxLevels);

        // Forward wavelet transform (decomposition)
        const decomposition = waveletDecompose(signal, wavelet, actualLevels);

        reportProgress(40);

        // Apply thresholding for denoising
        const threshold = thresholdPercent / 100;
        const thresholdedDecomp = applyThreshold(decomposition, threshold);

        reportProgress(60);

        // Inverse transform (reconstruction)
        const reconstructed = waveletReconstruct(thresholdedDecomp, wavelet);

        reportProgress(80);

        // Compute statistics
        const stats = computeStats(signal, decomposition, thresholdedDecomp, reconstructed);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                signal,
                N,
                waveletType,
                levels: actualLevels,
                maxLevels,
                decomposition,
                thresholdedDecomp,
                reconstructed,
                thresholdPercent,
                stats
            },
            executionTime
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};

function reportProgress(percent) {
    self.postMessage({ type: 'progress', percentage: Math.round(percent) });
}

function waveletDecompose(signal, wavelet, levels) {
    const result = {
        approximations: [],
        details: [],
        original: signal.slice()
    };

    let currentSignal = signal.slice();

    for (let level = 0; level < levels; level++) {
        const { approx, detail } = singleLevelDecompose(currentSignal, wavelet);
        result.approximations.push(approx);
        result.details.push(detail);
        currentSignal = approx;
    }

    return result;
}

function singleLevelDecompose(signal, wavelet) {
    const N = signal.length;
    const halfN = N / 2;
    const filterLen = wavelet.low.length;

    const approx = new Array(halfN).fill(0);
    const detail = new Array(halfN).fill(0);

    for (let k = 0; k < halfN; k++) {
        let sumLow = 0;
        let sumHigh = 0;

        for (let i = 0; i < filterLen; i++) {
            const idx = (2 * k + i) % N;
            sumLow += signal[idx] * wavelet.low[i];
            sumHigh += signal[idx] * wavelet.high[i];
        }

        approx[k] = sumLow;
        detail[k] = sumHigh;
    }

    return { approx, detail };
}

function applyThreshold(decomposition, threshold) {
    if (threshold === 0) {
        return decomposition;
    }

    // Find maximum coefficient magnitude for threshold calculation
    let maxCoeff = 0;
    for (const detail of decomposition.details) {
        for (const d of detail) {
            maxCoeff = Math.max(maxCoeff, Math.abs(d));
        }
    }

    const thresholdValue = threshold * maxCoeff;

    // Apply soft thresholding to detail coefficients
    const thresholdedDetails = decomposition.details.map(detail =>
        detail.map(d => softThreshold(d, thresholdValue))
    );

    return {
        ...decomposition,
        details: thresholdedDetails,
        thresholdValue
    };
}

function softThreshold(x, threshold) {
    if (Math.abs(x) <= threshold) {
        return 0;
    }
    return x > 0 ? x - threshold : x + threshold;
}

function waveletReconstruct(decomposition, wavelet) {
    const levels = decomposition.approximations.length;

    // Start with the coarsest approximation
    let currentSignal = decomposition.approximations[levels - 1].slice();

    // Reconstruct from coarsest to finest level
    for (let level = levels - 1; level >= 0; level--) {
        const detail = decomposition.details[level];
        currentSignal = singleLevelReconstruct(currentSignal, detail, wavelet);
    }

    return currentSignal;
}

function singleLevelReconstruct(approx, detail, wavelet) {
    const halfN = approx.length;
    const N = halfN * 2;
    const filterLen = wavelet.low.length;

    const signal = new Array(N).fill(0);

    // Inverse transform using upsampling and filtering
    for (let k = 0; k < halfN; k++) {
        for (let i = 0; i < filterLen; i++) {
            const idx = (2 * k + i) % N;
            signal[idx] += approx[k] * wavelet.low[i] + detail[k] * wavelet.high[i];
        }
    }

    return signal;
}

function computeStats(original, decomposition, thresholdedDecomp, reconstructed) {
    const N = original.length;

    // Energy in original signal
    const originalEnergy = original.reduce((sum, x) => sum + x * x, 0);

    // Energy in each level
    const levelEnergies = decomposition.details.map(detail =>
        detail.reduce((sum, d) => sum + d * d, 0)
    );

    const approxEnergy = decomposition.approximations[decomposition.approximations.length - 1]
        .reduce((sum, a) => sum + a * a, 0);

    // Reconstruction error
    let mse = 0;
    for (let i = 0; i < N; i++) {
        const error = original[i] - reconstructed[i];
        mse += error * error;
    }
    mse /= N;

    // Count non-zero coefficients after thresholding
    let totalCoeffs = 0;
    let nonZeroCoeffs = 0;

    for (const detail of thresholdedDecomp.details) {
        totalCoeffs += detail.length;
        nonZeroCoeffs += detail.filter(d => d !== 0).length;
    }

    const finalApprox = thresholdedDecomp.approximations[thresholdedDecomp.approximations.length - 1];
    totalCoeffs += finalApprox.length;
    nonZeroCoeffs += finalApprox.filter(a => a !== 0).length;

    const compressionRatio = totalCoeffs / Math.max(1, nonZeroCoeffs);

    // Find significant coefficients (edges/features)
    const significantDetails = [];
    decomposition.details.forEach((detail, level) => {
        const maxDetail = Math.max(...detail.map(Math.abs));
        detail.forEach((d, idx) => {
            if (Math.abs(d) > maxDetail * 0.3) {
                significantDetails.push({
                    level: level + 1,
                    position: idx,
                    value: d,
                    relativeStrength: Math.abs(d) / maxDetail
                });
            }
        });
    });

    return {
        originalEnergy,
        levelEnergies,
        approxEnergy,
        totalEnergy: levelEnergies.reduce((a, b) => a + b, 0) + approxEnergy,
        mse,
        psnr: mse > 0 ? 10 * Math.log10(Math.max(...original.map(Math.abs)) ** 2 / mse) : Infinity,
        totalCoeffs,
        nonZeroCoeffs,
        compressionRatio,
        significantDetails: significantDetails.slice(0, 10) // Top 10
    };
}
