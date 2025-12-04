/**
 * Web Worker for Inverse Fast Fourier Transform
 * Reconstruct time-domain signals from frequency spectra
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { spectrum, N, sampleRate } = data;

        // Verify N is power of 2
        if ((N & (N - 1)) !== 0) {
            throw new Error('Sample size must be a power of 2');
        }

        reportProgress(5);

        // Convert spectrum to complex arrays
        const real = new Float64Array(N);
        const imag = new Float64Array(N);

        // Fill in the spectrum (ensure conjugate symmetry for real output)
        spectrum.forEach(component => {
            const k = component.bin;
            if (k >= 0 && k < N) {
                real[k] = component.magnitude * Math.cos(component.phase);
                imag[k] = component.magnitude * Math.sin(component.phase);

                // Conjugate symmetry for real signal
                if (k > 0 && k < N / 2) {
                    real[N - k] = real[k];
                    imag[N - k] = -imag[k];
                }
            }
        });

        reportProgress(20);

        // Store original spectrum for display
        const originalSpectrum = [];
        for (let k = 0; k < N; k++) {
            const magnitude = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
            const phase = Math.atan2(imag[k], real[k]);
            originalSpectrum.push({
                k,
                frequency: k * sampleRate / N,
                real: real[k],
                imag: imag[k],
                magnitude,
                phase,
                phaseDegrees: phase * 180 / Math.PI
            });
        }

        // Perform IFFT
        const ifftStartTime = performance.now();
        ifft(real, imag, N);
        const ifftTime = performance.now() - ifftStartTime;

        reportProgress(70);

        // Extract reconstructed signal (should be real)
        const signal = Array.from(real);
        const imaginaryResidual = imag.reduce((sum, x) => sum + x * x, 0);

        // Verify by doing FFT again
        const verifyReal = new Float64Array(signal);
        const verifyImag = new Float64Array(N);
        fft(verifyReal, verifyImag, N);

        const verifySpectrum = [];
        for (let k = 0; k < N / 2 + 1; k++) {
            verifySpectrum.push({
                k,
                magnitude: Math.sqrt(verifyReal[k] * verifyReal[k] + verifyImag[k] * verifyImag[k])
            });
        }

        reportProgress(90);

        // Signal statistics
        const signalStats = computeSignalStats(signal);

        // Compute expected frequencies from spectrum
        const expectedFreqs = spectrum
            .filter(s => s.magnitude > 0.01)
            .map(s => ({
                bin: s.bin,
                frequency: s.bin * sampleRate / N,
                magnitude: s.magnitude,
                expectedAmplitude: 2 * s.magnitude / N // For real signal
            }));

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                signal,
                N,
                sampleRate,
                originalSpectrum,
                verifySpectrum,
                ifftTime: ifftTime.toFixed(3),
                imaginaryResidual,
                signalStats,
                expectedFreqs
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

function ifft(real, imag, N) {
    // IFFT = (1/N) * conj(FFT(conj(X)))
    // Or equivalently: conjugate input, FFT, conjugate output, divide by N

    // Conjugate input
    for (let i = 0; i < N; i++) {
        imag[i] = -imag[i];
    }

    // Perform FFT
    fft(real, imag, N);

    // Conjugate output and divide by N
    for (let i = 0; i < N; i++) {
        real[i] = real[i] / N;
        imag[i] = -imag[i] / N;
    }
}

function fft(real, imag, N) {
    // Bit-reversal permutation
    const bits = Math.log2(N);
    for (let i = 0; i < N; i++) {
        const j = reverseBits(i, bits);
        if (j > i) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    // Cooley-Tukey iterative FFT
    for (let size = 2; size <= N; size *= 2) {
        const halfSize = size / 2;
        const angle = -2 * Math.PI / size;

        for (let i = 0; i < N; i += size) {
            for (let j = 0; j < halfSize; j++) {
                const theta = angle * j;
                const wr = Math.cos(theta);
                const wi = Math.sin(theta);

                const idx1 = i + j;
                const idx2 = i + j + halfSize;

                const tr = wr * real[idx2] - wi * imag[idx2];
                const ti = wr * imag[idx2] + wi * real[idx2];

                real[idx2] = real[idx1] - tr;
                imag[idx2] = imag[idx1] - ti;
                real[idx1] = real[idx1] + tr;
                imag[idx1] = imag[idx1] + ti;
            }
        }

        if (size % 64 === 0) {
            reportProgress(20 + Math.round(45 * Math.log2(size) / Math.log2(N)));
        }
    }
}

function reverseBits(x, bits) {
    let result = 0;
    for (let i = 0; i < bits; i++) {
        result = (result << 1) | (x & 1);
        x >>= 1;
    }
    return result;
}

function computeSignalStats(signal) {
    const N = signal.length;

    // Mean
    const mean = signal.reduce((s, x) => s + x, 0) / N;

    // RMS
    const rms = Math.sqrt(signal.reduce((s, x) => s + x * x, 0) / N);

    // Peak
    const peak = Math.max(...signal.map(Math.abs));

    // Min/Max
    const min = Math.min(...signal);
    const max = Math.max(...signal);

    // Energy
    const energy = signal.reduce((s, x) => s + x * x, 0);

    return { mean, rms, peak, min, max, energy };
}
