/**
 * Web Worker: Z-Transform
 * Digital signal processing and discrete-time system analysis
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'numerical':
                result = computeNumericalZTransform(data.signal, data.zValues);
                break;
            case 'transferfunction':
                result = analyzeDigitalTransferFunction(data.numerator, data.denominator, data.numPoints);
                break;
            case 'impulse':
                result = computeDigitalImpulseResponse(data.numerator, data.denominator, data.numSamples);
                break;
            case 'step':
                result = computeDigitalStepResponse(data.numerator, data.denominator, data.numSamples);
                break;
            case 'poles':
                result = analyzeDigitalPoles(data.numerator, data.denominator);
                break;
            case 'filter':
                result = applyDigitalFilter(data.signal, data.numerator, data.denominator);
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
 * Numerical Z-Transform
 * X(z) = Σ x[n] × z^(-n)
 */
function computeNumericalZTransform(signal, zValues) {
    const n = signal.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    const results = [];
    const totalZ = zValues.length;

    for (let i = 0; i < totalZ; i++) {
        if (i % Math.max(1, Math.floor(totalZ / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / totalZ) * 80) });
        }

        const z = zValues[i];
        let sumReal = 0;
        let sumImag = 0;

        // Compute z^(-n) for each sample
        let zPowReal = 1;
        let zPowImag = 0;

        // z^(-1) = 1/z
        const zMagSq = z.re * z.re + z.im * z.im;
        const zInvReal = z.re / zMagSq;
        const zInvImag = -z.im / zMagSq;

        for (let k = 0; k < n; k++) {
            sumReal += signal[k] * zPowReal;
            sumImag += signal[k] * zPowImag;

            // Multiply by z^(-1)
            const newReal = zPowReal * zInvReal - zPowImag * zInvImag;
            const newImag = zPowReal * zInvImag + zPowImag * zInvReal;
            zPowReal = newReal;
            zPowImag = newImag;
        }

        results.push({
            z: z,
            value: { re: sumReal, im: sumImag },
            magnitude: Math.sqrt(sumReal * sumReal + sumImag * sumImag),
            phase: Math.atan2(sumImag, sumReal)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Numerical Z-Transform',
        signal: signal,
        zValues: zValues,
        results: results,
        stats: {
            signalLength: n,
            numZValues: totalZ
        }
    };
}

/**
 * Analyze digital transfer function H(z) = B(z)/A(z)
 * Frequency response on unit circle
 */
function analyzeDigitalTransferFunction(numerator, denominator, numPoints = 256) {
    self.postMessage({ type: 'progress', percentage: 10 });

    const freqResponse = [];

    for (let i = 0; i < numPoints; i++) {
        if (i % Math.max(1, Math.floor(numPoints / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / numPoints) * 70) });
        }

        // z = e^(jω) on unit circle, ω from 0 to π
        const omega = (i / (numPoints - 1)) * Math.PI;
        const z = { re: Math.cos(omega), im: Math.sin(omega) };

        // Evaluate H(z) = B(z)/A(z)
        const numVal = evaluatePolynomialZ(numerator, z);
        const denVal = evaluatePolynomialZ(denominator, z);

        // Complex division
        const denMagSq = denVal.re * denVal.re + denVal.im * denVal.im;
        const hReal = (numVal.re * denVal.re + numVal.im * denVal.im) / (denMagSq + 1e-15);
        const hImag = (numVal.im * denVal.re - numVal.re * denVal.im) / (denMagSq + 1e-15);

        const magnitude = Math.sqrt(hReal * hReal + hImag * hImag);
        const phase = Math.atan2(hImag, hReal);

        // Normalized frequency (0 to 0.5, where 0.5 is Nyquist)
        const normalizedFreq = omega / (2 * Math.PI);

        freqResponse.push({
            omega: omega,
            normalizedFreq: normalizedFreq,
            magnitude: magnitude,
            magnitudeDB: 20 * Math.log10(magnitude + 1e-10),
            phase: phase,
            phaseDeg: phase * 180 / Math.PI,
            groupDelay: 0 // Will compute below
        });
    }

    self.postMessage({ type: 'progress', percentage: 85 });

    // Compute group delay (negative derivative of phase)
    for (let i = 1; i < freqResponse.length - 1; i++) {
        const dPhase = freqResponse[i + 1].phase - freqResponse[i - 1].phase;
        const dOmega = freqResponse[i + 1].omega - freqResponse[i - 1].omega;

        // Unwrap phase difference
        let unwrappedDPhase = dPhase;
        while (unwrappedDPhase > Math.PI) unwrappedDPhase -= 2 * Math.PI;
        while (unwrappedDPhase < -Math.PI) unwrappedDPhase += 2 * Math.PI;

        freqResponse[i].groupDelay = -unwrappedDPhase / dOmega;
    }
    freqResponse[0].groupDelay = freqResponse[1].groupDelay;
    freqResponse[freqResponse.length - 1].groupDelay = freqResponse[freqResponse.length - 2].groupDelay;

    // Find characteristics
    const dcGain = freqResponse[0].magnitude;
    const nyquistGain = freqResponse[freqResponse.length - 1].magnitude;
    const cutoff3dB = findDigitalCutoff(freqResponse);
    const peakResponse = findPeakResponse(freqResponse);

    self.postMessage({ type: 'progress', percentage: 100 });

    // Determine filter type
    let filterType = 'Unknown';
    if (dcGain > nyquistGain * 2) filterType = 'Lowpass';
    else if (nyquistGain > dcGain * 2) filterType = 'Highpass';
    else if (peakResponse.normalizedFreq > 0.1 && peakResponse.normalizedFreq < 0.4) filterType = 'Bandpass';
    else filterType = 'Allpass/Other';

    return {
        method: 'Digital Transfer Function Analysis',
        numerator: numerator,
        denominator: denominator,
        freqResponse: freqResponse,
        characteristics: {
            dcGain: dcGain.toFixed(4),
            dcGainDB: (20 * Math.log10(dcGain + 1e-10)).toFixed(2),
            nyquistGain: nyquistGain.toFixed(4),
            cutoff3dB: cutoff3dB ? cutoff3dB.toFixed(4) : 'N/A',
            peakFreq: peakResponse.normalizedFreq.toFixed(4),
            filterType: filterType
        }
    };
}

/**
 * Compute digital impulse response h[n]
 */
function computeDigitalImpulseResponse(numerator, denominator, numSamples = 100) {
    self.postMessage({ type: 'progress', percentage: 10 });

    // Use direct form II transposed implementation
    const h = [];
    const M = numerator.length;
    const N = denominator.length;

    // State variables
    const state = new Array(Math.max(M, N)).fill(0);

    // Normalize by a[0]
    const a0 = denominator[0];
    const b = numerator.map(c => c / a0);
    const a = denominator.map(c => c / a0);

    for (let n = 0; n < numSamples; n++) {
        if (n % Math.max(1, Math.floor(numSamples / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((n / numSamples) * 80) });
        }

        // Input is δ[n] (1 at n=0, 0 elsewhere)
        const x = n === 0 ? 1 : 0;

        // Output
        let y = b[0] * x + state[0];

        // Update state
        for (let i = 0; i < state.length - 1; i++) {
            const bCoeff = i + 1 < M ? b[i + 1] : 0;
            const aCoeff = i + 1 < N ? a[i + 1] : 0;
            state[i] = bCoeff * x - aCoeff * y + state[i + 1];
        }

        h.push(y);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Analyze response
    const peakValue = Math.max(...h.map(Math.abs));
    const energy = h.reduce((sum, v) => sum + v * v, 0);
    const settlingIdx = findSettlingIndex(h);

    return {
        method: 'Digital Impulse Response',
        samples: Array.from({ length: numSamples }, (_, i) => i),
        response: h,
        stats: {
            numSamples: numSamples,
            peakValue: peakValue.toFixed(6),
            energy: energy.toFixed(6),
            settlingTime: settlingIdx !== null ? `${settlingIdx} samples` : 'N/A'
        }
    };
}

/**
 * Compute digital step response
 */
function computeDigitalStepResponse(numerator, denominator, numSamples = 100) {
    self.postMessage({ type: 'progress', percentage: 10 });

    const y = [];
    const M = numerator.length;
    const N = denominator.length;

    const state = new Array(Math.max(M, N)).fill(0);

    const a0 = denominator[0];
    const b = numerator.map(c => c / a0);
    const a = denominator.map(c => c / a0);

    for (let n = 0; n < numSamples; n++) {
        if (n % Math.max(1, Math.floor(numSamples / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((n / numSamples) * 80) });
        }

        // Step input u[n] = 1 for n >= 0
        const x = 1;

        let output = b[0] * x + state[0];

        for (let i = 0; i < state.length - 1; i++) {
            const bCoeff = i + 1 < M ? b[i + 1] : 0;
            const aCoeff = i + 1 < N ? a[i + 1] : 0;
            state[i] = bCoeff * x - aCoeff * output + state[i + 1];
        }

        y.push(output);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Analyze step response
    const finalValue = y[y.length - 1];
    const riseTime = findDigitalRiseTime(y);
    const overshoot = calculateOvershoot(y, finalValue);
    const settlingIdx = findSettlingIndex(y, finalValue);

    return {
        method: 'Digital Step Response',
        samples: Array.from({ length: numSamples }, (_, i) => i),
        response: y,
        stats: {
            finalValue: finalValue.toFixed(6),
            riseTime: riseTime !== null ? `${riseTime} samples` : 'N/A',
            overshoot: overshoot ? (overshoot * 100).toFixed(2) + '%' : '0%',
            settlingTime: settlingIdx !== null ? `${settlingIdx} samples` : 'N/A'
        }
    };
}

/**
 * Pole-Zero analysis for discrete-time system
 */
function analyzeDigitalPoles(numerator, denominator) {
    self.postMessage({ type: 'progress', percentage: 20 });

    const poles = findPolynomialRoots(denominator);

    self.postMessage({ type: 'progress', percentage: 50 });

    const zeros = numerator.length > 1 ? findPolynomialRoots(numerator) : [];

    self.postMessage({ type: 'progress', percentage: 80 });

    // Analyze stability (poles must be inside unit circle)
    const isStable = poles.every(p => {
        const mag = Math.sqrt(p.re * p.re + p.im * p.im);
        return mag < 1;
    });

    const isMarginallyStable = poles.some(p => {
        const mag = Math.sqrt(p.re * p.re + p.im * p.im);
        return Math.abs(mag - 1) < 1e-6;
    }) && poles.every(p => {
        const mag = Math.sqrt(p.re * p.re + p.im * p.im);
        return mag <= 1;
    });

    // Find dominant pole (closest to unit circle)
    let dominantPole = poles[0];
    let maxMag = 0;
    poles.forEach(p => {
        const mag = Math.sqrt(p.re * p.re + p.im * p.im);
        if (mag > maxMag) {
            maxMag = mag;
            dominantPole = p;
        }
    });

    const dominantMag = Math.sqrt(dominantPole.re * dominantPole.re + dominantPole.im * dominantPole.im);
    const dominantAngle = Math.atan2(dominantPole.im, dominantPole.re);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Digital Pole-Zero Analysis',
        poles: poles.map(p => ({
            re: p.re.toFixed(6),
            im: p.im.toFixed(6),
            magnitude: Math.sqrt(p.re * p.re + p.im * p.im).toFixed(6),
            angle: (Math.atan2(p.im, p.re) * 180 / Math.PI).toFixed(2)
        })),
        zeros: zeros.map(z => ({
            re: z.re.toFixed(6),
            im: z.im.toFixed(6),
            magnitude: Math.sqrt(z.re * z.re + z.im * z.im).toFixed(6),
            angle: (Math.atan2(z.im, z.re) * 180 / Math.PI).toFixed(2)
        })),
        stability: {
            isStable: isStable,
            isMarginallyStable: isMarginallyStable,
            systemType: isStable ? 'Stable' : (isMarginallyStable ? 'Marginally Stable' : 'Unstable')
        },
        dominant: {
            magnitude: dominantMag.toFixed(6),
            angle: (dominantAngle * 180 / Math.PI).toFixed(2),
            timeConstant: dominantMag < 1 ? (-1 / Math.log(dominantMag)).toFixed(2) : 'N/A'
        },
        order: {
            numerator: numerator.length - 1,
            denominator: denominator.length - 1
        }
    };
}

/**
 * Apply digital filter to signal
 */
function applyDigitalFilter(signal, numerator, denominator) {
    const n = signal.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    const M = numerator.length;
    const N = denominator.length;

    const state = new Array(Math.max(M, N)).fill(0);

    const a0 = denominator[0];
    const b = numerator.map(c => c / a0);
    const a = denominator.map(c => c / a0);

    const output = [];

    for (let i = 0; i < n; i++) {
        if (i % Math.max(1, Math.floor(n / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / n) * 80) });
        }

        const x = signal[i];
        let y = b[0] * x + state[0];

        for (let j = 0; j < state.length - 1; j++) {
            const bCoeff = j + 1 < M ? b[j + 1] : 0;
            const aCoeff = j + 1 < N ? a[j + 1] : 0;
            state[j] = bCoeff * x - aCoeff * y + state[j + 1];
        }

        output.push(y);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Digital Filtering',
        input: signal,
        output: output,
        numerator: numerator,
        denominator: denominator,
        stats: {
            inputLength: n,
            inputRMS: computeRMS(signal).toFixed(6),
            outputRMS: computeRMS(output).toFixed(6),
            gain: (computeRMS(output) / computeRMS(signal)).toFixed(4)
        }
    };
}

/**
 * Evaluate polynomial in z: c[0] + c[1]z^(-1) + c[2]z^(-2) + ...
 */
function evaluatePolynomialZ(coefficients, z) {
    let result = { re: 0, im: 0 };
    let zInvPow = { re: 1, im: 0 }; // z^0

    // Compute z^(-1)
    const zMagSq = z.re * z.re + z.im * z.im;
    const zInv = { re: z.re / zMagSq, im: -z.im / zMagSq };

    for (let i = 0; i < coefficients.length; i++) {
        result.re += coefficients[i] * zInvPow.re;
        result.im += coefficients[i] * zInvPow.im;

        // Multiply by z^(-1)
        const newRe = zInvPow.re * zInv.re - zInvPow.im * zInv.im;
        const newIm = zInvPow.re * zInv.im + zInvPow.im * zInv.re;
        zInvPow = { re: newRe, im: newIm };
    }

    return result;
}

/**
 * Find polynomial roots using Durand-Kerner method
 */
function findPolynomialRoots(coefficients) {
    const n = coefficients.length - 1;
    if (n <= 0) return [];

    // Reverse and normalize (convert from z^(-n) to z^n form)
    const reversed = [...coefficients].reverse();
    const an = reversed[n];
    const normalized = reversed.map(c => c / an);

    // Initial guesses
    const roots = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n + 0.1;
        const r = 0.9; // Start inside unit circle
        roots.push({
            re: r * Math.cos(angle),
            im: r * Math.sin(angle)
        });
    }

    // Iterate
    const maxIter = 100;
    const tol = 1e-12;

    for (let iter = 0; iter < maxIter; iter++) {
        let maxDelta = 0;

        for (let i = 0; i < n; i++) {
            const pVal = evaluateStandardPolynomial(normalized, roots[i]);

            let prod = { re: 1, im: 0 };
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    const diff = {
                        re: roots[i].re - roots[j].re,
                        im: roots[i].im - roots[j].im
                    };
                    const newRe = prod.re * diff.re - prod.im * diff.im;
                    const newIm = prod.re * diff.im + prod.im * diff.re;
                    prod = { re: newRe, im: newIm };
                }
            }

            const prodMagSq = prod.re * prod.re + prod.im * prod.im;
            const delta = {
                re: (pVal.re * prod.re + pVal.im * prod.im) / (prodMagSq + 1e-15),
                im: (pVal.im * prod.re - pVal.re * prod.im) / (prodMagSq + 1e-15)
            };

            roots[i].re -= delta.re;
            roots[i].im -= delta.im;

            maxDelta = Math.max(maxDelta, Math.abs(delta.re), Math.abs(delta.im));
        }

        if (maxDelta < tol) break;
    }

    // Clean up near-real roots
    return roots.map(r => ({
        re: r.re,
        im: Math.abs(r.im) < 1e-8 ? 0 : r.im
    }));
}

function evaluateStandardPolynomial(coefficients, z) {
    let result = { re: 0, im: 0 };
    let zPow = { re: 1, im: 0 };

    for (let i = 0; i < coefficients.length; i++) {
        result.re += coefficients[i] * zPow.re;
        result.im += coefficients[i] * zPow.im;

        const newRe = zPow.re * z.re - zPow.im * z.im;
        const newIm = zPow.re * z.im + zPow.im * z.re;
        zPow = { re: newRe, im: newIm };
    }

    return result;
}

/**
 * Helper functions
 */
function findDigitalCutoff(freqResponse) {
    const dcMag = freqResponse[0].magnitude;
    const threshold = dcMag / Math.sqrt(2);

    for (let i = 1; i < freqResponse.length; i++) {
        if (freqResponse[i].magnitude < threshold) {
            const f1 = freqResponse[i - 1].normalizedFreq;
            const f2 = freqResponse[i].normalizedFreq;
            const m1 = freqResponse[i - 1].magnitude;
            const m2 = freqResponse[i].magnitude;

            return f1 + (threshold - m1) * (f2 - f1) / (m2 - m1);
        }
    }
    return null;
}

function findPeakResponse(freqResponse) {
    let peak = freqResponse[0];
    for (const fr of freqResponse) {
        if (fr.magnitude > peak.magnitude) {
            peak = fr;
        }
    }
    return peak;
}

function findDigitalRiseTime(response) {
    const finalValue = response[response.length - 1];
    const target10 = 0.1 * finalValue;
    const target90 = 0.9 * finalValue;

    let n10 = null, n90 = null;

    for (let i = 0; i < response.length; i++) {
        if (n10 === null && response[i] >= target10) {
            n10 = i;
        }
        if (n90 === null && response[i] >= target90) {
            n90 = i;
            break;
        }
    }

    return (n10 !== null && n90 !== null) ? n90 - n10 : null;
}

function calculateOvershoot(response, finalValue) {
    if (Math.abs(finalValue) < 1e-10) return 0;
    const peak = Math.max(...response);
    return peak > finalValue ? (peak - finalValue) / finalValue : 0;
}

function findSettlingIndex(response, finalValue = 0) {
    const peak = finalValue !== 0 ? Math.abs(finalValue) : Math.max(...response.map(Math.abs));
    const threshold = 0.02 * peak;

    for (let i = response.length - 1; i >= 0; i--) {
        const target = finalValue !== 0 ? finalValue : 0;
        if (Math.abs(response[i] - target) > threshold) {
            return i + 1;
        }
    }
    return null;
}

function computeRMS(arr) {
    return Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0) / arr.length);
}
