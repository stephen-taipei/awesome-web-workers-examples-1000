/**
 * Web Worker for Numerical Differentiation
 * Compute derivatives using finite difference formulas
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, x, h, method } = data;

        // Create function and its derivative
        const f = createFunction(functionType, customFunction);
        const exactDf = getExactDerivative(functionType);

        // Calculate derivatives
        let results;
        if (method === 'all') {
            results = {
                forward: forwardDifference(f, x, h),
                backward: backwardDifference(f, x, h),
                central: centralDifference(f, x, h),
                fivePoint: fivePointFormula(f, x, h)
            };
        } else {
            results = {};
            switch (method) {
                case 'forward':
                    results.forward = forwardDifference(f, x, h);
                    break;
                case 'backward':
                    results.backward = backwardDifference(f, x, h);
                    break;
                case 'central':
                    results.central = centralDifference(f, x, h);
                    break;
                case 'five-point':
                    results.fivePoint = fivePointFormula(f, x, h);
                    break;
            }
        }

        // Calculate exact derivative if available
        const exact = exactDf ? exactDf(x) : null;

        // Calculate convergence analysis
        const convergence = calculateConvergence(f, x, exactDf);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                results,
                exact,
                convergence,
                functionString: getFunctionString(functionType),
                derivativeString: getDerivativeString(functionType),
                x, h, method
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
            return x => Math.pow(x, 3);
        case 'log':
            return x => Math.log(x);
        case 'sqrt':
            return x => Math.sqrt(x);
        case 'trig':
            return x => Math.sin(x) * Math.cos(x);
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

function getExactDerivative(functionType) {
    switch (functionType) {
        case 'sin':
            return x => Math.cos(x);
        case 'exp':
            return x => Math.exp(x);
        case 'polynomial':
            return x => 3 * Math.pow(x, 2);
        case 'log':
            return x => 1 / x;
        case 'sqrt':
            return x => 1 / (2 * Math.sqrt(x));
        case 'trig':
            return x => Math.cos(2 * x); // d/dx[sin(x)cos(x)] = cos(2x)
        default:
            return null;
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'sin': return 'sin(x)';
        case 'exp': return 'eˣ';
        case 'polynomial': return 'x³';
        case 'log': return 'ln(x)';
        case 'sqrt': return '√x';
        case 'trig': return 'sin(x)·cos(x)';
        default: return 'f(x)';
    }
}

function getDerivativeString(functionType) {
    switch (functionType) {
        case 'sin': return 'cos(x)';
        case 'exp': return 'eˣ';
        case 'polynomial': return '3x²';
        case 'log': return '1/x';
        case 'sqrt': return '1/(2√x)';
        case 'trig': return 'cos(2x)';
        default: return "f'(x)";
    }
}

// Forward difference: f'(x) ≈ [f(x+h) - f(x)] / h
function forwardDifference(f, x, h) {
    const value = (f(x + h) - f(x)) / h;
    return {
        value,
        formula: "[f(x+h) - f(x)] / h",
        order: "O(h)",
        evaluations: 2
    };
}

// Backward difference: f'(x) ≈ [f(x) - f(x-h)] / h
function backwardDifference(f, x, h) {
    const value = (f(x) - f(x - h)) / h;
    return {
        value,
        formula: "[f(x) - f(x-h)] / h",
        order: "O(h)",
        evaluations: 2
    };
}

// Central difference: f'(x) ≈ [f(x+h) - f(x-h)] / 2h
function centralDifference(f, x, h) {
    const value = (f(x + h) - f(x - h)) / (2 * h);
    return {
        value,
        formula: "[f(x+h) - f(x-h)] / 2h",
        order: "O(h²)",
        evaluations: 2
    };
}

// Five-point formula: higher accuracy
// f'(x) ≈ [-f(x+2h) + 8f(x+h) - 8f(x-h) + f(x-2h)] / 12h
function fivePointFormula(f, x, h) {
    const value = (-f(x + 2*h) + 8*f(x + h) - 8*f(x - h) + f(x - 2*h)) / (12 * h);
    return {
        value,
        formula: "[-f(x+2h) + 8f(x+h) - 8f(x-h) + f(x-2h)] / 12h",
        order: "O(h⁴)",
        evaluations: 4
    };
}

function calculateConvergence(f, x, exactDf) {
    if (!exactDf) return null;

    const exact = exactDf(x);
    const hValues = [0.1, 0.05, 0.01, 0.005, 0.001, 0.0005, 0.0001, 0.00005, 0.00001];
    const results = [];

    for (const h of hValues) {
        const forward = forwardDifference(f, x, h);
        const central = centralDifference(f, x, h);
        const fivePoint = fivePointFormula(f, x, h);

        results.push({
            h,
            forwardError: Math.abs(forward.value - exact),
            centralError: Math.abs(central.value - exact),
            fivePointError: Math.abs(fivePoint.value - exact)
        });

        reportProgress(10 + 80 * hValues.indexOf(h) / hValues.length);
    }

    // Calculate convergence rates
    for (let i = 1; i < results.length; i++) {
        const hRatio = results[i-1].h / results[i].h;

        if (results[i].forwardError > 1e-15 && results[i-1].forwardError > 1e-15) {
            results[i].forwardRate = Math.log(results[i-1].forwardError / results[i].forwardError) / Math.log(hRatio);
        }

        if (results[i].centralError > 1e-15 && results[i-1].centralError > 1e-15) {
            results[i].centralRate = Math.log(results[i-1].centralError / results[i].centralError) / Math.log(hRatio);
        }

        if (results[i].fivePointError > 1e-15 && results[i-1].fivePointError > 1e-15) {
            results[i].fivePointRate = Math.log(results[i-1].fivePointError / results[i].fivePointError) / Math.log(hRatio);
        }
    }

    reportProgress(100);
    return results;
}
