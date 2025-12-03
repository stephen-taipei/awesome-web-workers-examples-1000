/**
 * Web Worker: Fourier Analysis
 * Implements DFT, FFT, and spectral analysis
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'dft':
                result = computeDFT(data.signal);
                break;
            case 'fft':
                result = computeFFT(data.signal);
                break;
            case 'ifft':
                result = computeIFFT(data.spectrum);
                break;
            case 'spectrum':
                result = analyzeSpectrum(data.signal, data.sampleRate);
                break;
            case 'filter':
                result = applyFilter(data.signal, data.filterType, data.cutoff, data.sampleRate);
                break;
            case 'generate':
                result = generateAndAnalyze(data.frequencies, data.amplitudes, data.sampleRate, data.duration);
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
 * Discrete Fourier Transform (DFT) - O(n²)
 */
function computeDFT(signal) {
    const N = signal.length;
    const real = new Array(N).fill(0);
    const imag = new Array(N).fill(0);

    for (let k = 0; k < N; k++) {
        if (k % Math.max(1, Math.floor(N / 20)) === 0) {
            self.postMessage({ type: 'progress', percentage: Math.round((k / N) * 100) });
        }

        for (let n = 0; n < N; n++) {
            const angle = -2 * Math.PI * k * n / N;
            real[k] += signal[n] * Math.cos(angle);
            imag[k] += signal[n] * Math.sin(angle);
        }
    }

    return {
        method: 'DFT',
        real,
        imag,
        magnitude: computeMagnitude(real, imag),
        phase: computePhase(real, imag),
        N
    };
}

/**
 * Fast Fourier Transform (FFT) - Cooley-Tukey O(n log n)
 */
function computeFFT(signal) {
    // Pad to power of 2
    const N = nextPowerOf2(signal.length);
    const paddedSignal = [...signal];
    while (paddedSignal.length < N) {
        paddedSignal.push(0);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Initialize complex arrays
    const real = [...paddedSignal];
    const imag = new Array(N).fill(0);

    // Bit-reversal permutation
    const bits = Math.log2(N);
    for (let i = 0; i < N; i++) {
        const j = reverseBits(i, bits);
        if (j > i) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // FFT butterfly operations
    for (let size = 2; size <= N; size *= 2) {
        const halfSize = size / 2;
        const angleStep = -2 * Math.PI / size;

        for (let i = 0; i < N; i += size) {
            for (let j = 0; j < halfSize; j++) {
                const angle = angleStep * j;
                const tReal = Math.cos(angle) * real[i + j + halfSize] - Math.sin(angle) * imag[i + j + halfSize];
                const tImag = Math.sin(angle) * real[i + j + halfSize] + Math.cos(angle) * imag[i + j + halfSize];

                real[i + j + halfSize] = real[i + j] - tReal;
                imag[i + j + halfSize] = imag[i + j] - tImag;
                real[i + j] = real[i + j] + tReal;
                imag[i + j] = imag[i + j] + tImag;
            }
        }

        self.postMessage({ type: 'progress', percentage: 30 + Math.round((Math.log2(size) / bits) * 60) });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'FFT',
        real,
        imag,
        magnitude: computeMagnitude(real, imag),
        phase: computePhase(real, imag),
        N,
        originalLength: signal.length
    };
}

/**
 * Inverse FFT
 */
function computeIFFT(spectrum) {
    const N = spectrum.real.length;

    // Conjugate the spectrum
    const conjReal = [...spectrum.real];
    const conjImag = spectrum.imag.map(v => -v);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Forward FFT on conjugate
    const signal = [...conjReal];
    const imagTemp = [...conjImag];

    // Bit-reversal permutation
    const bits = Math.log2(N);
    for (let i = 0; i < N; i++) {
        const j = reverseBits(i, bits);
        if (j > i) {
            [signal[i], signal[j]] = [signal[j], signal[i]];
            [imagTemp[i], imagTemp[j]] = [imagTemp[j], imagTemp[i]];
        }
    }

    // FFT butterfly operations
    for (let size = 2; size <= N; size *= 2) {
        const halfSize = size / 2;
        const angleStep = -2 * Math.PI / size;

        for (let i = 0; i < N; i += size) {
            for (let j = 0; j < halfSize; j++) {
                const angle = angleStep * j;
                const tReal = Math.cos(angle) * signal[i + j + halfSize] - Math.sin(angle) * imagTemp[i + j + halfSize];
                const tImag = Math.sin(angle) * signal[i + j + halfSize] + Math.cos(angle) * imagTemp[i + j + halfSize];

                signal[i + j + halfSize] = signal[i + j] - tReal;
                imagTemp[i + j + halfSize] = imagTemp[i + j] - tImag;
                signal[i + j] = signal[i + j] + tReal;
                imagTemp[i + j] = imagTemp[i + j] + tImag;
            }
        }
    }

    self.postMessage({ type: 'progress', percentage: 80 });

    // Conjugate and scale
    const reconstructed = signal.map(v => v / N);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'IFFT',
        signal: reconstructed,
        N
    };
}

/**
 * Spectral Analysis
 */
function analyzeSpectrum(signal, sampleRate) {
    const fftResult = computeFFT(signal);
    const N = fftResult.N;
    const halfN = Math.floor(N / 2);

    // Frequency bins
    const frequencies = [];
    const powerSpectrum = [];

    for (let k = 0; k < halfN; k++) {
        const freq = k * sampleRate / N;
        frequencies.push(freq);

        // Power = |X(k)|² / N
        const power = (fftResult.magnitude[k] ** 2) / N;
        powerSpectrum.push(power);
    }

    // Find dominant frequencies
    const peaks = findPeaks(powerSpectrum, frequencies);

    // Calculate spectral statistics
    const totalPower = powerSpectrum.reduce((a, b) => a + b, 0);
    const spectralCentroid = frequencies.reduce((sum, f, i) => sum + f * powerSpectrum[i], 0) / totalPower;

    // Spectral bandwidth
    const spectralBandwidth = Math.sqrt(
        frequencies.reduce((sum, f, i) => sum + ((f - spectralCentroid) ** 2) * powerSpectrum[i], 0) / totalPower
    );

    return {
        frequencies,
        powerSpectrum,
        magnitude: fftResult.magnitude.slice(0, halfN),
        phase: fftResult.phase.slice(0, halfN),
        dominantFrequencies: peaks,
        spectralCentroid,
        spectralBandwidth,
        totalPower,
        N,
        sampleRate,
        frequencyResolution: sampleRate / N
    };
}

/**
 * Apply frequency domain filter
 */
function applyFilter(signal, filterType, cutoff, sampleRate) {
    self.postMessage({ type: 'progress', percentage: 10 });

    // Compute FFT
    const fftResult = computeFFT(signal);
    const N = fftResult.N;

    self.postMessage({ type: 'progress', percentage: 40 });

    // Apply filter in frequency domain
    const filteredReal = [...fftResult.real];
    const filteredImag = [...fftResult.imag];

    const cutoffBin = Math.round(cutoff * N / sampleRate);

    for (let k = 0; k < N; k++) {
        const kMirror = N - k;
        let gain = 1;

        if (filterType === 'lowpass') {
            gain = (k <= cutoffBin || k >= N - cutoffBin) ? 1 : 0;
        } else if (filterType === 'highpass') {
            gain = (k > cutoffBin && k < N - cutoffBin) ? 1 : 0;
        } else if (filterType === 'bandpass') {
            const lowCutoff = cutoff[0] * N / sampleRate;
            const highCutoff = cutoff[1] * N / sampleRate;
            gain = (k >= lowCutoff && k <= highCutoff) || (k >= N - highCutoff && k <= N - lowCutoff) ? 1 : 0;
        }

        filteredReal[k] *= gain;
        filteredImag[k] *= gain;
    }

    self.postMessage({ type: 'progress', percentage: 60 });

    // Inverse FFT
    const ifftResult = computeIFFT({ real: filteredReal, imag: filteredImag });

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        filterType,
        cutoffFrequency: cutoff,
        originalSignal: signal,
        filteredSignal: ifftResult.signal.slice(0, signal.length),
        removedComponents: signal.map((v, i) => v - ifftResult.signal[i])
    };
}

/**
 * Generate composite signal and analyze
 */
function generateAndAnalyze(frequencies, amplitudes, sampleRate, duration) {
    const N = Math.floor(sampleRate * duration);
    const signal = new Array(N).fill(0);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Generate composite signal
    for (let i = 0; i < N; i++) {
        const t = i / sampleRate;
        for (let j = 0; j < frequencies.length; j++) {
            signal[i] += amplitudes[j] * Math.sin(2 * Math.PI * frequencies[j] * t);
        }

        if (i % Math.floor(N / 10) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / N) * 20) });
        }
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Analyze spectrum
    const spectrum = analyzeSpectrum(signal, sampleRate);

    return {
        generated: true,
        inputFrequencies: frequencies,
        inputAmplitudes: amplitudes,
        sampleRate,
        duration,
        signal,
        ...spectrum
    };
}

/**
 * Helper: Compute magnitude from complex values
 */
function computeMagnitude(real, imag) {
    return real.map((r, i) => Math.sqrt(r * r + imag[i] * imag[i]));
}

/**
 * Helper: Compute phase from complex values
 */
function computePhase(real, imag) {
    return real.map((r, i) => Math.atan2(imag[i], r));
}

/**
 * Helper: Next power of 2
 */
function nextPowerOf2(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Helper: Reverse bits for FFT
 */
function reverseBits(n, bits) {
    let reversed = 0;
    for (let i = 0; i < bits; i++) {
        reversed = (reversed << 1) | (n & 1);
        n >>= 1;
    }
    return reversed;
}

/**
 * Helper: Find peaks in spectrum
 */
function findPeaks(powerSpectrum, frequencies) {
    const peaks = [];
    const threshold = Math.max(...powerSpectrum) * 0.1; // 10% of max

    for (let i = 1; i < powerSpectrum.length - 1; i++) {
        if (powerSpectrum[i] > threshold &&
            powerSpectrum[i] > powerSpectrum[i - 1] &&
            powerSpectrum[i] > powerSpectrum[i + 1]) {
            peaks.push({
                frequency: frequencies[i],
                power: powerSpectrum[i],
                bin: i
            });
        }
    }

    // Sort by power descending
    peaks.sort((a, b) => b.power - a.power);

    return peaks.slice(0, 10); // Top 10 peaks
}
