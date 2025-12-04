/**
 * Web Worker for Gradient Computation
 * Compute gradients for n-dimensional functions
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, point, h, method } = data;
        const n = point.length;

        // Create function
        const f = createFunction(functionType, customFunction, n);
        const exactGradient = getExactGradient(functionType, n);

        reportProgress(10);

        // Calculate function value at point
        const fValue = f(point);

        // Calculate gradient
        const gradient = computeGradient(f, point, h, method);
        reportProgress(50);

        // Calculate exact gradient if available
        let exact = null;
        if (exactGradient) {
            exact = exactGradient(point);
        }

        // Calculate gradient properties
        const magnitude = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0));
        const unitVector = gradient.map(g => g / magnitude);

        // Calculate directional derivative in steepest descent direction
        const steepestDescentValue = -magnitude;

        // Error analysis if exact is available
        let errors = null;
        if (exact) {
            errors = gradient.map((g, i) => Math.abs(g - exact[i]));
        }

        // Convergence analysis
        const convergence = analyzeConvergence(f, point, exactGradient);
        reportProgress(80);

        // Gradient descent step suggestion
        const stepSuggestion = suggestStepSize(f, point, gradient);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                fValue,
                gradient,
                exact,
                errors,
                magnitude,
                unitVector,
                steepestDescentValue,
                convergence,
                stepSuggestion,
                functionString: getFunctionString(functionType, n),
                point, h, method
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

function createFunction(functionType, customFunction, n) {
    switch (functionType) {
        case 'sphere':
            return x => x.reduce((sum, xi) => sum + xi * xi, 0);

        case 'rosenbrock':
            return x => {
                let sum = 0;
                for (let i = 0; i < x.length - 1; i++) {
                    sum += 100 * Math.pow(x[i + 1] - x[i] * x[i], 2) + Math.pow(1 - x[i], 2);
                }
                return sum;
            };

        case 'rastrigin':
            return x => {
                const A = 10;
                return A * x.length + x.reduce((sum, xi) =>
                    sum + xi * xi - A * Math.cos(2 * Math.PI * xi), 0);
            };

        case 'ackley':
            return x => {
                const a = 20, b = 0.2, c = 2 * Math.PI;
                const n = x.length;
                const sum1 = x.reduce((s, xi) => s + xi * xi, 0);
                const sum2 = x.reduce((s, xi) => s + Math.cos(c * xi), 0);
                return -a * Math.exp(-b * Math.sqrt(sum1 / n)) -
                       Math.exp(sum2 / n) + a + Math.E;
            };

        case 'beale':
            return x => {
                const x1 = x[0], x2 = x[1];
                return Math.pow(1.5 - x1 + x1 * x2, 2) +
                       Math.pow(2.25 - x1 + x1 * x2 * x2, 2) +
                       Math.pow(2.625 - x1 + x1 * x2 * x2 * x2, 2);
            };

        case 'booth':
            return x => {
                const x1 = x[0], x2 = x[1];
                return Math.pow(x1 + 2 * x2 - 7, 2) + Math.pow(2 * x1 + x2 - 5, 2);
            };

        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }

        default:
            return x => x.reduce((sum, xi) => sum + xi * xi, 0);
    }
}

function getExactGradient(functionType, n) {
    switch (functionType) {
        case 'sphere':
            return x => x.map(xi => 2 * xi);

        case 'rosenbrock':
            return x => {
                const grad = new Array(x.length).fill(0);
                for (let i = 0; i < x.length - 1; i++) {
                    grad[i] += -400 * x[i] * (x[i + 1] - x[i] * x[i]) - 2 * (1 - x[i]);
                    grad[i + 1] += 200 * (x[i + 1] - x[i] * x[i]);
                }
                return grad;
            };

        case 'rastrigin':
            return x => x.map(xi => 2 * xi + 20 * Math.PI * Math.sin(2 * Math.PI * xi));

        case 'booth':
            return x => {
                const x1 = x[0], x2 = x[1];
                return [
                    2 * (x1 + 2 * x2 - 7) + 4 * (2 * x1 + x2 - 5),
                    4 * (x1 + 2 * x2 - 7) + 2 * (2 * x1 + x2 - 5)
                ];
            };

        default:
            return null;
    }
}

function getFunctionString(functionType, n) {
    switch (functionType) {
        case 'sphere': return `Σxᵢ² (n=${n})`;
        case 'rosenbrock': return `Rosenbrock (n=${n})`;
        case 'rastrigin': return `Rastrigin (n=${n})`;
        case 'ackley': return `Ackley (n=${n})`;
        case 'beale': return 'Beale';
        case 'booth': return 'Booth';
        default: return 'f(x)';
    }
}

function computeGradient(f, point, h, method) {
    const n = point.length;
    const gradient = new Array(n);

    for (let i = 0; i < n; i++) {
        gradient[i] = partialDerivative(f, point, i, h, method);
    }

    return gradient;
}

function partialDerivative(f, point, i, h, method) {
    const x = [...point];

    switch (method) {
        case 'forward': {
            const f0 = f(x);
            x[i] += h;
            const f1 = f(x);
            return (f1 - f0) / h;
        }

        case 'backward': {
            const f0 = f(x);
            x[i] -= h;
            const f1 = f(x);
            return (f0 - f1) / h;
        }

        case 'central':
        default: {
            x[i] += h;
            const fp = f(x);
            x[i] -= 2 * h;
            const fm = f(x);
            return (fp - fm) / (2 * h);
        }
    }
}

function analyzeConvergence(f, point, exactGradient) {
    if (!exactGradient) return null;

    const exact = exactGradient(point);
    const hValues = [0.1, 0.01, 0.001, 0.0001, 0.00001];
    const results = [];

    for (const h of hValues) {
        const central = computeGradient(f, point, h, 'central');
        const forward = computeGradient(f, point, h, 'forward');

        // Max error across all dimensions
        const centralError = Math.max(...central.map((g, i) => Math.abs(g - exact[i])));
        const forwardError = Math.max(...forward.map((g, i) => Math.abs(g - exact[i])));

        results.push({
            h,
            centralError,
            forwardError
        });
    }

    return results;
}

function suggestStepSize(f, point, gradient) {
    // Simple backtracking line search suggestion
    const fCurrent = f(point);
    const gradNorm = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0));

    // Try different step sizes
    const alphas = [1, 0.1, 0.01, 0.001];
    let bestAlpha = 0.01;
    let bestReduction = 0;

    for (const alpha of alphas) {
        const newPoint = point.map((xi, i) => xi - alpha * gradient[i]);
        const fNew = f(newPoint);
        const reduction = fCurrent - fNew;

        if (reduction > bestReduction) {
            bestReduction = reduction;
            bestAlpha = alpha;
        }
    }

    return {
        suggestedAlpha: bestAlpha,
        expectedReduction: bestReduction,
        newPoint: point.map((xi, i) => xi - bestAlpha * gradient[i])
    };
}
