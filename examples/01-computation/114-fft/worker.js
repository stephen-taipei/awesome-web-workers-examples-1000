/**
 * Web Worker for Fast Fourier Transform
 * Cooley-Tukey radix-2 decimation-in-time FFT algorithm
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { signal, sampleRate } = data;
        const N = signal.length;

        // Verify N is power of 2
        if ((N & (N - 1)) !== 0) {
            throw new Error('Signal length must be a power of 2');
        }

        reportProgress(5);

        // Convert to complex array
        const real = new Float64Array(signal);
        const imag = new Float64Array(N);

        // Perform FFT
        const fftStartTime = performance.now();
        fft(real, imag, N);
        const fftTime = performance.now() - fftStartTime;

        reportProgress(60);

        // Compute magnitude spectrum
        const spectrum = [];
        const freqResolution = sampleRate / N;

        for (let k = 0; k < N; k++) {
            const magnitude = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
            const phase = Math.atan2(imag[k], real[k]);
            const frequency = k * freqResolution;

            spectrum.push({
                k,
                frequency,
                real: real[k],
                imag: imag[k],
                magnitude,
                magnitudeDB: 20 * Math.log10(magnitude / N + 1e-10),
                phase,
                phaseDegrees: phase * 180 / Math.PI
            });
        }

        reportProgress(80);

        // Find peaks (only in first half due to symmetry)
        const peaks = findPeaks(spectrum.slice(0, N / 2), N);

        // Compute theoretical complexity comparison
        const dftOps = N * N;
        const fftOps = N * Math.log2(N);
        const speedup = dftOps / fftOps;

        // Energy
        const timeEnergy = signal.reduce((sum, x) => sum + x * x, 0);
        const freqEnergy = spectrum.reduce((sum, s) => sum + s.magnitude * s.magnitude, 0) / N;

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                signal: signal.slice(0, 100), // First 100 samples for display
                N,
                sampleRate,
                freqResolution,
                spectrum,
                peaks,
                fftTime: fftTime.toFixed(3),
                dftOps,
                fftOps: Math.round(fftOps),
                speedup: speedup.toFixed(1),
                timeEnergy,
                freqEnergy
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
        const tableStep = N / size;

        // Precompute twiddle factors for this stage
        const angle = -2 * Math.PI / size;

        for (let i = 0; i < N; i += size) {
            for (let j = 0; j < halfSize; j++) {
                const theta = angle * j;
                const wr = Math.cos(theta);
                const wi = Math.sin(theta);

                const idx1 = i + j;
                const idx2 = i + j + halfSize;

                // Butterfly operation
                const tr = wr * real[idx2] - wi * imag[idx2];
                const ti = wr * imag[idx2] + wi * real[idx2];

                real[idx2] = real[idx1] - tr;
                imag[idx2] = imag[idx1] - ti;
                real[idx1] = real[idx1] + tr;
                imag[idx1] = imag[idx1] + ti;
            }
        }

        if (size % 1024 === 0) {
            reportProgress(5 + Math.round(50 * Math.log2(size) / Math.log2(N)));
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

function findPeaks(spectrum, N) {
    // Find local maxima that are significant
    const peaks = [];
    const threshold = Math.max(...spectrum.map(s => s.magnitude)) * 0.1;

    for (let i = 1; i < spectrum.length - 1; i++) {
        if (spectrum[i].magnitude > threshold &&
            spectrum[i].magnitude > spectrum[i - 1].magnitude &&
            spectrum[i].magnitude > spectrum[i + 1].magnitude) {
            peaks.push({
                bin: spectrum[i].k,
                frequency: spectrum[i].frequency,
                magnitude: spectrum[i].magnitude,
                magnitudeNorm: spectrum[i].magnitude / (N / 2),
                phase: spectrum[i].phaseDegrees
            });
        }
    }

    // Sort by magnitude and return top peaks
    return peaks.sort((a, b) => b.magnitude - a.magnitude).slice(0, 10);
}
