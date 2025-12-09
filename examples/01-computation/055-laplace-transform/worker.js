/**
 * Web Worker: Laplace Transform
 * Numerical computation of Laplace transform and system analysis
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'numerical':
                result = computeNumericalLaplace(data.signal, data.sValues, data.dt);
                break;
            case 'transferfunction':
                result = analyzeTransferFunction(data.numerator, data.denominator, data.frequencies);
                break;
            case 'impulse':
                result = computeImpulseResponse(data.numerator, data.denominator, data.duration, data.dt);
                break;
            case 'step':
                result = computeStepResponse(data.numerator, data.denominator, data.duration, data.dt);
                break;
            case 'poles':
                result = analyzePoles(data.numerator, data.denominator);
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
 * Numerical Laplace Transform using trapezoidal integration
 * L{f(t)} = ∫₀^∞ f(t)e^(-st) dt
 */
function computeNumericalLaplace(signal, sValues, dt = 0.01) {
    const n = signal.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    const results = [];
    const totalS = sValues.length;

    for (let i = 0; i < totalS; i++) {
        if (i % Math.max(1, Math.floor(totalS / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / totalS) * 80) });
        }

        const s = sValues[i];
        let sumReal = 0;
        let sumImag = 0;

        // Trapezoidal integration
        for (let j = 0; j < n; j++) {
            const t = j * dt;
            const expReal = Math.exp(-s.re * t);
            const cosVal = Math.cos(-s.im * t);
            const sinVal = Math.sin(-s.im * t);

            const integrandReal = signal[j] * expReal * cosVal;
            const integrandImag = signal[j] * expReal * sinVal;

            // Trapezoidal weight
            const weight = (j === 0 || j === n - 1) ? 0.5 : 1;
            sumReal += integrandReal * weight;
            sumImag += integrandImag * weight;
        }

        sumReal *= dt;
        sumImag *= dt;

        results.push({
            s: s,
            value: { re: sumReal, im: sumImag },
            magnitude: Math.sqrt(sumReal * sumReal + sumImag * sumImag),
            phase: Math.atan2(sumImag, sumReal)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Numerical Laplace Transform',
        signal: signal,
        sValues: sValues,
        results: results,
        dt: dt,
        stats: {
            signalLength: n,
            duration: (n * dt).toFixed(3),
            numSValues: totalS
        }
    };
}

/**
 * Analyze transfer function H(s) = N(s)/D(s)
 */
function analyzeTransferFunction(numerator, denominator, frequencies) {
    self.postMessage({ type: 'progress', percentage: 10 });

    const freqResponse = [];
    const n = frequencies.length;

    for (let i = 0; i < n; i++) {
        if (i % Math.max(1, Math.floor(n / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / n) * 70) });
        }

        const omega = 2 * Math.PI * frequencies[i];
        const s = { re: 0, im: omega }; // s = jω for frequency response

        // Evaluate H(s) = N(s)/D(s)
        const numVal = evaluatePolynomial(numerator, s);
        const denVal = evaluatePolynomial(denominator, s);

        // Complex division
        const denMagSq = denVal.re * denVal.re + denVal.im * denVal.im;
        const hReal = (numVal.re * denVal.re + numVal.im * denVal.im) / denMagSq;
        const hImag = (numVal.im * denVal.re - numVal.re * denVal.im) / denMagSq;

        const magnitude = Math.sqrt(hReal * hReal + hImag * hImag);
        const phase = Math.atan2(hImag, hReal);

        freqResponse.push({
            frequency: frequencies[i],
            omega: omega,
            magnitude: magnitude,
            magnitudeDB: 20 * Math.log10(magnitude + 1e-10),
            phase: phase,
            phaseDeg: phase * 180 / Math.PI
        });
    }

    self.postMessage({ type: 'progress', percentage: 90 });

    // Find characteristics
    const dcGain = freqResponse[0].magnitude;
    const bandwidth3dB = findBandwidth(freqResponse);
    const peakResponse = findPeakResponse(freqResponse);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Transfer Function Analysis',
        numerator: numerator,
        denominator: denominator,
        freqResponse: freqResponse,
        characteristics: {
            dcGain: dcGain.toFixed(4),
            dcGainDB: (20 * Math.log10(dcGain + 1e-10)).toFixed(2),
            bandwidth3dB: bandwidth3dB ? bandwidth3dB.toFixed(4) : 'N/A',
            peakFrequency: peakResponse.frequency.toFixed(4),
            peakMagnitude: peakResponse.magnitude.toFixed(4)
        }
    };
}

/**
 * Compute impulse response h(t) using numerical inverse Laplace
 */
function computeImpulseResponse(numerator, denominator, duration = 5, dt = 0.01) {
    const numPoints = Math.floor(duration / dt);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Find poles and residues for partial fraction expansion
    const poles = findPolynomialRoots(denominator);

    self.postMessage({ type: 'progress', percentage: 30 });

    // Compute residues
    const residues = computeResidues(numerator, denominator, poles);

    self.postMessage({ type: 'progress', percentage: 50 });

    // Generate time response
    const t = [];
    const h = [];

    for (let i = 0; i < numPoints; i++) {
        if (i % Math.max(1, Math.floor(numPoints / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 50 + Math.round((i / numPoints) * 45) });
        }

        const time = i * dt;
        t.push(time);

        // h(t) = Σ residue[k] * e^(pole[k] * t)
        let response = 0;
        for (let k = 0; k < poles.length; k++) {
            const expArg = poles[k].re * time;
            const expMag = Math.exp(expArg);
            const cosVal = Math.cos(poles[k].im * time);
            const sinVal = Math.sin(poles[k].im * time);

            // Handle complex conjugate pairs
            response += residues[k].re * expMag * cosVal - residues[k].im * expMag * sinVal;
        }

        h.push(response);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Analyze response
    const peakValue = Math.max(...h.map(Math.abs));
    const settlingTime = findSettlingTime(h, dt);

    return {
        method: 'Impulse Response',
        time: t,
        response: h,
        poles: poles,
        residues: residues,
        stats: {
            duration: duration,
            dt: dt,
            peakValue: peakValue.toFixed(4),
            settlingTime: settlingTime ? settlingTime.toFixed(4) : 'N/A'
        }
    };
}

/**
 * Compute step response using impulse response integration
 */
function computeStepResponse(numerator, denominator, duration = 5, dt = 0.01) {
    const numPoints = Math.floor(duration / dt);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Get impulse response first
    const impulse = computeImpulseResponse(numerator, denominator, duration, dt);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Integrate to get step response
    const t = impulse.time;
    const y = [];
    let integral = 0;

    for (let i = 0; i < numPoints; i++) {
        integral += impulse.response[i] * dt;
        y.push(integral);
    }

    self.postMessage({ type: 'progress', percentage: 90 });

    // Analyze step response
    const finalValue = y[y.length - 1];
    const riseTime = findRiseTime(y, dt);
    const overshoot = calculateOvershoot(y, finalValue);
    const settlingTime = findSettlingTime(y, dt, finalValue);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Step Response',
        time: t,
        response: y,
        stats: {
            finalValue: finalValue.toFixed(4),
            riseTime: riseTime ? riseTime.toFixed(4) : 'N/A',
            overshoot: overshoot ? (overshoot * 100).toFixed(2) + '%' : '0%',
            settlingTime: settlingTime ? settlingTime.toFixed(4) : 'N/A'
        }
    };
}

/**
 * Pole-Zero analysis
 */
function analyzePoles(numerator, denominator) {
    self.postMessage({ type: 'progress', percentage: 20 });

    const poles = findPolynomialRoots(denominator);

    self.postMessage({ type: 'progress', percentage: 50 });

    const zeros = numerator.length > 1 ? findPolynomialRoots(numerator) : [];

    self.postMessage({ type: 'progress', percentage: 80 });

    // Analyze stability
    const isStable = poles.every(p => p.re < 0);
    const isMarginallyStable = poles.some(p => Math.abs(p.re) < 1e-6) &&
                               poles.every(p => p.re <= 0);

    // Calculate damping and natural frequency for dominant poles
    const dominantPole = poles.reduce((dom, p) =>
        p.re > dom.re ? p : dom, poles[0]);

    const naturalFreq = Math.sqrt(dominantPole.re * dominantPole.re +
                                  dominantPole.im * dominantPole.im);
    const dampingRatio = Math.abs(dominantPole.re) / (naturalFreq + 1e-10);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Pole-Zero Analysis',
        poles: poles.map(p => ({
            re: p.re.toFixed(4),
            im: p.im.toFixed(4),
            magnitude: Math.sqrt(p.re * p.re + p.im * p.im).toFixed(4)
        })),
        zeros: zeros.map(z => ({
            re: z.re.toFixed(4),
            im: z.im.toFixed(4),
            magnitude: Math.sqrt(z.re * z.re + z.im * z.im).toFixed(4)
        })),
        stability: {
            isStable: isStable,
            isMarginallyStable: isMarginallyStable,
            systemType: isStable ? 'Stable' : (isMarginallyStable ? 'Marginally Stable' : 'Unstable')
        },
        dominant: {
            pole: dominantPole,
            naturalFreq: naturalFreq.toFixed(4),
            dampingRatio: dampingRatio.toFixed(4)
        },
        order: {
            numerator: numerator.length - 1,
            denominator: denominator.length - 1
        }
    };
}

/**
 * Helper: Evaluate polynomial at complex s
 * coefficients[0] + coefficients[1]*s + coefficients[2]*s² + ...
 */
function evaluatePolynomial(coefficients, s) {
    let result = { re: 0, im: 0 };
    let sPower = { re: 1, im: 0 };

    for (let i = 0; i < coefficients.length; i++) {
        result.re += coefficients[i] * sPower.re;
        result.im += coefficients[i] * sPower.im;

        // Multiply by s
        const newRe = sPower.re * s.re - sPower.im * s.im;
        const newIm = sPower.re * s.im + sPower.im * s.re;
        sPower = { re: newRe, im: newIm };
    }

    return result;
}

/**
 * Find polynomial roots using Durand-Kerner method
 */
function findPolynomialRoots(coefficients) {
    const n = coefficients.length - 1;
    if (n <= 0) return [];

    // Normalize coefficients
    const an = coefficients[n];
    const normalized = coefficients.map(c => c / an);

    // Initial guesses on unit circle
    const roots = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n + 0.1;
        roots.push({
            re: Math.cos(angle),
            im: Math.sin(angle)
        });
    }

    // Iterate
    const maxIter = 100;
    const tol = 1e-10;

    for (let iter = 0; iter < maxIter; iter++) {
        let maxDelta = 0;

        for (let i = 0; i < n; i++) {
            // Evaluate polynomial at root[i]
            const pVal = evaluateNormalizedPolynomial(normalized, roots[i]);

            // Product of differences
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

            // Delta = p(z) / prod
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

function evaluateNormalizedPolynomial(coefficients, z) {
    let result = { re: 0, im: 0 };
    let zPower = { re: 1, im: 0 };

    for (let i = 0; i < coefficients.length; i++) {
        result.re += coefficients[i] * zPower.re;
        result.im += coefficients[i] * zPower.im;

        const newRe = zPower.re * z.re - zPower.im * z.im;
        const newIm = zPower.re * z.im + zPower.im * z.re;
        zPower = { re: newRe, im: newIm };
    }

    return result;
}

/**
 * Compute residues for partial fraction expansion
 */
function computeResidues(numerator, denominator, poles) {
    const residues = [];

    for (let i = 0; i < poles.length; i++) {
        const p = poles[i];

        // Residue = N(p) / D'(p) where D' is derivative
        const numVal = evaluatePolynomial(numerator, p);

        // Compute derivative of denominator
        const denDeriv = [];
        for (let j = 1; j < denominator.length; j++) {
            denDeriv.push(j * denominator[j]);
        }

        const denDerivVal = evaluatePolynomial(denDeriv, p);

        // Complex division
        const denMagSq = denDerivVal.re * denDerivVal.re + denDerivVal.im * denDerivVal.im;
        residues.push({
            re: (numVal.re * denDerivVal.re + numVal.im * denDerivVal.im) / (denMagSq + 1e-15),
            im: (numVal.im * denDerivVal.re - numVal.re * denDerivVal.im) / (denMagSq + 1e-15)
        });
    }

    return residues;
}

/**
 * Helper functions for response analysis
 */
function findBandwidth(freqResponse) {
    const dcMag = freqResponse[0].magnitude;
    const threshold = dcMag / Math.sqrt(2); // -3dB point

    for (let i = 1; i < freqResponse.length; i++) {
        if (freqResponse[i].magnitude < threshold) {
            // Linear interpolation
            const f1 = freqResponse[i - 1].frequency;
            const f2 = freqResponse[i].frequency;
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

function findRiseTime(response, dt) {
    const finalValue = response[response.length - 1];
    const target10 = 0.1 * finalValue;
    const target90 = 0.9 * finalValue;

    let t10 = null, t90 = null;

    for (let i = 0; i < response.length; i++) {
        if (t10 === null && response[i] >= target10) {
            t10 = i * dt;
        }
        if (t90 === null && response[i] >= target90) {
            t90 = i * dt;
            break;
        }
    }

    return (t10 !== null && t90 !== null) ? t90 - t10 : null;
}

function calculateOvershoot(response, finalValue) {
    if (Math.abs(finalValue) < 1e-10) return 0;
    const peak = Math.max(...response);
    return peak > finalValue ? (peak - finalValue) / finalValue : 0;
}

function findSettlingTime(response, dt, finalValue = 0) {
    if (finalValue === 0) {
        // For impulse response, find when signal stays below 2% of peak
        const peak = Math.max(...response.map(Math.abs));
        const threshold = 0.02 * peak;

        for (let i = response.length - 1; i >= 0; i--) {
            if (Math.abs(response[i]) > threshold) {
                return (i + 1) * dt;
            }
        }
    } else {
        // For step response, find when signal stays within 2% of final value
        const threshold = 0.02 * Math.abs(finalValue);

        for (let i = response.length - 1; i >= 0; i--) {
            if (Math.abs(response[i] - finalValue) > threshold) {
                return (i + 1) * dt;
            }
        }
    }

    return null;
}
