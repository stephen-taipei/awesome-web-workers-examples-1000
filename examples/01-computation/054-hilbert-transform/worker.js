/**
 * Web Worker: Hilbert Transform
 * Computes analytic signal, instantaneous amplitude, phase, and frequency
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'hilbert':
                result = computeHilbertTransform(data.signal);
                break;
            case 'envelope':
                result = computeEnvelope(data.signal);
                break;
            case 'instantaneous':
                result = computeInstantaneousParameters(data.signal, data.sampleRate);
                break;
            case 'hht':
                result = computeHHT(data.signal, data.sampleRate);
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
 * Compute Hilbert Transform using FFT-based method
 */
function computeHilbertTransform(signal) {
    const n = signal.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Pad to power of 2 for efficient FFT
    const nfft = nextPowerOf2(n);
    const padded = new Array(nfft).fill(0);
    for (let i = 0; i < n; i++) {
        padded[i] = signal[i];
    }

    // Compute FFT
    const fftResult = fft(padded);

    self.postMessage({ type: 'progress', percentage: 40 });

    // Create Hilbert transform multiplier
    // H(f) = -j*sign(f) in frequency domain
    const h = new Array(nfft);
    h[0] = { re: 1, im: 0 };

    for (let i = 1; i < nfft / 2; i++) {
        h[i] = { re: 2, im: 0 };
    }

    h[nfft / 2] = { re: 1, im: 0 };

    for (let i = nfft / 2 + 1; i < nfft; i++) {
        h[i] = { re: 0, im: 0 };
    }

    // Multiply FFT result by h
    const analyticFFT = fftResult.map((val, i) => ({
        re: val.re * h[i].re - val.im * h[i].im,
        im: val.re * h[i].im + val.im * h[i].re
    }));

    self.postMessage({ type: 'progress', percentage: 70 });

    // Inverse FFT to get analytic signal
    const analyticSignal = ifft(analyticFFT);

    // Extract real (original) and imaginary (Hilbert transform) parts
    const hilbertTransform = analyticSignal.slice(0, n).map(c => c.im);
    const realPart = analyticSignal.slice(0, n).map(c => c.re);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Hilbert Transform',
        original: signal,
        hilbert: hilbertTransform,
        reconstructed: realPart,
        length: n,
        stats: {
            originalRMS: computeRMS(signal).toFixed(4),
            hilbertRMS: computeRMS(hilbertTransform).toFixed(4),
            correlation: computeCorrelation(signal, hilbertTransform).toFixed(4)
        }
    };
}

/**
 * Compute signal envelope (instantaneous amplitude)
 */
function computeEnvelope(signal) {
    const n = signal.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Get Hilbert transform
    const hilbert = computeHilbertTransform(signal);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Compute envelope: |analytic signal| = sqrt(x² + H(x)²)
    const envelope = signal.map((x, i) =>
        Math.sqrt(x * x + hilbert.hilbert[i] * hilbert.hilbert[i])
    );

    // Find peaks in envelope
    const peaks = findPeaks(envelope);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Signal Envelope',
        original: signal,
        envelope: envelope,
        hilbert: hilbert.hilbert,
        peaks: peaks.slice(0, 10),
        stats: {
            meanEnvelope: (envelope.reduce((a, b) => a + b, 0) / n).toFixed(4),
            maxEnvelope: Math.max(...envelope).toFixed(4),
            minEnvelope: Math.min(...envelope).toFixed(4),
            peakCount: peaks.length
        }
    };
}

/**
 * Compute instantaneous amplitude, phase, and frequency
 */
function computeInstantaneousParameters(signal, sampleRate = 1000) {
    const n = signal.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Get Hilbert transform
    const hilbert = computeHilbertTransform(signal);

    self.postMessage({ type: 'progress', percentage: 40 });

    // Instantaneous amplitude (envelope)
    const amplitude = signal.map((x, i) =>
        Math.sqrt(x * x + hilbert.hilbert[i] * hilbert.hilbert[i])
    );

    // Instantaneous phase
    const phase = signal.map((x, i) =>
        Math.atan2(hilbert.hilbert[i], x)
    );

    // Unwrap phase
    const unwrappedPhase = unwrapPhase(phase);

    self.postMessage({ type: 'progress', percentage: 70 });

    // Instantaneous frequency (derivative of phase)
    const frequency = [];
    for (let i = 1; i < n - 1; i++) {
        const dPhase = (unwrappedPhase[i + 1] - unwrappedPhase[i - 1]) / 2;
        const freq = (dPhase * sampleRate) / (2 * Math.PI);
        frequency.push(Math.abs(freq));
    }
    // Pad edges
    frequency.unshift(frequency[0]);
    frequency.push(frequency[frequency.length - 1]);

    // Smooth frequency estimate
    const smoothedFreq = movingAverage(frequency, 5);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Instantaneous Parameters',
        original: signal,
        amplitude: amplitude,
        phase: phase,
        unwrappedPhase: unwrappedPhase,
        frequency: smoothedFreq,
        sampleRate: sampleRate,
        stats: {
            meanAmplitude: (amplitude.reduce((a, b) => a + b, 0) / n).toFixed(4),
            meanFrequency: (smoothedFreq.reduce((a, b) => a + b, 0) / n).toFixed(2),
            maxFrequency: Math.max(...smoothedFreq).toFixed(2),
            minFrequency: Math.min(...smoothedFreq.filter(f => f > 0)).toFixed(2)
        }
    };
}

/**
 * Hilbert-Huang Transform (simplified EMD + Hilbert)
 */
function computeHHT(signal, sampleRate = 1000) {
    const n = signal.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Simplified EMD - extract one IMF
    const imfs = empiricalModeDecomposition(signal, 3);

    self.postMessage({ type: 'progress', percentage: 50 });

    // Compute Hilbert spectrum for each IMF
    const hilbertSpectrum = imfs.map((imf, idx) => {
        const params = computeInstantaneousParameters(imf, sampleRate);
        return {
            imfIndex: idx + 1,
            amplitude: params.amplitude,
            frequency: params.frequency,
            meanFreq: params.stats.meanFrequency,
            energy: imf.reduce((sum, v) => sum + v * v, 0)
        };
    });

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Hilbert-Huang Transform',
        original: signal,
        imfs: imfs,
        hilbertSpectrum: hilbertSpectrum,
        residue: signal.map((v, i) => v - imfs.reduce((sum, imf) => sum + imf[i], 0)),
        stats: {
            numIMFs: imfs.length,
            totalEnergy: hilbertSpectrum.reduce((sum, h) => sum + h.energy, 0).toFixed(2),
            dominantFreq: hilbertSpectrum.reduce((max, h) =>
                h.energy > max.energy ? h : max, { energy: 0 }).meanFreq
        }
    };
}

/**
 * Simplified Empirical Mode Decomposition
 */
function empiricalModeDecomposition(signal, maxIMFs = 5) {
    const imfs = [];
    let residue = [...signal];
    const n = signal.length;

    for (let i = 0; i < maxIMFs; i++) {
        const imf = extractIMF(residue);

        if (!imf || computeRMS(imf) < 0.01 * computeRMS(signal)) {
            break;
        }

        imfs.push(imf);
        residue = residue.map((v, j) => v - imf[j]);

        // Check if residue is monotonic
        if (isMonotonic(residue)) {
            break;
        }
    }

    return imfs;
}

/**
 * Extract single IMF using sifting
 */
function extractIMF(signal) {
    const n = signal.length;
    let h = [...signal];
    const maxIterations = 10;

    for (let iter = 0; iter < maxIterations; iter++) {
        // Find local maxima and minima
        const maxima = findLocalExtrema(h, 'max');
        const minima = findLocalExtrema(h, 'min');

        if (maxima.length < 2 || minima.length < 2) {
            return null;
        }

        // Interpolate envelopes
        const upperEnv = interpolateSpline(maxima, n);
        const lowerEnv = interpolateSpline(minima, n);

        // Mean envelope
        const mean = upperEnv.map((u, i) => (u + lowerEnv[i]) / 2);

        // Subtract mean
        h = h.map((v, i) => v - mean[i]);

        // Check stopping criterion (SD < 0.3)
        const sd = computeSD(h, signal);
        if (sd < 0.3) {
            break;
        }
    }

    return h;
}

/**
 * FFT implementation (Cooley-Tukey)
 */
function fft(signal) {
    const n = signal.length;

    if (n === 1) {
        return [{ re: signal[0], im: 0 }];
    }

    // Split into even and odd
    const even = [];
    const odd = [];
    for (let i = 0; i < n; i += 2) {
        even.push(signal[i]);
        odd.push(signal[i + 1]);
    }

    const fftEven = fft(even);
    const fftOdd = fft(odd);

    const result = new Array(n);
    for (let k = 0; k < n / 2; k++) {
        const angle = -2 * Math.PI * k / n;
        const w = { re: Math.cos(angle), im: Math.sin(angle) };

        const t = {
            re: w.re * fftOdd[k].re - w.im * fftOdd[k].im,
            im: w.re * fftOdd[k].im + w.im * fftOdd[k].re
        };

        result[k] = {
            re: fftEven[k].re + t.re,
            im: fftEven[k].im + t.im
        };
        result[k + n / 2] = {
            re: fftEven[k].re - t.re,
            im: fftEven[k].im - t.im
        };
    }

    return result;
}

/**
 * Inverse FFT
 */
function ifft(spectrum) {
    const n = spectrum.length;

    // Conjugate
    const conjugate = spectrum.map(c => ({ re: c.re, im: -c.im }));

    // Forward FFT
    const fftResult = fftComplex(conjugate);

    // Conjugate and scale
    return fftResult.map(c => ({
        re: c.re / n,
        im: -c.im / n
    }));
}

/**
 * FFT for complex input
 */
function fftComplex(signal) {
    const n = signal.length;

    if (n === 1) {
        return [{ re: signal[0].re, im: signal[0].im }];
    }

    const even = [];
    const odd = [];
    for (let i = 0; i < n; i += 2) {
        even.push(signal[i]);
        odd.push(signal[i + 1]);
    }

    const fftEven = fftComplex(even);
    const fftOdd = fftComplex(odd);

    const result = new Array(n);
    for (let k = 0; k < n / 2; k++) {
        const angle = -2 * Math.PI * k / n;
        const w = { re: Math.cos(angle), im: Math.sin(angle) };

        const t = {
            re: w.re * fftOdd[k].re - w.im * fftOdd[k].im,
            im: w.re * fftOdd[k].im + w.im * fftOdd[k].re
        };

        result[k] = {
            re: fftEven[k].re + t.re,
            im: fftEven[k].im + t.im
        };
        result[k + n / 2] = {
            re: fftEven[k].re - t.re,
            im: fftEven[k].im - t.im
        };
    }

    return result;
}

/**
 * Helper functions
 */
function nextPowerOf2(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

function computeRMS(arr) {
    return Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0) / arr.length);
}

function computeCorrelation(x, y) {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }

    return num / Math.sqrt(denX * denY);
}

function findPeaks(arr) {
    const peaks = [];
    for (let i = 1; i < arr.length - 1; i++) {
        if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) {
            peaks.push({ index: i, value: arr[i] });
        }
    }
    peaks.sort((a, b) => b.value - a.value);
    return peaks;
}

function unwrapPhase(phase) {
    const unwrapped = [phase[0]];
    for (let i = 1; i < phase.length; i++) {
        let diff = phase[i] - phase[i - 1];
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        unwrapped.push(unwrapped[i - 1] + diff);
    }
    return unwrapped;
}

function movingAverage(arr, window) {
    const result = [];
    const half = Math.floor(window / 2);
    for (let i = 0; i < arr.length; i++) {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - half); j <= Math.min(arr.length - 1, i + half); j++) {
            sum += arr[j];
            count++;
        }
        result.push(sum / count);
    }
    return result;
}

function findLocalExtrema(signal, type) {
    const extrema = [];
    const n = signal.length;

    // Add endpoints
    extrema.push({ x: 0, y: signal[0] });

    for (let i = 1; i < n - 1; i++) {
        if (type === 'max') {
            if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
                extrema.push({ x: i, y: signal[i] });
            }
        } else {
            if (signal[i] < signal[i - 1] && signal[i] < signal[i + 1]) {
                extrema.push({ x: i, y: signal[i] });
            }
        }
    }

    extrema.push({ x: n - 1, y: signal[n - 1] });
    return extrema;
}

function interpolateSpline(points, n) {
    // Simple linear interpolation
    const result = new Array(n);
    let j = 0;

    for (let i = 0; i < n; i++) {
        while (j < points.length - 1 && points[j + 1].x <= i) {
            j++;
        }

        if (j >= points.length - 1) {
            result[i] = points[points.length - 1].y;
        } else {
            const t = (i - points[j].x) / (points[j + 1].x - points[j].x);
            result[i] = points[j].y + t * (points[j + 1].y - points[j].y);
        }
    }

    return result;
}

function computeSD(h, prev) {
    let num = 0, den = 0;
    for (let i = 0; i < h.length; i++) {
        const diff = h[i] - prev[i];
        num += diff * diff;
        den += prev[i] * prev[i];
    }
    return den > 0 ? num / den : 0;
}

function isMonotonic(arr) {
    let increasing = true, decreasing = true;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < arr[i - 1]) increasing = false;
        if (arr[i] > arr[i - 1]) decreasing = false;
    }
    return increasing || decreasing;
}
