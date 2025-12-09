/**
 * Web Worker for Discrete Fourier Transform
 * Direct DFT computation (O(N²) complexity)
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { signal, viewFreq } = data;
        const N = signal.length;

        if (N < 2) {
            throw new Error('Signal must have at least 2 samples');
        }

        reportProgress(5);

        // Compute DFT
        const dft = computeDFT(signal);

        reportProgress(70);

        // Compute magnitude and phase
        const spectrum = dft.map((X, k) => ({
            k,
            real: X.real,
            imag: X.imag,
            magnitude: Math.sqrt(X.real * X.real + X.imag * X.imag),
            phase: Math.atan2(X.imag, X.real),
            phaseDegrees: Math.atan2(X.imag, X.real) * 180 / Math.PI,
            normalizedMagnitude: Math.sqrt(X.real * X.real + X.imag * X.imag) / N
        }));

        reportProgress(80);

        // Find dominant frequencies
        const sortedByMagnitude = [...spectrum].sort((a, b) => b.magnitude - a.magnitude);
        const dominantFreqs = sortedByMagnitude.slice(0, Math.min(5, N / 2));

        // Compute energy (Parseval's theorem)
        const timeEnergy = signal.reduce((sum, x) => sum + x * x, 0);
        const freqEnergy = spectrum.reduce((sum, X) => sum + X.magnitude * X.magnitude, 0) / N;

        // Get detailed view of selected frequency
        const viewBin = Math.min(viewFreq, N - 1);
        const detailedView = computeDetailedBin(signal, viewBin);

        reportProgress(90);

        // Verify inverse DFT
        const reconstructed = computeIDFT(dft);
        const reconstructionError = signal.map((x, n) =>
            Math.abs(x - reconstructed[n])
        ).reduce((max, err) => Math.max(max, err), 0);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                signal,
                N,
                spectrum,
                dominantFreqs,
                timeEnergy,
                freqEnergy,
                viewBin,
                detailedView,
                reconstructionError,
                reconstructed
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

function computeDFT(x) {
    const N = x.length;
    const X = [];

    for (let k = 0; k < N; k++) {
        let real = 0;
        let imag = 0;

        for (let n = 0; n < N; n++) {
            const angle = (2 * Math.PI * k * n) / N;
            real += x[n] * Math.cos(angle);
            imag -= x[n] * Math.sin(angle);
        }

        X.push({ real, imag });

        if (k % 10 === 0) {
            reportProgress(5 + Math.round(60 * k / N));
        }
    }

    return X;
}

function computeIDFT(X) {
    const N = X.length;
    const x = [];

    for (let n = 0; n < N; n++) {
        let real = 0;

        for (let k = 0; k < N; k++) {
            const angle = (2 * Math.PI * k * n) / N;
            // IDFT: (1/N) * Σ X[k] * e^(i*2πkn/N)
            real += X[k].real * Math.cos(angle) - X[k].imag * Math.sin(angle);
        }

        x.push(real / N);
    }

    return x;
}

function computeDetailedBin(x, k) {
    const N = x.length;
    const terms = [];

    let realSum = 0;
    let imagSum = 0;

    for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        const cosVal = Math.cos(angle);
        const sinVal = Math.sin(angle);
        const realContrib = x[n] * cosVal;
        const imagContrib = -x[n] * sinVal;

        realSum += realContrib;
        imagSum += imagContrib;

        terms.push({
            n,
            xn: x[n],
            angle,
            angleDegrees: (angle * 180 / Math.PI) % 360,
            cosVal,
            sinVal,
            realContrib,
            imagContrib
        });
    }

    return {
        k,
        terms: terms.slice(0, 16), // Limit for display
        totalTerms: N,
        real: realSum,
        imag: imagSum,
        magnitude: Math.sqrt(realSum * realSum + imagSum * imagSum),
        phase: Math.atan2(imagSum, realSum),
        phaseDegrees: Math.atan2(imagSum, realSum) * 180 / Math.PI
    };
}
