/**
 * Web Worker for Cross-Correlation
 * Implements FFT-based correlation for signal analysis
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { signal1, signal2, correlationType } = data;
        const N = signal1.length;

        reportProgress(10);

        let correlation;
        let peakLag;
        let peakValue;
        let normalizedCorr = null;

        switch (correlationType) {
            case 'cross':
                correlation = fftCorrelate(signal1, signal2);
                break;
            case 'auto':
                correlation = fftCorrelate(signal1, signal1);
                break;
            case 'normalized':
                correlation = normalizedCorrelate(signal1, signal2);
                normalizedCorr = true;
                break;
        }

        reportProgress(60);

        // Find peak correlation
        const peak = findPeak(correlation, correlationType === 'auto');
        peakLag = peak.lag;
        peakValue = peak.value;

        // Compute signal statistics
        const stats = computeStats(signal1, signal2, correlation, peakLag, peakValue);

        reportProgress(90);

        // Compute spectra for visualization
        const spectrum1 = computeSpectrum(signal1);
        const spectrum2 = computeSpectrum(signal2);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                signal1,
                signal2,
                correlation,
                N,
                correlationType,
                peakLag,
                peakValue,
                stats,
                spectrum1,
                spectrum2,
                normalizedCorr
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

function fftCorrelate(x, y) {
    const N = x.length;
    const M = y.length;
    const outputLength = N + M - 1;

    // Find next power of 2
    const fftSize = nextPowerOf2(outputLength);

    // Zero-pad both signals
    const paddedX = zeroPad(x, fftSize);
    const paddedY = zeroPad(y, fftSize);

    // FFT both signals
    const X = fft(paddedX);
    const Y = fft(paddedY);

    reportProgress(30);

    // Multiply X* (conjugate) with Y
    const product = new Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
        // X* · Y = (Re(X) - j·Im(X)) · (Re(Y) + j·Im(Y))
        product[i] = {
            re: X[i].re * Y[i].re + X[i].im * Y[i].im,
            im: X[i].re * Y[i].im - X[i].im * Y[i].re
        };
    }

    reportProgress(40);

    // Inverse FFT
    const resultComplex = ifft(product);

    reportProgress(50);

    // Extract real part and rearrange for proper lag representation
    // Result should have lags from -(N-1) to (M-1)
    const result = new Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        result[i] = resultComplex[i].re;
    }

    return result;
}

function normalizedCorrelate(x, y) {
    const correlation = fftCorrelate(x, y);

    // Compute normalization factors
    const xEnergy = x.reduce((sum, v) => sum + v * v, 0);
    const yEnergy = y.reduce((sum, v) => sum + v * v, 0);
    const normFactor = Math.sqrt(xEnergy * yEnergy);

    if (normFactor === 0) return correlation;

    // Normalize
    return correlation.map(c => c / normFactor);
}

function findPeak(correlation, isAuto) {
    const N = correlation.length;
    const center = Math.floor(N / 2);

    let maxVal = -Infinity;
    let maxIdx = 0;

    // For auto-correlation, skip the zero-lag peak (always maximum)
    const startIdx = isAuto ? 1 : 0;

    for (let i = startIdx; i < N; i++) {
        if (Math.abs(correlation[i]) > Math.abs(maxVal)) {
            maxVal = correlation[i];
            maxIdx = i;
        }
    }

    // Convert index to lag
    // For correlation of length N+M-1, lag 0 is at index N-1
    const lag = maxIdx - (Math.floor(N / 2));

    return { lag, value: maxVal, index: maxIdx };
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

function computeSpectrum(signal) {
    const N = signal.length;
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

function computeStats(signal1, signal2, correlation, peakLag, peakValue) {
    const N1 = signal1.length;
    const N2 = signal2.length;

    // Signal statistics
    const mean1 = signal1.reduce((a, b) => a + b, 0) / N1;
    const mean2 = signal2.reduce((a, b) => a + b, 0) / N2;

    const energy1 = signal1.reduce((sum, x) => sum + x * x, 0);
    const energy2 = signal2.reduce((sum, x) => sum + x * x, 0);

    const std1 = Math.sqrt(signal1.reduce((sum, x) => sum + (x - mean1) ** 2, 0) / N1);
    const std2 = Math.sqrt(signal2.reduce((sum, x) => sum + (x - mean2) ** 2, 0) / N2);

    // Correlation statistics
    const corrMax = Math.max(...correlation.map(Math.abs));
    const corrMean = correlation.reduce((a, b) => a + b, 0) / correlation.length;

    // Normalized peak correlation coefficient
    const normalizedPeak = Math.sqrt(energy1 * energy2) > 0 ?
        peakValue / Math.sqrt(energy1 * energy2) : 0;

    // Find secondary peaks
    const secondaryPeaks = findSecondaryPeaks(correlation, 5);

    // Estimate periodicity (for auto-correlation)
    const periodicity = estimatePeriodicity(correlation);

    return {
        mean1,
        mean2,
        energy1,
        energy2,
        std1,
        std2,
        corrMax,
        corrMean,
        normalizedPeak,
        secondaryPeaks,
        periodicity,
        estimatedDelay: peakLag
    };
}

function findSecondaryPeaks(correlation, count) {
    const N = correlation.length;
    const peaks = [];

    for (let i = 1; i < N - 1; i++) {
        if (Math.abs(correlation[i]) > Math.abs(correlation[i - 1]) &&
            Math.abs(correlation[i]) > Math.abs(correlation[i + 1])) {
            peaks.push({
                lag: i - Math.floor(N / 2),
                value: correlation[i]
            });
        }
    }

    // Sort by absolute value and return top peaks
    peaks.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    return peaks.slice(0, count);
}

function estimatePeriodicity(correlation) {
    const N = correlation.length;
    const center = Math.floor(N / 2);

    // Find first significant peak after center (excluding zero lag)
    let firstPeakLag = null;
    const threshold = correlation[center] * 0.5; // 50% of main peak

    for (let i = center + 2; i < N - 1; i++) {
        if (correlation[i] > correlation[i - 1] &&
            correlation[i] > correlation[i + 1] &&
            correlation[i] > threshold) {
            firstPeakLag = i - center;
            break;
        }
    }

    return firstPeakLag;
}
