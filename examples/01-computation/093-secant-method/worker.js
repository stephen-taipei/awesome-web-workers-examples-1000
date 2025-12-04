/**
 * Web Worker for Secant Method root finding
 * Derivative-free root finding with superlinear convergence
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, x0, x1, tolerance, maxIterations } = data;

        // Create function
        const f = createFunction(functionType, customFunction);

        // Run Secant method
        const result = secant(f, x0, x1, tolerance, maxIterations, functionType);

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

function secant(f, x0, x1, tolerance, maxIterations, functionType) {
    const iterations = [];
    let xPrev = x0;
    let xCurr = x1;
    let fPrev = f(xPrev);
    let fCurr = f(xCurr);
    let converged = false;
    let diverged = false;

    // Store initial values
    iterations.push({
        iteration: 0,
        x: xPrev,
        fx: fPrev,
        error: null,
        note: 'Initial x₀'
    });

    iterations.push({
        iteration: 1,
        x: xCurr,
        fx: fCurr,
        error: Math.abs(xCurr - xPrev),
        note: 'Initial x₁'
    });

    reportProgress(5);

    for (let i = 2; i <= maxIterations; i++) {
        // Check for division by zero
        const denominator = fCurr - fPrev;
        if (Math.abs(denominator) < 1e-16) {
            diverged = true;
            iterations.push({
                iteration: i,
                x: xCurr,
                fx: fCurr,
                error: null,
                note: 'Division by zero (f(xₙ) ≈ f(xₙ₋₁))'
            });
            break;
        }

        // Secant formula
        const xNew = xCurr - fCurr * (xCurr - xPrev) / denominator;
        const fNew = f(xNew);
        const error = Math.abs(xNew - xCurr);

        // Estimate convergence order
        let convergenceOrder = null;
        if (iterations.length >= 3) {
            const e0 = iterations[iterations.length - 2].error;
            const e1 = iterations[iterations.length - 1].error;
            if (e0 && e1 && error > 1e-16 && e1 > 1e-16 && e0 > 1e-16) {
                const ratio = Math.log(error / e1) / Math.log(e1 / e0);
                if (isFinite(ratio) && ratio > 0 && ratio < 5) {
                    convergenceOrder = ratio;
                }
            }
        }

        iterations.push({
            iteration: i,
            x: xNew,
            fx: fNew,
            error,
            convergenceOrder,
            secantSlope: denominator / (xCurr - xPrev)
        });

        // Check for divergence
        if (!isFinite(xNew) || Math.abs(xNew) > 1e15) {
            diverged = true;
            break;
        }

        // Check convergence
        if (error < tolerance || Math.abs(fNew) < tolerance) {
            converged = true;
            xCurr = xNew;
            fCurr = fNew;
            break;
        }

        // Update for next iteration
        xPrev = xCurr;
        fPrev = fCurr;
        xCurr = xNew;
        fCurr = fNew;

        reportProgress(10 + 80 * i / maxIterations);
    }

    const root = xCurr;
    const fRoot = f(root);

    // Calculate average convergence order
    let avgConvergenceOrder = null;
    const orders = iterations
        .filter(it => it.convergenceOrder !== null && isFinite(it.convergenceOrder))
        .map(it => it.convergenceOrder);
    if (orders.length > 0) {
        avgConvergenceOrder = orders.reduce((a, b) => a + b, 0) / orders.length;
    }

    // Golden ratio is the theoretical order
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    reportProgress(100);

    return {
        root,
        fRoot,
        iterations: iterations.length,
        converged,
        diverged,
        tolerance,
        initialGuesses: { x0, x1 },
        functionString: getFunctionString(functionType),
        avgConvergenceOrder,
        theoreticalOrder: goldenRatio,
        iterationHistory: iterations.slice(0, 30)
    };
}
