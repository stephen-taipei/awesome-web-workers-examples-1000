/**
 * Web Worker for Bisection Method root finding
 * Finds roots of f(x) = 0 with guaranteed convergence
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, a, b, tolerance, maxIterations } = data;

        // Create function from type or custom expression
        const f = createFunction(functionType, customFunction);

        // Validate bracketing
        const fa = f(a);
        const fb = f(b);

        if (fa * fb > 0) {
            throw new Error(`f(a) and f(b) must have opposite signs. f(${a}) = ${fa.toFixed(6)}, f(${b}) = ${fb.toFixed(6)}`);
        }

        // Run bisection
        const result = bisection(f, a, b, tolerance, maxIterations, functionType);

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
        case 'log':
            return x => Math.log(x) - 1;
        case 'sqrt':
            return x => Math.sqrt(x) - Math.cos(x);
        case 'custom':
            // Safe evaluation of custom function
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return x => Math.pow(x, 3) - x - 2;
    }
}

function getFunctionString(functionType, customFunction) {
    switch (functionType) {
        case 'polynomial':
            return 'x³ - x - 2';
        case 'trig':
            return 'cos(x) - x';
        case 'exp':
            return 'eˣ - 3x';
        case 'log':
            return 'ln(x) - 1';
        case 'sqrt':
            return '√x - cos(x)';
        case 'custom':
            return customFunction;
        default:
            return 'x³ - x - 2';
    }
}

function bisection(f, a, b, tolerance, maxIterations, functionType) {
    const iterations = [];
    let left = a;
    let right = b;
    let fa = f(left);
    let fb = f(right);
    let iteration = 0;
    let converged = false;

    const initialInterval = right - left;
    const theoreticalIterations = Math.ceil(Math.log2(initialInterval / tolerance));

    while (iteration < maxIterations) {
        const mid = (left + right) / 2;
        const fmid = f(mid);
        const intervalWidth = right - left;
        const error = intervalWidth / 2;

        iterations.push({
            iteration: iteration + 1,
            a: left,
            b: right,
            c: mid,
            fa: f(left),
            fb: f(right),
            fc: fmid,
            interval: intervalWidth,
            error
        });

        // Check convergence
        if (Math.abs(fmid) < tolerance || error < tolerance) {
            converged = true;
            break;
        }

        // Update interval
        if (fa * fmid < 0) {
            right = mid;
            fb = fmid;
        } else {
            left = mid;
            fa = fmid;
        }

        iteration++;

        if (iteration % 5 === 0) {
            reportProgress(10 + 80 * iteration / maxIterations);
        }
    }

    const root = (left + right) / 2;
    const fRoot = f(root);

    reportProgress(100);

    return {
        root,
        fRoot,
        iterations: iterations.length,
        converged,
        tolerance,
        initialInterval,
        finalInterval: right - left,
        theoreticalIterations,
        functionString: getFunctionString(functionType),
        initialBounds: { a, b, fa: f(a), fb: f(b) },
        iterationHistory: iterations.slice(0, 20), // First 20 iterations for display
        convergenceRate: iterations.length > 1 ?
            Math.log2(iterations[0].error / iterations[iterations.length - 1].error) / iterations.length : 1
    };
}
