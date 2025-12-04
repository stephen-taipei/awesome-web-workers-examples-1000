/**
 * Web Worker for Convolution
 * Implements both direct and FFT-based convolution
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { signal, kernel, method } = data;
        const N = signal.length;
        const M = kernel.length;

        reportProgress(10);

        let result;
        let methodUsed = method;

        if (method === 'fft') {
            result = fftConvolve(signal, kernel);
        } else {
            result = directConvolve(signal, kernel);
        }

        reportProgress(70);

        // Compute frequency responses
        const signalSpectrum = computeSpectrum(signal);
        const kernelSpectrum = computeSpectrum(kernel, signal.length);
        const resultSpectrum = computeSpectrum(result);

        reportProgress(90);

        // Statistics
        const stats = computeStats(signal, kernel, result);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                signal,
                kernel,
                result,
                N,
                M,
                outputLength: result.length,
                method: methodUsed,
                signalSpectrum,
                kernelSpectrum,
                resultSpectrum,
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

function directConvolve(signal, kernel) {
    const N = signal.length;
    const M = kernel.length;
    const outputLength = N + M - 1;
    const result = new Array(outputLength).fill(0);

    for (let n = 0; n < outputLength; n++) {
        for (let k = 0; k < M; k++) {
            const signalIdx = n - k;
            if (signalIdx >= 0 && signalIdx < N) {
                result[n] += signal[signalIdx] * kernel[k];
            }
        }

        // Progress for long operations
        if (n % 1000 === 0) {
            reportProgress(10 + (n / outputLength) * 60);
        }
    }

    return result;
}

function fftConvolve(signal, kernel) {
    const N = signal.length;
    const M = kernel.length;
    const outputLength = N + M - 1;

    // Find next power of 2 for FFT
    const fftSize = nextPowerOf2(outputLength);

    // Zero-pad both signals
    const paddedSignal = zeroPad(signal, fftSize);
    const paddedKernel = zeroPad(kernel, fftSize);

    // FFT both signals
    const signalFFT = fft(paddedSignal);
    const kernelFFT = fft(paddedKernel);

    reportProgress(40);

    // Multiply in frequency domain
    const productFFT = new Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
        productFFT[i] = complexMultiply(signalFFT[i], kernelFFT[i]);
    }

    reportProgress(50);

    // Inverse FFT
    const resultComplex = ifft(productFFT);

    reportProgress(60);

    // Extract real part and trim to valid length
    const result = new Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        result[i] = resultComplex[i].re;
    }

    return result;
}

function nextPowerOf2(n) {
    let power = 1;
    while (power < n) {
        power *= 2;
    }
    return power;
}

function zeroPad(signal, length) {
    const padded = new Array(length);
    for (let i = 0; i < length; i++) {
        padded[i] = i < signal.length ? { re: signal[i], im: 0 } : { re: 0, im: 0 };
    }
    return padded;
}

function complexMultiply(a, b) {
    return {
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    };
}

function fft(signal) {
    const N = signal.length;

    if (N === 1) {
        return [{ re: signal[0].re, im: signal[0].im }];
    }

    // Ensure N is power of 2
    if ((N & (N - 1)) !== 0) {
        throw new Error('FFT size must be power of 2');
    }

    // Split into even and odd
    const even = new Array(N / 2);
    const odd = new Array(N / 2);

    for (let i = 0; i < N / 2; i++) {
        even[i] = signal[2 * i];
        odd[i] = signal[2 * i + 1];
    }

    // Recursive FFT
    const evenFFT = fft(even);
    const oddFFT = fft(odd);

    // Combine
    const result = new Array(N);
    for (let k = 0; k < N / 2; k++) {
        const angle = -2 * Math.PI * k / N;
        const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };
        const t = complexMultiply(twiddle, oddFFT[k]);

        result[k] = {
            re: evenFFT[k].re + t.re,
            im: evenFFT[k].im + t.im
        };
        result[k + N / 2] = {
            re: evenFFT[k].re - t.re,
            im: evenFFT[k].im - t.im
        };
    }

    return result;
}

function ifft(spectrum) {
    const N = spectrum.length;

    // Conjugate
    const conjugated = spectrum.map(c => ({ re: c.re, im: -c.im }));

    // FFT of conjugate
    const transformed = fft(conjugated);

    // Conjugate and scale
    return transformed.map(c => ({
        re: c.re / N,
        im: -c.im / N
    }));
}

function computeSpectrum(signal, padTo) {
    const N = padTo || signal.length;
    const fftSize = nextPowerOf2(N);

    // Zero-pad
    const padded = new Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
        padded[i] = i < signal.length ? { re: signal[i], im: 0 } : { re: 0, im: 0 };
    }

    const spectrum = fft(padded);

    // Compute magnitude (only first half due to symmetry)
    const halfN = fftSize / 2;
    const magnitude = new Array(halfN);
    for (let i = 0; i < halfN; i++) {
        magnitude[i] = Math.sqrt(spectrum[i].re ** 2 + spectrum[i].im ** 2);
    }

    return magnitude;
}

function computeStats(signal, kernel, result) {
    // Signal stats
    const signalMin = Math.min(...signal);
    const signalMax = Math.max(...signal);
    const signalMean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const signalEnergy = signal.reduce((sum, x) => sum + x * x, 0);

    // Result stats
    const resultMin = Math.min(...result);
    const resultMax = Math.max(...result);
    const resultMean = result.reduce((a, b) => a + b, 0) / result.length;
    const resultEnergy = result.reduce((sum, x) => sum + x * x, 0);

    // Kernel properties
    const kernelSum = kernel.reduce((a, b) => a + b, 0);
    const kernelNormalized = Math.abs(kernelSum - 1) < 0.001;

    // Find peaks in result (for edge detection)
    const peaks = [];
    for (let i = 1; i < result.length - 1; i++) {
        if (Math.abs(result[i]) > Math.abs(result[i - 1]) &&
            Math.abs(result[i]) > Math.abs(result[i + 1]) &&
            Math.abs(result[i]) > resultMax * 0.3) {
            peaks.push({ index: i, value: result[i] });
        }
    }

    return {
        signalMin,
        signalMax,
        signalMean,
        signalEnergy,
        resultMin,
        resultMax,
        resultMean,
        resultEnergy,
        kernelSum,
        kernelNormalized,
        peaks: peaks.slice(0, 10),
        amplification: signalEnergy > 0 ? resultEnergy / signalEnergy : 0
    };
}
