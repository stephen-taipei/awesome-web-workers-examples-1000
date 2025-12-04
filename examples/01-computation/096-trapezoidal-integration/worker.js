/**
 * Web Worker for Trapezoidal Integration
 * Numerical integration using the composite trapezoidal rule
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, a, b, n, compareN } = data;

        // Create function
        const f = createFunction(functionType, customFunction);

        // Calculate with main n
        const result1 = trapezoidal(f, a, b, n);

        // Calculate with comparison n
        const result2 = trapezoidal(f, a, b, compareN);

        // Get exact value if available
        const exact = getExactValue(functionType, a, b);

        // Calculate convergence data
        const convergence = calculateConvergence(f, a, b, n);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                primary: result1,
                comparison: result2,
                exact,
                convergence,
                functionString: getFunctionString(functionType),
                integralString: getIntegralString(functionType),
                a, b, n, compareN
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
        case 'polynomial':
            return x => x * x;
        case 'sin':
            return x => Math.sin(x);
        case 'exp':
            return x => Math.exp(x);
        case 'gaussian':
            return x => Math.exp(-x * x);
        case 'sqrt':
            return x => Math.sqrt(x);
        case 'rational':
            return x => 1 / (1 + x * x);
        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return x => x * x;
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x²';
        case 'sin': return 'sin(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return 'e^(-x²)';
        case 'sqrt': return '√x';
        case 'rational': return '1/(1+x²)';
        default: return 'f(x)';
    }
}

function getIntegralString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x³/3';
        case 'sin': return '-cos(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return '√π·erf(x)/2';
        case 'sqrt': return '2x^(3/2)/3';
        case 'rational': return 'arctan(x)';
        default: return '∫f(x)dx';
    }
}

function getExactValue(functionType, a, b) {
    switch (functionType) {
        case 'polynomial':
            return (Math.pow(b, 3) - Math.pow(a, 3)) / 3;
        case 'sin':
            return -Math.cos(b) + Math.cos(a);
        case 'exp':
            return Math.exp(b) - Math.exp(a);
        case 'sqrt':
            if (a < 0) return null;
            return (2/3) * (Math.pow(b, 1.5) - Math.pow(a, 1.5));
        case 'rational':
            return Math.atan(b) - Math.atan(a);
        case 'gaussian':
            // No closed form, return null
            return null;
        default:
            return null;
    }
}

function trapezoidal(f, a, b, n) {
    const h = (b - a) / n;
    let sum = (f(a) + f(b)) / 2;

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += f(x);

        // Report progress for large n
        if (n > 10000 && i % Math.floor(n / 20) === 0) {
            reportProgress(10 + 60 * (i / n));
        }
    }

    return {
        value: h * sum,
        n,
        h,
        evaluations: n + 1
    };
}

function calculateConvergence(f, a, b, targetN) {
    const results = [];
    const nValues = [10, 50, 100, 500, 1000];

    // Add target n if not in list
    if (!nValues.includes(targetN) && targetN <= 100000) {
        nValues.push(targetN);
        nValues.sort((x, y) => x - y);
    }

    // Add some larger values
    if (targetN >= 1000) {
        nValues.push(5000, 10000);
    }

    let prevResult = null;

    for (const n of nValues) {
        if (n > 100000) continue; // Cap for performance

        const result = trapezoidal(f, a, b, n);

        let richardsonEstimate = null;
        let errorRatio = null;

        if (prevResult) {
            // Richardson extrapolation estimate
            richardsonEstimate = (4 * result.value - prevResult.value) / 3;

            // Error ratio (should approach 4 for O(h²))
            if (results.length >= 2) {
                const prev2 = results[results.length - 2];
                const prev1 = results[results.length - 1];
                const e1 = Math.abs(prev1.value - result.value);
                const e2 = Math.abs(prev2.value - prev1.value);
                if (e1 > 1e-16) {
                    errorRatio = e2 / e1;
                }
            }
        }

        results.push({
            n,
            h: result.h,
            value: result.value,
            richardsonEstimate,
            errorRatio
        });

        prevResult = result;
    }

    reportProgress(90);

    return results;
}
