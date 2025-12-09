/**
 * Web Worker for Fourier Series
 * Computes Fourier coefficients using numerical integration
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customExpr, numTerms, evalPoint, integrationPoints } = data;

        // Create the function
        const f = createFunction(functionType, customExpr);

        reportProgress(5);

        // Compute a0 (DC component)
        const a0 = computeA0(f, integrationPoints);

        reportProgress(15);

        // Compute Fourier coefficients
        const coefficients = [];
        for (let n = 1; n <= numTerms; n++) {
            const an = computeAn(f, n, integrationPoints);
            const bn = computeBn(f, n, integrationPoints);

            // Amplitude and phase
            const amplitude = Math.sqrt(an * an + bn * bn);
            const phase = Math.atan2(bn, an);

            coefficients.push({
                n,
                an,
                bn,
                amplitude,
                phase,
                phaseDegrees: phase * 180 / Math.PI
            });

            if (n % 5 === 0) {
                reportProgress(15 + Math.round(50 * n / numTerms));
            }
        }

        reportProgress(70);

        // Evaluate series at specified point
        const evalResult = evaluateSeries(a0, coefficients, evalPoint);
        const exactValue = f(evalPoint);

        // Generate comparison curves
        const samples = 200;
        const curveOriginal = [];
        const curveApprox = [];

        for (let i = 0; i <= samples; i++) {
            const x = -Math.PI + (2 * Math.PI * i / samples);
            const original = f(x);
            const approx = evaluateSeries(a0, coefficients, x);

            curveOriginal.push({ x, y: original });
            curveApprox.push({ x, y: approx.total });

            if (i % 40 === 0) {
                reportProgress(70 + Math.round(20 * i / samples));
            }
        }

        reportProgress(95);

        // Compute energy (Parseval's theorem)
        const energy = computeEnergy(a0, coefficients);

        // Analyze convergence
        const convergenceAnalysis = analyzeConvergence(f, a0, coefficients, integrationPoints);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                functionType,
                numTerms,
                a0,
                coefficients,
                evalPoint,
                evalResult,
                exactValue,
                curveOriginal,
                curveApprox,
                energy,
                convergenceAnalysis
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

function createFunction(functionType, customExpr) {
    switch (functionType) {
        case 'square':
            return x => {
                const normalized = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                return normalized < Math.PI ? 1 : -1;
            };
        case 'sawtooth':
            return x => {
                const normalized = ((x + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
                return normalized / Math.PI;
            };
        case 'triangle':
            return x => {
                const normalized = ((x + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
                return 1 - 2 * Math.abs(normalized) / Math.PI;
            };
        case 'rectified':
            return x => Math.abs(Math.sin(x));
        case 'pulse':
            return x => {
                const normalized = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                return normalized < Math.PI / 2 ? 1 : 0;
            };
        case 'custom':
            try {
                return new Function('x', `return ${customExpr};`);
            } catch (e) {
                throw new Error('Invalid custom expression: ' + e.message);
            }
        default:
            return x => Math.sin(x);
    }
}

function computeA0(f, numPoints) {
    // a0 = (1/π) ∫_{-π}^{π} f(x) dx
    return (1 / Math.PI) * simpsonIntegrate(f, -Math.PI, Math.PI, numPoints);
}

function computeAn(f, n, numPoints) {
    // an = (1/π) ∫_{-π}^{π} f(x)cos(nx) dx
    const integrand = x => f(x) * Math.cos(n * x);
    return (1 / Math.PI) * simpsonIntegrate(integrand, -Math.PI, Math.PI, numPoints);
}

function computeBn(f, n, numPoints) {
    // bn = (1/π) ∫_{-π}^{π} f(x)sin(nx) dx
    const integrand = x => f(x) * Math.sin(n * x);
    return (1 / Math.PI) * simpsonIntegrate(integrand, -Math.PI, Math.PI, numPoints);
}

function simpsonIntegrate(f, a, b, n) {
    // Simpson's rule for numerical integration
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += f(x) * (i % 2 === 0 ? 2 : 4);
    }

    return sum * h / 3;
}

function evaluateSeries(a0, coefficients, x) {
    let total = a0 / 2;
    const terms = [{ n: 0, term: a0 / 2, cosContrib: a0 / 2, sinContrib: 0 }];

    for (const coeff of coefficients) {
        const cosContrib = coeff.an * Math.cos(coeff.n * x);
        const sinContrib = coeff.bn * Math.sin(coeff.n * x);
        const term = cosContrib + sinContrib;
        total += term;

        terms.push({
            n: coeff.n,
            term,
            cosContrib,
            sinContrib
        });
    }

    return { total, terms };
}

function computeEnergy(a0, coefficients) {
    // Parseval's theorem: (1/π) ∫ f(x)² dx = a₀²/2 + Σ(aₙ² + bₙ²)
    let energy = (a0 * a0) / 2;

    for (const coeff of coefficients) {
        energy += coeff.an * coeff.an + coeff.bn * coeff.bn;
    }

    return energy;
}

function analyzeConvergence(f, a0, coefficients, numPoints) {
    // Compute RMS error for different numbers of terms
    const errors = [];
    const testPoints = 100;

    for (let nTerms = 1; nTerms <= coefficients.length; nTerms += Math.max(1, Math.floor(coefficients.length / 10))) {
        let sumSquaredError = 0;

        for (let i = 0; i < testPoints; i++) {
            const x = -Math.PI + (2 * Math.PI * i / testPoints);
            const exact = f(x);

            let approx = a0 / 2;
            for (let n = 0; n < nTerms; n++) {
                approx += coefficients[n].an * Math.cos((n + 1) * x);
                approx += coefficients[n].bn * Math.sin((n + 1) * x);
            }

            sumSquaredError += (exact - approx) ** 2;
        }

        errors.push({
            nTerms,
            rmse: Math.sqrt(sumSquaredError / testPoints)
        });
    }

    return errors;
}
