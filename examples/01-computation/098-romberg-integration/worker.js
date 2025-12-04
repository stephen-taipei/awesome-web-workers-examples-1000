/**
 * Web Worker for Romberg Integration
 * High-precision numerical integration using Richardson extrapolation
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, a, b, maxLevel, tolerance } = data;

        // Create function
        const f = createFunction(functionType, customFunction);

        // Run Romberg integration
        const result = romberg(f, a, b, maxLevel, tolerance);

        // Get exact value if available
        const exact = getExactValue(functionType, a, b);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                ...result,
                exact,
                functionString: getFunctionString(functionType),
                integralString: getIntegralString(functionType),
                a, b
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
            return x => Math.pow(x, 4);
        case 'sin':
            return x => Math.sin(x);
        case 'exp':
            return x => Math.exp(x);
        case 'gaussian':
            return x => Math.exp(-x * x);
        case 'oscillatory':
            return x => Math.sin(10 * x);
        case 'rational':
            return x => 1 / (1 + x * x);
        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return x => Math.pow(x, 4);
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x⁴';
        case 'sin': return 'sin(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return 'e^(-x²)';
        case 'oscillatory': return 'sin(10x)';
        case 'rational': return '1/(1+x²)';
        default: return 'f(x)';
    }
}

function getIntegralString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x⁵/5';
        case 'sin': return '-cos(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return '√π·erf(x)/2';
        case 'oscillatory': return '-cos(10x)/10';
        case 'rational': return 'arctan(x)';
        default: return '∫f(x)dx';
    }
}

function getExactValue(functionType, a, b) {
    switch (functionType) {
        case 'polynomial':
            return (Math.pow(b, 5) - Math.pow(a, 5)) / 5;
        case 'sin':
            return -Math.cos(b) + Math.cos(a);
        case 'exp':
            return Math.exp(b) - Math.exp(a);
        case 'oscillatory':
            return (-Math.cos(10 * b) + Math.cos(10 * a)) / 10;
        case 'rational':
            return Math.atan(b) - Math.atan(a);
        case 'gaussian':
            return null;
        default:
            return null;
    }
}

function romberg(f, a, b, maxLevel, tolerance) {
    // R[k][j] is the Romberg table
    // R[k][0] = trapezoidal with 2^k subintervals
    // R[k][j] = Richardson extrapolation

    const R = [];
    for (let i = 0; i <= maxLevel; i++) {
        R[i] = new Array(i + 1).fill(0);
    }

    // Initialize R[0][0] with simple trapezoidal
    const h0 = b - a;
    R[0][0] = h0 * (f(a) + f(b)) / 2;

    let converged = false;
    let finalLevel = 0;
    let functionEvaluations = 2;

    reportProgress(5);

    for (let k = 1; k <= maxLevel; k++) {
        // Compute R[k][0] using trapezoidal rule with 2^k subintervals
        const n = Math.pow(2, k);
        const h = (b - a) / n;

        // Use the recursive property: add new midpoints
        let sum = 0;
        for (let i = 1; i <= n / 2; i++) {
            const x = a + (2 * i - 1) * h;
            sum += f(x);
            functionEvaluations++;
        }

        R[k][0] = R[k - 1][0] / 2 + h * sum;

        // Richardson extrapolation
        for (let j = 1; j <= k; j++) {
            const factor = Math.pow(4, j);
            R[k][j] = R[k][j - 1] + (R[k][j - 1] - R[k - 1][j - 1]) / (factor - 1);
        }

        finalLevel = k;

        // Check convergence
        if (k >= 2) {
            const error = Math.abs(R[k][k] - R[k - 1][k - 1]);
            if (error < tolerance) {
                converged = true;
                break;
            }
        }

        reportProgress(10 + 80 * (k / maxLevel));
    }

    // Build the Romberg table for display
    const table = [];
    for (let k = 0; k <= finalLevel; k++) {
        const row = {
            level: k,
            n: Math.pow(2, k),
            h: (b - a) / Math.pow(2, k),
            values: R[k].slice(0, k + 1)
        };
        table.push(row);
    }

    // Calculate error estimates for each column
    const errorEstimates = [];
    for (let j = 0; j <= finalLevel; j++) {
        if (finalLevel > j) {
            const error = Math.abs(R[finalLevel][j] - R[finalLevel - 1][Math.min(j, finalLevel - 1)]);
            errorEstimates.push({
                column: j,
                order: 2 * (j + 1),
                error
            });
        }
    }

    reportProgress(100);

    return {
        value: R[finalLevel][finalLevel],
        finalLevel,
        converged,
        tolerance,
        functionEvaluations,
        table,
        errorEstimates,
        trapezoidalValue: R[finalLevel][0],
        simpsonValue: finalLevel >= 1 ? R[finalLevel][1] : null
    };
}
