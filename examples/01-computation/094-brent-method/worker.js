/**
 * Web Worker for Brent's Method root finding
 * Robust hybrid algorithm combining bisection, secant, and inverse quadratic interpolation
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, a, b, tolerance, maxIterations } = data;

        // Create function
        const f = createFunction(functionType, customFunction);

        // Run Brent's method
        const result = brent(f, a, b, tolerance, maxIterations, functionType);

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

function createFunction(functionType, customFunction) {
    switch (functionType) {
        case 'polynomial':
            return x => Math.pow(x, 3) - x - 2;
        case 'trig':
            return x => Math.cos(x) - x;
        case 'exp':
            return x => Math.exp(x) - 3 * x;
        case 'sqrt':
            return x => x * x - 2;
        case 'log':
            return x => Math.log(x) - 1;
        case 'difficult':
            return x => Math.pow(x - 1, 3);
        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return x => Math.pow(x, 3) - x - 2;
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'polynomial':
            return 'x³ - x - 2';
        case 'trig':
            return 'cos(x) - x';
        case 'exp':
            return 'eˣ - 3x';
        case 'sqrt':
            return 'x² - 2';
        case 'log':
            return 'ln(x) - 1';
        case 'difficult':
            return '(x - 1)³';
        default:
            return functionType;
    }
}

function brent(f, a, b, tolerance, maxIterations, functionType) {
    const iterations = [];
    let fa = f(a);
    let fb = f(b);

    // Check bracket validity
    if (fa * fb > 0) {
        throw new Error('Function must have different signs at endpoints a and b (invalid bracket)');
    }

    // Ensure |f(a)| >= |f(b)| by swapping
    if (Math.abs(fa) < Math.abs(fb)) {
        [a, b] = [b, a];
        [fa, fb] = [fb, fa];
    }

    let c = a;      // Previous iterate
    let fc = fa;
    let d = b - a;  // Previous step size
    let e = d;      // Step size before last

    let converged = false;
    let bisectionCount = 0;
    let secantCount = 0;
    let iqiCount = 0;

    iterations.push({
        iteration: 0,
        a, b, c,
        fa, fb, fc,
        method: 'Initial',
        root: b,
        error: Math.abs(b - a)
    });

    reportProgress(5);

    for (let i = 1; i <= maxIterations; i++) {
        // Convergence test
        const tol = 2 * Number.EPSILON * Math.abs(b) + tolerance / 2;
        const m = (a - b) / 2;

        if (Math.abs(m) <= tol || fb === 0) {
            converged = true;
            break;
        }

        let method = 'Bisection';
        let s;  // Next approximation

        // Decide between interpolation or bisection
        if (Math.abs(e) >= tol && Math.abs(fc) > Math.abs(fb)) {
            // Try interpolation
            let p, q, r;

            if (a === c) {
                // Secant method (linear interpolation)
                p = 2 * m * fb / fc;
                q = 1 - fb / fc;
                method = 'Secant';
            } else {
                // Inverse quadratic interpolation
                const rAC = fb / fc;
                const rBC = fb / fa;
                const rAB = fc / fa;

                p = rBC * (2 * m * rAC * (rAC - rAB) - (b - c) * (rAB - 1));
                q = (rAC - 1) * (rBC - 1) * (rAB - 1);
                method = 'IQI';
            }

            // Ensure p > 0 for the comparison
            if (p > 0) {
                q = -q;
            } else {
                p = -p;
            }

            // Accept interpolation only if it's good enough
            const bound1 = 3 * m * q - Math.abs(tol * q);
            const bound2 = Math.abs(e * q);

            if (2 * p < Math.min(bound1, bound2)) {
                // Interpolation accepted
                e = d;
                d = p / q;
                if (method === 'Secant') secantCount++;
                else iqiCount++;
            } else {
                // Fall back to bisection
                d = m;
                e = m;
                method = 'Bisection';
                bisectionCount++;
            }
        } else {
            // Bisection
            d = m;
            e = m;
            bisectionCount++;
        }

        // Save old b
        c = b;
        fc = fb;

        // Update b
        if (Math.abs(d) > tol) {
            b = b + d;
        } else {
            b = b + (m > 0 ? tol : -tol);
        }

        fb = f(b);

        // Update a for bracket
        if ((fb > 0 && fa > 0) || (fb < 0 && fa < 0)) {
            a = c;
            fa = fc;
            e = b - c;
            d = e;
        }

        // Ensure |f(a)| >= |f(b)|
        if (Math.abs(fa) < Math.abs(fb)) {
            [a, b] = [b, a];
            [fa, fb] = [fb, fa];
        }

        const error = Math.abs(b - c);

        iterations.push({
            iteration: i,
            a, b, c,
            fa, fb, fc,
            method,
            root: b,
            error,
            step: d
        });

        reportProgress(10 + 80 * i / maxIterations);
    }

    const root = b;
    const fRoot = fb;
    const totalInterpolations = secantCount + iqiCount;

    reportProgress(100);

    return {
        root,
        fRoot,
        iterations: iterations.length,
        converged,
        tolerance,
        bracket: { a: iterations[0].a, b: iterations[0].b },
        functionString: getFunctionString(functionType),
        methodStats: {
            bisection: bisectionCount,
            secant: secantCount,
            iqi: iqiCount,
            total: iterations.length - 1
        },
        efficiency: totalInterpolations / Math.max(1, iterations.length - 1),
        iterationHistory: iterations.slice(0, 30)
    };
}
