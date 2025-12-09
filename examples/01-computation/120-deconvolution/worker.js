/**
 * Web Worker for Deconvolution
 * Implements Wiener filter and inverse filtering for signal restoration
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { original, kernel, noiseLevel, method, wienerK } = data;
        const N = original.length;

        reportProgress(10);

        // Step 1: Convolve original with kernel to create blurred signal
        const blurred = convolve(original, kernel);

        reportProgress(20);

        // Step 2: Add noise
        const noisy = addNoise(blurred, noiseLevel);

        reportProgress(30);

        // Step 3: Perform deconvolution
        let restored;
        switch (method) {
            case 'inverse':
                restored = inverseFilter(noisy, kernel);
                break;
            case 'wiener':
                restored = wienerFilter(noisy, kernel, wienerK);
                break;
            case 'regularized':
                restored = regularizedInverse(noisy, kernel, wienerK);
                break;
            default:
                restored = wienerFilter(noisy, kernel, wienerK);
        }

        reportProgress(70);

        // Trim restored to original length
        const restoredTrimmed = restored.slice(0, N);

        // Compute metrics
        const metrics = computeMetrics(original, blurred.slice(0, N), restoredTrimmed);

        reportProgress(90);

        // Compute spectra for visualization
        const spectra = {
            original: computeSpectrum(original),
            blurred: computeSpectrum(blurred.slice(0, N)),
            restored: computeSpectrum(restoredTrimmed),
            kernel: computeSpectrum(kernel, N)
        };

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                original,
                blurred: blurred.slice(0, N),
                noisy: noisy.slice(0, N),
                restored: restoredTrimmed,
                kernel,
                N,
                method,
                noiseLevel,
                wienerK,
                metrics,
                spectra
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

function convolve(signal, kernel) {
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
    }

    return result;
}

function addNoise(signal, noiseLevel) {
    if (noiseLevel === 0) return signal.slice();

    const maxVal = Math.max(...signal.map(Math.abs));
    const noiseAmp = maxVal * noiseLevel / 100;

    return signal.map(x => x + (Math.random() - 0.5) * 2 * noiseAmp);
}

function inverseFilter(degraded, kernel) {
    const N = degraded.length;
    const fftSize = nextPowerOf2(N);

    // FFT of degraded signal
    const G = fft(zeroPad(degraded, fftSize));

    // FFT of kernel
    const H = fft(zeroPad(kernel, fftSize));

    reportProgress(40);

    // Inverse filter: F = G / H
    const F = new Array(fftSize);
    const epsilon = 1e-10; // Prevent division by zero

    for (let i = 0; i < fftSize; i++) {
        const magH = H[i].re * H[i].re + H[i].im * H[i].im;

        if (magH < epsilon) {
            // Near-zero: just use G
            F[i] = { re: G[i].re, im: G[i].im };
        } else {
            // F = G / H = G * conj(H) / |H|^2
            F[i] = {
                re: (G[i].re * H[i].re + G[i].im * H[i].im) / magH,
                im: (G[i].im * H[i].re - G[i].re * H[i].im) / magH
            };
        }
    }

    reportProgress(50);

    // Inverse FFT
    const result = ifft(F);
    return result.map(c => c.re);
}

function wienerFilter(degraded, kernel, K) {
    const N = degraded.length;
    const fftSize = nextPowerOf2(N);

    // FFT of degraded signal
    const G = fft(zeroPad(degraded, fftSize));

    // FFT of kernel
    const H = fft(zeroPad(kernel, fftSize));

    reportProgress(40);

    // Wiener filter: F = G * conj(H) / (|H|^2 + K)
    const F = new Array(fftSize);

    for (let i = 0; i < fftSize; i++) {
        const magHSquared = H[i].re * H[i].re + H[i].im * H[i].im;
        const denominator = magHSquared + K;

        // conj(H) = (re, -im)
        F[i] = {
            re: (G[i].re * H[i].re + G[i].im * H[i].im) / denominator,
            im: (G[i].im * H[i].re - G[i].re * H[i].im) / denominator
        };
    }

    reportProgress(50);

    // Inverse FFT
    const result = ifft(F);
    return result.map(c => c.re);
}

function regularizedInverse(degraded, kernel, lambda) {
    const N = degraded.length;
    const fftSize = nextPowerOf2(N);

    // FFT of degraded signal
    const G = fft(zeroPad(degraded, fftSize));

    // FFT of kernel
    const H = fft(zeroPad(kernel, fftSize));

    reportProgress(40);

    // Create Laplacian regularization in frequency domain
    // Simple approach: penalize high frequencies
    const F = new Array(fftSize);

    for (let i = 0; i < fftSize; i++) {
        const magHSquared = H[i].re * H[i].re + H[i].im * H[i].im;

        // Frequency-dependent regularization
        const freq = i < fftSize / 2 ? i : fftSize - i;
        const freqPenalty = lambda * (freq / fftSize) * (freq / fftSize);

        const denominator = magHSquared + freqPenalty + 1e-10;

        F[i] = {
            re: (G[i].re * H[i].re + G[i].im * H[i].im) / denominator,
            im: (G[i].im * H[i].re - G[i].re * H[i].im) / denominator
        };
    }

    reportProgress(50);

    const result = ifft(F);
    return result.map(c => c.re);
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

function fft(signal) {
    const N = signal.length;

    if (N === 1) {
        return [{ re: signal[0].re, im: signal[0].im }];
    }

    if ((N & (N - 1)) !== 0) {
        throw new Error('FFT size must be power of 2');
    }

    const even = new Array(N / 2);
    const odd = new Array(N / 2);

    for (let i = 0; i < N / 2; i++) {
        even[i] = signal[2 * i];
        odd[i] = signal[2 * i + 1];
    }

    const evenFFT = fft(even);
    const oddFFT = fft(odd);

    const result = new Array(N);
    for (let k = 0; k < N / 2; k++) {
        const angle = -2 * Math.PI * k / N;
        const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };
        const t = {
            re: twiddle.re * oddFFT[k].re - twiddle.im * oddFFT[k].im,
            im: twiddle.re * oddFFT[k].im + twiddle.im * oddFFT[k].re
        };

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

    const conjugated = spectrum.map(c => ({ re: c.re, im: -c.im }));
    const transformed = fft(conjugated);

    return transformed.map(c => ({
        re: c.re / N,
        im: -c.im / N
    }));
}

function computeSpectrum(signal, padTo) {
    const N = padTo || signal.length;
    const fftSize = nextPowerOf2(N);

    const padded = zeroPad(signal, fftSize);
    const spectrum = fft(padded);

    const halfN = fftSize / 2;
    const magnitude = new Array(halfN);
    for (let i = 0; i < halfN; i++) {
        magnitude[i] = Math.sqrt(spectrum[i].re ** 2 + spectrum[i].im ** 2);
    }

    return magnitude;
}

function computeMetrics(original, blurred, restored) {
    const N = original.length;

    // MSE between original and blurred
    let mseBlurred = 0;
    for (let i = 0; i < N; i++) {
        const diff = original[i] - blurred[i];
        mseBlurred += diff * diff;
    }
    mseBlurred /= N;

    // MSE between original and restored
    let mseRestored = 0;
    for (let i = 0; i < N; i++) {
        const diff = original[i] - restored[i];
        mseRestored += diff * diff;
    }
    mseRestored /= N;

    // PSNR
    const maxVal = Math.max(...original.map(Math.abs));
    const psnrBlurred = mseBlurred > 0 ? 10 * Math.log10(maxVal * maxVal / mseBlurred) : Infinity;
    const psnrRestored = mseRestored > 0 ? 10 * Math.log10(maxVal * maxVal / mseRestored) : Infinity;

    // Improvement
    const improvement = psnrRestored - psnrBlurred;

    // Correlation coefficient
    const meanOrig = original.reduce((a, b) => a + b, 0) / N;
    const meanRest = restored.reduce((a, b) => a + b, 0) / N;

    let numerator = 0;
    let denomOrig = 0;
    let denomRest = 0;

    for (let i = 0; i < N; i++) {
        const diffOrig = original[i] - meanOrig;
        const diffRest = restored[i] - meanRest;
        numerator += diffOrig * diffRest;
        denomOrig += diffOrig * diffOrig;
        denomRest += diffRest * diffRest;
    }

    const correlation = numerator / Math.sqrt(denomOrig * denomRest);

    return {
        mseBlurred,
        mseRestored,
        psnrBlurred,
        psnrRestored,
        improvement,
        correlation
    };
}
