/**
 * Web Worker for Polynomial Root Finding
 * Uses Durand-Kerner (Weierstrass) method to find all roots simultaneously
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { polynomialType, coefficients, tolerance, maxIterations } = data;

        // Get polynomial coefficients
        const coeffs = getCoefficients(polynomialType, coefficients);

        // Run Durand-Kerner method
        const result = durandKerner(coeffs, tolerance, maxIterations);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result,
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

function getCoefficients(polynomialType, customCoeffs) {
    switch (polynomialType) {
        case 'cubic':
            // x³ - 6x² + 11x - 6 = (x-1)(x-2)(x-3)
            return [1, -6, 11, -6];
        case 'quartic':
            // x⁴ - 10x³ + 35x² - 50x + 24 = (x-1)(x-2)(x-3)(x-4)
            return [1, -10, 35, -50, 24];
        case 'complex':
            // x² + 1, roots: ±i
            return [1, 0, 1];
        case 'mixed':
            // x³ - 1, roots: 1, e^(2πi/3), e^(4πi/3)
            return [1, 0, 0, -1];
        case 'double':
            // x³ - 3x + 2 = (x-1)²(x+2), double root at 1
            return [1, 0, -3, 2];
        case 'quintic':
            // x⁵ - 1, 5th roots of unity
            return [1, 0, 0, 0, 0, -1];
        case 'custom':
            const parsed = customCoeffs.split(',').map(s => parseFloat(s.trim()));
            if (parsed.some(isNaN)) {
                throw new Error('Invalid coefficients');
            }
            if (parsed.length < 2) {
                throw new Error('Polynomial must have at least degree 1');
            }
            if (parsed[0] === 0) {
                throw new Error('Leading coefficient cannot be zero');
            }
            return parsed;
        default:
            return [1, -6, 11, -6];
    }
}

// Complex number operations
class Complex {
    constructor(re, im = 0) {
        this.re = re;
        this.im = im;
    }

    static add(a, b) {
        return new Complex(a.re + b.re, a.im + b.im);
    }

    static sub(a, b) {
        return new Complex(a.re - b.re, a.im - b.im);
    }

    static mul(a, b) {
        return new Complex(
            a.re * b.re - a.im * b.im,
            a.re * b.im + a.im * b.re
        );
    }

    static div(a, b) {
        const denom = b.re * b.re + b.im * b.im;
        if (denom === 0) {
            return new Complex(Infinity, Infinity);
        }
        return new Complex(
            (a.re * b.re + a.im * b.im) / denom,
            (a.im * b.re - a.re * b.im) / denom
        );
    }

    abs() {
        return Math.sqrt(this.re * this.re + this.im * this.im);
    }

    static fromPolar(r, theta) {
        return new Complex(r * Math.cos(theta), r * Math.sin(theta));
    }

    isReal(tol = 1e-10) {
        return Math.abs(this.im) < tol;
    }

    toString(precision = 8) {
        const re = this.re.toFixed(precision);
        const im = Math.abs(this.im).toFixed(precision);

        if (Math.abs(this.im) < 1e-10) {
            return re;
        } else if (Math.abs(this.re) < 1e-10) {
            return this.im >= 0 ? `${im}i` : `-${im}i`;
        } else {
            return this.im >= 0 ? `${re} + ${im}i` : `${re} - ${im}i`;
        }
    }
}

// Evaluate polynomial at complex point
function evalPoly(coeffs, z) {
    let result = new Complex(coeffs[0], 0);
    for (let i = 1; i < coeffs.length; i++) {
        result = Complex.add(Complex.mul(result, z), new Complex(coeffs[i], 0));
    }
    return result;
}

function durandKerner(coeffs, tolerance, maxIterations) {
    const n = coeffs.length - 1; // Degree of polynomial

    if (n < 1) {
        throw new Error('Polynomial must have degree at least 1');
    }

    // Normalize coefficients (make monic)
    const a0 = coeffs[0];
    const normCoeffs = coeffs.map(c => c / a0);

    // Initial guesses: points on a circle in complex plane
    // Using slightly asymmetric distribution for better convergence
    const radius = 1 + Math.max(...normCoeffs.slice(1).map(Math.abs));
    let roots = [];
    for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k / n) + 0.4; // Offset to avoid symmetry issues
        roots.push(Complex.fromPolar(radius, angle));
    }

    const history = [];
    let converged = false;
    let iteration = 0;
    let maxError = Infinity;

    reportProgress(5);

    for (iteration = 0; iteration < maxIterations; iteration++) {
        const newRoots = [];
        maxError = 0;

        for (let k = 0; k < n; k++) {
            const zk = roots[k];

            // Calculate P(z_k)
            const pzk = evalPoly(normCoeffs, zk);

            // Calculate product of (z_k - z_j) for j != k
            let product = new Complex(1, 0);
            for (let j = 0; j < n; j++) {
                if (j !== k) {
                    product = Complex.mul(product, Complex.sub(zk, roots[j]));
                }
            }

            // Update: z_k = z_k - P(z_k) / product
            const correction = Complex.div(pzk, product);
            const newZk = Complex.sub(zk, correction);
            newRoots.push(newZk);

            // Track error
            maxError = Math.max(maxError, correction.abs());
        }

        // Store history (sampled)
        if (iteration < 20 || iteration % 10 === 0) {
            history.push({
                iteration,
                roots: roots.map(r => ({ re: r.re, im: r.im })),
                maxError
            });
        }

        roots = newRoots;

        // Check convergence
        if (maxError < tolerance) {
            converged = true;
            break;
        }

        reportProgress(10 + 80 * iteration / maxIterations);
    }

    // Final history entry
    history.push({
        iteration,
        roots: roots.map(r => ({ re: r.re, im: r.im })),
        maxError
    });

    // Sort roots: real roots first (by value), then complex (by real part)
    const sortedRoots = roots.map((r, idx) => ({
        root: r,
        index: idx,
        isReal: r.isReal(tolerance * 10)
    })).sort((a, b) => {
        if (a.isReal && !b.isReal) return -1;
        if (!a.isReal && b.isReal) return 1;
        if (a.isReal && b.isReal) return a.root.re - b.root.re;
        return a.root.re - b.root.re;
    });

    // Verify roots
    const verification = sortedRoots.map(({ root }) => {
        const pVal = evalPoly(normCoeffs, root);
        return {
            root: { re: root.re, im: root.im },
            pValue: { re: pVal.re, im: pVal.im },
            pMagnitude: pVal.abs(),
            isReal: root.isReal(tolerance * 10)
        };
    });

    // Count real vs complex
    const realCount = verification.filter(v => v.isReal).length;
    const complexCount = n - realCount;

    reportProgress(100);

    return {
        degree: n,
        coefficients: coeffs,
        roots: verification,
        iterations: iteration + 1,
        converged,
        tolerance,
        maxError,
        realCount,
        complexCount,
        history: history.slice(0, 25)
    };
}
