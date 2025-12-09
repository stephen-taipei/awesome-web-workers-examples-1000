/**
 * Web Worker for Higher-Order Derivatives
 * Compute derivatives using finite differences and Richardson extrapolation
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, x, h, maxOrder, method } = data;

        // Create function
        const f = createFunction(functionType, customFunction);
        const exactDerivatives = getExactDerivatives(functionType);

        reportProgress(10);

        // Calculate derivatives using different methods
        const results = {};

        if (method === 'all' || method === 'central') {
            results.central = calculateCentralDifferences(f, x, h, maxOrder);
            reportProgress(40);
        }

        if (method === 'all' || method === 'richardson') {
            results.richardson = calculateRichardsonExtrapolation(f, x, h, maxOrder);
            reportProgress(70);
        }

        // Calculate exact values if available
        const exact = {};
        if (exactDerivatives) {
            for (let order = 1; order <= maxOrder; order++) {
                if (exactDerivatives[order]) {
                    exact[order] = exactDerivatives[order](x);
                }
            }
        }

        // Calculate convergence analysis
        const convergence = calculateConvergence(f, x, maxOrder, exactDerivatives);
        reportProgress(90);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                results,
                exact,
                convergence,
                functionString: getFunctionString(functionType),
                x, h, maxOrder, method
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
        case 'sin':
            return x => Math.sin(x);
        case 'exp':
            return x => Math.exp(x);
        case 'polynomial':
            return x => Math.pow(x, 5) - 3 * Math.pow(x, 3) + 2 * x;
        case 'log':
            return x => Math.log(x);
        case 'trig':
            return x => Math.sin(x) * Math.cos(x);
        case 'gaussian':
            return x => Math.exp(-x * x);
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

function getExactDerivatives(functionType) {
    switch (functionType) {
        case 'sin':
            return {
                1: x => Math.cos(x),
                2: x => -Math.sin(x),
                3: x => -Math.cos(x),
                4: x => Math.sin(x),
                5: x => Math.cos(x),
                6: x => -Math.sin(x)
            };
        case 'exp':
            return {
                1: x => Math.exp(x),
                2: x => Math.exp(x),
                3: x => Math.exp(x),
                4: x => Math.exp(x),
                5: x => Math.exp(x),
                6: x => Math.exp(x)
            };
        case 'polynomial':
            // f(x) = x^5 - 3x^3 + 2x
            return {
                1: x => 5 * Math.pow(x, 4) - 9 * Math.pow(x, 2) + 2,
                2: x => 20 * Math.pow(x, 3) - 18 * x,
                3: x => 60 * Math.pow(x, 2) - 18,
                4: x => 120 * x,
                5: x => 120,
                6: x => 0
            };
        case 'log':
            return {
                1: x => 1 / x,
                2: x => -1 / (x * x),
                3: x => 2 / Math.pow(x, 3),
                4: x => -6 / Math.pow(x, 4),
                5: x => 24 / Math.pow(x, 5),
                6: x => -120 / Math.pow(x, 6)
            };
        case 'trig':
            // f(x) = sin(x)cos(x) = (1/2)sin(2x)
            return {
                1: x => Math.cos(2 * x),
                2: x => -2 * Math.sin(2 * x),
                3: x => -4 * Math.cos(2 * x),
                4: x => 8 * Math.sin(2 * x),
                5: x => 16 * Math.cos(2 * x),
                6: x => -32 * Math.sin(2 * x)
            };
        case 'gaussian':
            // f(x) = e^(-x^2), derivatives get complex
            return {
                1: x => -2 * x * Math.exp(-x * x),
                2: x => (4 * x * x - 2) * Math.exp(-x * x),
                3: x => (-8 * x * x * x + 12 * x) * Math.exp(-x * x),
                4: x => (16 * Math.pow(x, 4) - 48 * x * x + 12) * Math.exp(-x * x)
            };
        default:
            return null;
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'sin': return 'sin(x)';
        case 'exp': return 'eˣ';
        case 'polynomial': return 'x⁵ - 3x³ + 2x';
        case 'log': return 'ln(x)';
        case 'trig': return 'sin(x)·cos(x)';
        case 'gaussian': return 'e^(-x²)';
        default: return 'f(x)';
    }
}

// Central difference formulas for higher-order derivatives
function calculateCentralDifferences(f, x, h, maxOrder) {
    const results = {};

    for (let order = 1; order <= maxOrder; order++) {
        results[order] = centralDifferenceNthOrder(f, x, h, order);
    }

    return results;
}

function centralDifferenceNthOrder(f, x, h, n) {
    // Get coefficients for central difference of order n
    const coeffs = getCentralDiffCoefficients(n);
    const numPoints = coeffs.length;
    const offset = Math.floor(numPoints / 2);

    let sum = 0;
    let evaluations = 0;

    for (let i = 0; i < numPoints; i++) {
        if (coeffs[i] !== 0) {
            sum += coeffs[i] * f(x + (i - offset) * h);
            evaluations++;
        }
    }

    const value = sum / Math.pow(h, n);

    return {
        value,
        formula: getCentralDiffFormula(n),
        order: 'O(h²)',
        evaluations
    };
}

function getCentralDiffCoefficients(n) {
    // Central difference coefficients for derivatives of order n
    // Using standard central difference stencils
    switch (n) {
        case 1:
            return [-1/2, 0, 1/2];
        case 2:
            return [1, -2, 1];
        case 3:
            return [-1/2, 1, 0, -1, 1/2];
        case 4:
            return [1, -4, 6, -4, 1];
        case 5:
            return [-1/2, 2, -5/2, 0, 5/2, -2, 1/2];
        case 6:
            return [1, -6, 15, -20, 15, -6, 1];
        default:
            return [1, -2, 1];
    }
}

function getCentralDiffFormula(n) {
    switch (n) {
        case 1:
            return '[f(x+h) - f(x-h)] / 2h';
        case 2:
            return '[f(x+h) - 2f(x) + f(x-h)] / h²';
        case 3:
            return '[f(x+2h) - 2f(x+h) + 2f(x-h) - f(x-2h)] / 2h³';
        case 4:
            return '[f(x+2h) - 4f(x+h) + 6f(x) - 4f(x-h) + f(x-2h)] / h⁴';
        case 5:
            return '5-point stencil / h⁵';
        case 6:
            return '7-point stencil / h⁶';
        default:
            return 'Central difference';
    }
}

// Richardson extrapolation for improved accuracy
function calculateRichardsonExtrapolation(f, x, h, maxOrder) {
    const results = {};

    for (let order = 1; order <= maxOrder; order++) {
        results[order] = richardsonDerivative(f, x, h, order);
    }

    return results;
}

function richardsonDerivative(f, x, h, n) {
    // Use multiple step sizes and extrapolate
    const levels = 4;
    const table = [];

    // First column: direct central differences with decreasing h
    for (let i = 0; i < levels; i++) {
        const hi = h / Math.pow(2, i);
        const result = centralDifferenceNthOrder(f, x, hi, n);
        table.push([result.value]);
    }

    // Richardson extrapolation
    for (let j = 1; j < levels; j++) {
        const factor = Math.pow(4, j);
        for (let i = j; i < levels; i++) {
            const extrapolated = (factor * table[i][j - 1] - table[i - 1][j - 1]) / (factor - 1);
            table[i].push(extrapolated);
        }
    }

    return {
        value: table[levels - 1][levels - 1],
        table: table.map((row, i) => ({
            h: h / Math.pow(2, i),
            values: row
        })),
        formula: 'Richardson extrapolation',
        order: `O(h^${2 * levels})`,
        evaluations: levels * (2 * n + 1)
    };
}

function calculateConvergence(f, x, maxOrder, exactDerivatives) {
    if (!exactDerivatives) return null;

    const hValues = [0.1, 0.05, 0.025, 0.0125, 0.00625];
    const results = [];

    for (const h of hValues) {
        const row = { h };

        for (let order = 1; order <= Math.min(maxOrder, 4); order++) {
            if (exactDerivatives[order]) {
                const exact = exactDerivatives[order](x);
                const central = centralDifferenceNthOrder(f, x, h, order);
                const richardson = richardsonDerivative(f, x, h, order);

                row[`central_${order}`] = Math.abs(central.value - exact);
                row[`richardson_${order}`] = Math.abs(richardson.value - exact);
            }
        }

        results.push(row);
    }

    return results;
}
