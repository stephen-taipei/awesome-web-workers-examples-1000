/**
 * Web Worker for Discrete Cosine Transform
 * Implements DCT-I through DCT-IV with compression demo
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { signal, dctType, quantizationFactor } = data;
        const N = signal.length;

        reportProgress(10);

        // Compute DCT
        const dctCoeffs = computeDCT(signal, dctType);

        reportProgress(40);

        // Apply quantization if specified
        let quantizedCoeffs = dctCoeffs.slice();
        let nonZeroCount = N;

        if (quantizationFactor > 0) {
            quantizedCoeffs = quantize(dctCoeffs, quantizationFactor);
            nonZeroCount = quantizedCoeffs.filter(c => c !== 0).length;
        }

        reportProgress(50);

        // Compute inverse DCT for reconstruction
        const reconstructed = computeIDCT(quantizedCoeffs, dctType);

        reportProgress(70);

        // Compute error metrics
        const mse = computeMSE(signal, reconstructed);
        const psnr = mse > 0 ? 10 * Math.log10(255 * 255 / mse) : Infinity;

        // Energy analysis
        const signalEnergy = signal.reduce((sum, x) => sum + x * x, 0);
        const dctEnergy = dctCoeffs.reduce((sum, x) => sum + x * x, 0);

        // Energy compaction - what % of energy in first k coefficients
        const energyCompaction = computeEnergyCompaction(dctCoeffs);

        reportProgress(90);

        // Compression ratio
        const compressionRatio = N / Math.max(1, nonZeroCount);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                signal,
                N,
                dctType,
                dctCoeffs,
                quantizedCoeffs,
                reconstructed,
                quantizationFactor,
                nonZeroCount,
                compressionRatio,
                mse,
                psnr,
                signalEnergy,
                dctEnergy,
                energyCompaction
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

function computeDCT(x, dctType) {
    const N = x.length;
    const X = new Array(N).fill(0);

    switch (dctType) {
        case 'DCT-I':
            for (let k = 0; k < N; k++) {
                let sum = 0;
                for (let n = 0; n < N; n++) {
                    const scale = (n === 0 || n === N - 1) ? 0.5 : 1;
                    sum += scale * x[n] * Math.cos(Math.PI * n * k / (N - 1));
                }
                X[k] = sum;
            }
            break;

        case 'DCT-II':
            // Most common - used in JPEG
            for (let k = 0; k < N; k++) {
                let sum = 0;
                for (let n = 0; n < N; n++) {
                    sum += x[n] * Math.cos(Math.PI * (n + 0.5) * k / N);
                }
                // Apply normalization factor
                const alpha = k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
                X[k] = alpha * sum;
            }
            break;

        case 'DCT-III':
            // Inverse of DCT-II
            for (let k = 0; k < N; k++) {
                let sum = x[0] / Math.sqrt(N);
                for (let n = 1; n < N; n++) {
                    sum += Math.sqrt(2 / N) * x[n] * Math.cos(Math.PI * n * (k + 0.5) / N);
                }
                X[k] = sum;
            }
            break;

        case 'DCT-IV':
            for (let k = 0; k < N; k++) {
                let sum = 0;
                for (let n = 0; n < N; n++) {
                    sum += x[n] * Math.cos(Math.PI * (n + 0.5) * (k + 0.5) / N);
                }
                X[k] = Math.sqrt(2 / N) * sum;
            }
            break;
    }

    return X;
}

function computeIDCT(X, dctType) {
    const N = X.length;
    const x = new Array(N).fill(0);

    switch (dctType) {
        case 'DCT-I':
            // DCT-I is its own inverse (with scaling)
            for (let n = 0; n < N; n++) {
                let sum = 0;
                for (let k = 0; k < N; k++) {
                    const scale = (k === 0 || k === N - 1) ? 0.5 : 1;
                    sum += scale * X[k] * Math.cos(Math.PI * n * k / (N - 1));
                }
                x[n] = 2 * sum / (N - 1);
            }
            break;

        case 'DCT-II':
            // Inverse of DCT-II is DCT-III
            for (let n = 0; n < N; n++) {
                let sum = X[0] / Math.sqrt(N);
                for (let k = 1; k < N; k++) {
                    sum += Math.sqrt(2 / N) * X[k] * Math.cos(Math.PI * k * (n + 0.5) / N);
                }
                x[n] = sum;
            }
            break;

        case 'DCT-III':
            // Inverse of DCT-III is DCT-II
            for (let n = 0; n < N; n++) {
                let sum = 0;
                for (let k = 0; k < N; k++) {
                    sum += X[k] * Math.cos(Math.PI * (k + 0.5) * n / N);
                }
                const alpha = n === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
                x[n] = alpha * sum;
            }
            break;

        case 'DCT-IV':
            // DCT-IV is its own inverse
            for (let n = 0; n < N; n++) {
                let sum = 0;
                for (let k = 0; k < N; k++) {
                    sum += X[k] * Math.cos(Math.PI * (k + 0.5) * (n + 0.5) / N);
                }
                x[n] = Math.sqrt(2 / N) * sum;
            }
            break;
    }

    return x;
}

function quantize(coeffs, Q) {
    return coeffs.map((c, k) => {
        // Simple quantization - divide and round
        const quantized = Math.round(c / Q);
        return quantized * Q;
    });
}

function computeMSE(original, reconstructed) {
    const N = original.length;
    let sumSquaredError = 0;
    for (let i = 0; i < N; i++) {
        const error = original[i] - reconstructed[i];
        sumSquaredError += error * error;
    }
    return sumSquaredError / N;
}

function computeEnergyCompaction(coeffs) {
    const N = coeffs.length;
    const totalEnergy = coeffs.reduce((sum, c) => sum + c * c, 0);

    const compaction = [];
    let cumulativeEnergy = 0;

    for (let k = 0; k < Math.min(N, 16); k++) {
        cumulativeEnergy += coeffs[k] * coeffs[k];
        compaction.push({
            k,
            coefficient: coeffs[k],
            percentEnergy: totalEnergy > 0 ? (cumulativeEnergy / totalEnergy * 100) : 0
        });
    }

    return compaction;
}
