/**
 * Web Worker for Newton's Method (Newton-Raphson) root finding
 * Fast quadratic convergence: x_{n+1} = x_n - f(x_n)/f'(x_n)
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, customDerivative, x0, tolerance, maxIterations, derivativeMethod } = data;

        // Create function and derivative
        const f = createFunction(functionType, customFunction);
        const df = createDerivative(functionType, customDerivative, derivativeMethod, f);

        // Run Newton's method
        const result = newton(f, df, x0, tolerance, maxIterations, functionType, derivativeMethod);

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

function createDerivative(functionType, customDerivative, derivativeMethod, f) {
    if (derivativeMethod === 'numerical') {
        // Central difference approximation
        const h = 1e-8;
        return x => (f(x + h) - f(x - h)) / (2 * h);
    }

    switch (functionType) {
        case 'polynomial':
            return x => 3 * Math.pow(x, 2) - 1;
        case 'trig':
            return x => -Math.sin(x) - 1;
        case 'exp':
            return x => Math.exp(x) - 3;
        case 'sqrt':
            return x => 2 * x;
        case 'log':
            return x => 1 / x;
        case 'custom':
            if (customDerivative && customDerivative.trim()) {
                try {
                    return new Function('x', `return ${customDerivative};`);
                } catch (e) {
                    throw new Error('Invalid custom derivative: ' + e.message);
                }
            } else {
                // Fall back to numerical
                const h = 1e-8;
                return x => (f(x + h) - f(x - h)) / (2 * h);
            }
        default:
            return x => 3 * Math.pow(x, 2) - 1;
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
        default:
            return functionType;
    }
}

function getDerivativeString(functionType) {
    switch (functionType) {
        case 'polynomial':
            return '3x² - 1';
        case 'trig':
            return '-sin(x) - 1';
        case 'exp':
            return 'eˣ - 3';
        case 'sqrt':
            return '2x';
        case 'log':
            return '1/x';
        default:
            return "f'(x)";
    }
}

function newton(f, df, x0, tolerance, maxIterations, functionType, derivativeMethod) {
    const iterations = [];
    let x = x0;
    let converged = false;
    let diverged = false;

    for (let i = 0; i < maxIterations; i++) {
        const fx = f(x);
        const dfx = df(x);

        // Check for near-zero derivative
        if (Math.abs(dfx) < 1e-14) {
            diverged = true;
            iterations.push({
                iteration: i + 1,
                x,
                fx,
                dfx,
                error: null,
                note: 'Near-zero derivative'
            });
            break;
        }

        const xNew = x - fx / dfx;
        const error = Math.abs(xNew - x);

        // Estimate convergence order
        let convergenceOrder = null;
        if (iterations.length >= 2) {
            const prev = iterations[iterations.length - 1];
            const prevPrev = iterations[iterations.length - 2];
            if (prev.error && prevPrev.error && prev.error > 1e-14 && prevPrev.error > 1e-14) {
                const ratio = Math.log(error / prev.error) / Math.log(prev.error / prevPrev.error);
                convergenceOrder = ratio;
            }
        }

        iterations.push({
            iteration: i + 1,
            x,
            xNew,
            fx,
            dfx,
            error,
            convergenceOrder
        });

        // Check for divergence
        if (!isFinite(xNew) || Math.abs(xNew) > 1e15) {
            diverged = true;
            break;
        }

        // Check convergence
        if (error < tolerance || Math.abs(fx) < tolerance) {
            x = xNew;
            converged = true;
            break;
        }

        x = xNew;

        reportProgress(10 + 80 * i / maxIterations);
    }

    const root = x;
    const fRoot = f(root);

    // Calculate final convergence rate
    let avgConvergenceOrder = null;
    const orders = iterations
        .filter(it => it.convergenceOrder !== null && isFinite(it.convergenceOrder) && it.convergenceOrder > 0)
        .map(it => it.convergenceOrder);
    if (orders.length > 0) {
        avgConvergenceOrder = orders.reduce((a, b) => a + b, 0) / orders.length;
    }

    reportProgress(100);

    return {
        root,
        fRoot,
        iterations: iterations.length,
        converged,
        diverged,
        tolerance,
        initialGuess: x0,
        functionString: getFunctionString(functionType),
        derivativeString: getDerivativeString(functionType),
        derivativeMethod,
        avgConvergenceOrder,
        iterationHistory: iterations.slice(0, 25)
    };
}
