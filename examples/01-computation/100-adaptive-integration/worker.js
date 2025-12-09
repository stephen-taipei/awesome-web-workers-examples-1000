/**
 * Web Worker for Adaptive Integration
 * Automatic precision control through recursive interval subdivision
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, a, b, tolerance, maxDepth } = data;

        // Create function
        const f = createFunction(functionType, customFunction);

        // Reset statistics
        const stats = {
            evaluations: 0,
            subdivisions: 0,
            maxDepthReached: 0,
            intervals: []
        };

        // Run adaptive integration
        const result = adaptiveSimpson(f, a, b, tolerance, maxDepth, stats, 0);

        // Get exact value if available
        const exact = getExactValue(functionType, a, b);

        // Compare with fixed Simpson
        const fixedResult = fixedSimpson(f, a, b, 100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                value: result,
                stats,
                exact,
                fixedResult,
                functionString: getFunctionString(functionType),
                a, b, tolerance, maxDepth
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

function createFunction(functionType, customFunction) {
    switch (functionType) {
        case 'smooth':
            return x => Math.sin(x);
        case 'peak':
            return x => 1 / (1 + Math.pow(x - 0.5, 2) * 100);
        case 'oscillatory':
            return x => Math.sin(20 * x);
        case 'discontinuous':
            return x => x < 0.5 ? -1 : 1;
        case 'sqrt':
            return x => Math.sqrt(Math.abs(x));
        case 'gaussian':
            return x => Math.exp(-100 * x * x);
        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return x => Math.sin(x);
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'smooth': return 'sin(x)';
        case 'peak': return '1/(1+100(x-0.5)²)';
        case 'oscillatory': return 'sin(20x)';
        case 'discontinuous': return 'sign(x-0.5)';
        case 'sqrt': return '√|x|';
        case 'gaussian': return 'e^(-100x²)';
        default: return 'f(x)';
    }
}

function getExactValue(functionType, a, b) {
    switch (functionType) {
        case 'smooth':
            return -Math.cos(b) + Math.cos(a);
        case 'peak':
            // ∫1/(1+100(x-0.5)²) dx = arctan(10(x-0.5))/10
            return (Math.atan(10 * (b - 0.5)) - Math.atan(10 * (a - 0.5))) / 10;
        case 'oscillatory':
            return (-Math.cos(20 * b) + Math.cos(20 * a)) / 20;
        case 'discontinuous':
            if (a < 0.5 && b > 0.5) {
                return -(0.5 - a) + (b - 0.5);
            } else if (b <= 0.5) {
                return -(b - a);
            } else {
                return b - a;
            }
        case 'sqrt':
            // ∫√|x| dx = (2/3)x|x|^(1/2) for x > 0
            if (a >= 0) {
                return (2/3) * (Math.pow(b, 1.5) - Math.pow(a, 1.5));
            }
            return null;
        case 'gaussian':
            // No simple closed form
            return null;
        default:
            return null;
    }
}

// Simpson's rule for a single interval
function simpson(f, a, b, fa, fm, fb) {
    return (b - a) / 6 * (fa + 4 * fm + fb);
}

// Adaptive Simpson's rule
function adaptiveSimpson(f, a, b, tolerance, maxDepth, stats, depth) {
    const m = (a + b) / 2;
    const h = (b - a) / 2;

    // Evaluate function at endpoints and midpoint
    const fa = f(a);
    const fb = f(b);
    const fm = f(m);
    stats.evaluations += 3;

    // Simpson's rule over whole interval
    const S1 = simpson(f, a, b, fa, fm, fb);

    // Simpson's rule over two halves
    const lm = (a + m) / 2;
    const rm = (m + b) / 2;
    const flm = f(lm);
    const frm = f(rm);
    stats.evaluations += 2;

    const Sleft = simpson(f, a, m, fa, flm, fm);
    const Sright = simpson(f, m, b, fm, frm, fb);
    const S2 = Sleft + Sright;

    // Error estimate
    const error = Math.abs(S2 - S1) / 15;

    // Track max depth
    stats.maxDepthReached = Math.max(stats.maxDepthReached, depth);

    // Report progress periodically
    if (stats.subdivisions % 50 === 0) {
        reportProgress(Math.min(90, 10 + stats.subdivisions));
    }

    // Check if tolerance is met or max depth reached
    if (error < tolerance || depth >= maxDepth) {
        // Richardson extrapolation for improved estimate
        const result = S2 + (S2 - S1) / 15;

        // Record this interval
        if (stats.intervals.length < 100) {
            stats.intervals.push({
                a, b,
                depth,
                estimate: result,
                error
            });
        }

        return result;
    }

    // Subdivide
    stats.subdivisions++;

    const left = adaptiveSimpsonRecurse(f, a, m, tolerance / 2, maxDepth, stats, depth + 1, fa, flm, fm);
    const right = adaptiveSimpsonRecurse(f, m, b, tolerance / 2, maxDepth, stats, depth + 1, fm, frm, fb);

    return left + right;
}

// Recursive helper that reuses function values
function adaptiveSimpsonRecurse(f, a, b, tolerance, maxDepth, stats, depth, fa, fm, fb) {
    const m = (a + b) / 2;

    // Simpson's rule over whole interval
    const S1 = simpson(f, a, b, fa, fm, fb);

    // Simpson's rule over two halves
    const lm = (a + m) / 2;
    const rm = (m + b) / 2;
    const flm = f(lm);
    const frm = f(rm);
    stats.evaluations += 2;

    const Sleft = simpson(f, a, m, fa, flm, fm);
    const Sright = simpson(f, m, b, fm, frm, fb);
    const S2 = Sleft + Sright;

    const error = Math.abs(S2 - S1) / 15;

    stats.maxDepthReached = Math.max(stats.maxDepthReached, depth);

    if (error < tolerance || depth >= maxDepth) {
        const result = S2 + (S2 - S1) / 15;

        if (stats.intervals.length < 100) {
            stats.intervals.push({
                a, b,
                depth,
                estimate: result,
                error
            });
        }

        return result;
    }

    stats.subdivisions++;

    const left = adaptiveSimpsonRecurse(f, a, m, tolerance / 2, maxDepth, stats, depth + 1, fa, flm, fm);
    const right = adaptiveSimpsonRecurse(f, m, b, tolerance / 2, maxDepth, stats, depth + 1, fm, frm, fb);

    return left + right;
}

// Fixed Simpson for comparison
function fixedSimpson(f, a, b, n) {
    if (n % 2 !== 0) n++;

    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += (i % 2 === 0 ? 2 : 4) * f(x);
    }

    return {
        value: (h / 3) * sum,
        n,
        evaluations: n + 1
    };
}
