/**
 * Web Worker for Simpson's Integration
 * Numerical integration using composite Simpson's 1/3 and 3/8 rules
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, a, b, n, method } = data;

        // Create function
        const f = createFunction(functionType, customFunction);

        let result;
        if (method === 'both') {
            result = {
                simpson13: simpson13(f, a, b, n),
                simpson38: simpson38(f, a, b, n),
                trapezoidal: trapezoidal(f, a, b, n)
            };
        } else if (method === '3/8') {
            result = {
                simpson38: simpson38(f, a, b, n)
            };
        } else {
            result = {
                simpson13: simpson13(f, a, b, n)
            };
        }

        // Get exact value if available
        const exact = getExactValue(functionType, a, b);

        // Calculate convergence data
        const convergence = calculateConvergence(f, a, b);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                ...result,
                exact,
                convergence,
                functionString: getFunctionString(functionType),
                integralString: getIntegralString(functionType),
                a, b, n, method
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
            return x => x * x * x;
        case 'sin':
            return x => Math.sin(x);
        case 'exp':
            return x => Math.exp(x);
        case 'gaussian':
            return x => Math.exp(-x * x);
        case 'log':
            return x => Math.log(x);
        case 'rational':
            return x => 1 / (1 + x * x);
        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return x => x * x * x;
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x³';
        case 'sin': return 'sin(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return 'e^(-x²)';
        case 'log': return 'ln(x)';
        case 'rational': return '1/(1+x²)';
        default: return 'f(x)';
    }
}

function getIntegralString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x⁴/4';
        case 'sin': return '-cos(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return '√π·erf(x)/2';
        case 'log': return 'x·ln(x) - x';
        case 'rational': return 'arctan(x)';
        default: return '∫f(x)dx';
    }
}

function getExactValue(functionType, a, b) {
    switch (functionType) {
        case 'polynomial':
            return (Math.pow(b, 4) - Math.pow(a, 4)) / 4;
        case 'sin':
            return -Math.cos(b) + Math.cos(a);
        case 'exp':
            return Math.exp(b) - Math.exp(a);
        case 'log':
            if (a <= 0) return null;
            const F = x => x * Math.log(x) - x;
            return F(b) - F(a);
        case 'rational':
            return Math.atan(b) - Math.atan(a);
        case 'gaussian':
            return null;
        default:
            return null;
    }
}

// Simpson's 1/3 Rule (requires even n)
function simpson13(f, a, b, n) {
    // Ensure n is even
    if (n % 2 !== 0) n++;

    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        const weight = (i % 2 === 0) ? 2 : 4;
        sum += weight * f(x);

        if (n > 10000 && i % Math.floor(n / 10) === 0) {
            reportProgress(10 + 30 * (i / n));
        }
    }

    return {
        value: (h / 3) * sum,
        n,
        h,
        evaluations: n + 1,
        rule: "1/3"
    };
}

// Simpson's 3/8 Rule (requires n divisible by 3)
function simpson38(f, a, b, n) {
    // Adjust n to be divisible by 3
    while (n % 3 !== 0) n++;

    const h = (b - a) / n;
    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        const weight = (i % 3 === 0) ? 2 : 3;
        sum += weight * f(x);

        if (n > 10000 && i % Math.floor(n / 10) === 0) {
            reportProgress(40 + 30 * (i / n));
        }
    }

    return {
        value: (3 * h / 8) * sum,
        n,
        h,
        evaluations: n + 1,
        rule: "3/8"
    };
}

// Trapezoidal for comparison
function trapezoidal(f, a, b, n) {
    const h = (b - a) / n;
    let sum = (f(a) + f(b)) / 2;

    for (let i = 1; i < n; i++) {
        sum += f(a + i * h);
    }

    return {
        value: h * sum,
        n,
        h,
        evaluations: n + 1,
        rule: "Trapezoidal"
    };
}

function calculateConvergence(f, a, b) {
    const results = [];
    const nValues = [10, 20, 50, 100, 200, 500, 1000];

    for (const n of nValues) {
        const s13 = simpson13(f, a, b, n);
        const trap = trapezoidal(f, a, b, n);

        results.push({
            n,
            simpson13: s13.value,
            trapezoidal: trap.value,
            diff: Math.abs(s13.value - trap.value)
        });
    }

    reportProgress(90);
    return results;
}
