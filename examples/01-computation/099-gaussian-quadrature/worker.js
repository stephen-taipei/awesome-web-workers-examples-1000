/**
 * Web Worker for Gaussian Quadrature (Gauss-Legendre)
 * High-precision numerical integration using optimal nodes and weights
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, a, b, n, compareWith } = data;

        // Create function
        const f = createFunction(functionType, customFunction);

        // Calculate with main n
        const result1 = gaussLegendre(f, a, b, n);

        // Calculate with comparison n
        const result2 = gaussLegendre(f, a, b, compareWith);

        // Get exact value if available
        const exact = getExactValue(functionType, a, b);

        // Calculate convergence
        const convergence = calculateConvergence(f, a, b);

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
                a, b, n, compareWith
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
            return x => Math.pow(x, 5);
        case 'sin':
            return x => Math.sin(x);
        case 'exp':
            return x => Math.exp(x);
        case 'gaussian':
            return x => Math.exp(-x * x);
        case 'sqrt':
            return x => Math.sqrt(Math.max(0, 1 - x * x));
        case 'rational':
            return x => 1 / (1 + x * x);
        case 'oscillatory':
            return x => Math.sin(5 * x) * Math.cos(3 * x);
        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return x => Math.pow(x, 5);
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x⁵';
        case 'sin': return 'sin(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return 'e^(-x²)';
        case 'sqrt': return '√(1-x²)';
        case 'rational': return '1/(1+x²)';
        case 'oscillatory': return 'sin(5x)·cos(3x)';
        default: return 'f(x)';
    }
}

function getIntegralString(functionType) {
    switch (functionType) {
        case 'polynomial': return 'x⁶/6';
        case 'sin': return '-cos(x)';
        case 'exp': return 'eˣ';
        case 'gaussian': return '√π·erf(x)/2';
        case 'sqrt': return 'π/2 (for [-1,1])';
        case 'rational': return 'arctan(x)';
        case 'oscillatory': return 'complex';
        default: return '∫f(x)dx';
    }
}

function getExactValue(functionType, a, b) {
    switch (functionType) {
        case 'polynomial':
            return (Math.pow(b, 6) - Math.pow(a, 6)) / 6;
        case 'sin':
            return -Math.cos(b) + Math.cos(a);
        case 'exp':
            return Math.exp(b) - Math.exp(a);
        case 'sqrt':
            if (a === -1 && b === 1) return Math.PI / 2;
            return null;
        case 'rational':
            return Math.atan(b) - Math.atan(a);
        case 'oscillatory':
            // sin(5x)cos(3x) = (sin(8x) + sin(2x))/2
            return (-Math.cos(8*b)/(16) - Math.cos(2*b)/(4)) - (-Math.cos(8*a)/(16) - Math.cos(2*a)/(4));
        default:
            return null;
    }
}

// Precomputed Gauss-Legendre nodes and weights for [-1, 1]
// These are computed using the Golub-Welsch algorithm
function getGaussLegendreNodesWeights(n) {
    // For small n, use precomputed high-precision values
    const precomputed = {
        2: {
            nodes: [-0.5773502691896257, 0.5773502691896257],
            weights: [1.0, 1.0]
        },
        3: {
            nodes: [-0.7745966692414834, 0.0, 0.7745966692414834],
            weights: [0.5555555555555556, 0.8888888888888888, 0.5555555555555556]
        },
        4: {
            nodes: [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526],
            weights: [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538]
        },
        5: {
            nodes: [-0.9061798459386640, -0.5384693101056831, 0.0, 0.5384693101056831, 0.9061798459386640],
            weights: [0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665, 0.2369268850561891]
        }
    };

    if (precomputed[n]) {
        return precomputed[n];
    }

    // For larger n, compute using the Golub-Welsch algorithm
    return computeGaussLegendre(n);
}

function computeGaussLegendre(n) {
    // Golub-Welsch algorithm: eigenvalue problem for tridiagonal matrix
    const nodes = new Array(n);
    const weights = new Array(n);

    // For Legendre polynomials, the tridiagonal matrix has:
    // diagonal = 0
    // off-diagonal[i] = i / sqrt(4*i*i - 1)

    // We use Newton's method to find roots of Legendre polynomial
    for (let i = 0; i < n; i++) {
        // Initial guess using Chebyshev nodes approximation
        let x = Math.cos(Math.PI * (i + 0.75) / (n + 0.5));

        // Newton's method to refine
        for (let iter = 0; iter < 20; iter++) {
            const [p, dp] = legendreWithDerivative(n, x);
            const dx = p / dp;
            x -= dx;
            if (Math.abs(dx) < 1e-15) break;
        }

        nodes[i] = x;

        // Weight formula: w_i = 2 / ((1 - x_i^2) * [P'_n(x_i)]^2)
        const [, dp] = legendreWithDerivative(n, x);
        weights[i] = 2 / ((1 - x * x) * dp * dp);
    }

    // Sort nodes in ascending order
    const indices = nodes.map((_, i) => i).sort((a, b) => nodes[a] - nodes[b]);
    const sortedNodes = indices.map(i => nodes[i]);
    const sortedWeights = indices.map(i => weights[i]);

    return { nodes: sortedNodes, weights: sortedWeights };
}

function legendreWithDerivative(n, x) {
    // Compute P_n(x) and P'_n(x) using recurrence
    if (n === 0) return [1, 0];
    if (n === 1) return [x, 1];

    let p0 = 1, p1 = x;
    let dp0 = 0, dp1 = 1;

    for (let k = 2; k <= n; k++) {
        const p2 = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
        const dp2 = ((2 * k - 1) * (p1 + x * dp1) - (k - 1) * dp0) / k;
        p0 = p1; p1 = p2;
        dp0 = dp1; dp1 = dp2;
    }

    return [p1, dp1];
}

function gaussLegendre(f, a, b, n) {
    const { nodes, weights } = getGaussLegendreNodesWeights(n);

    // Transform from [-1, 1] to [a, b]
    const scale = (b - a) / 2;
    const shift = (a + b) / 2;

    let sum = 0;
    const evaluations = [];

    for (let i = 0; i < n; i++) {
        const x = scale * nodes[i] + shift;
        const fx = f(x);
        const contribution = weights[i] * fx;
        sum += contribution;

        evaluations.push({
            i: i + 1,
            node: nodes[i],
            x,
            fx,
            weight: weights[i],
            contribution
        });
    }

    const value = scale * sum;

    return {
        value,
        n,
        evaluations: evaluations.slice(0, 15), // Limit for display
        nodes,
        weights
    };
}

function calculateConvergence(f, a, b) {
    const results = [];
    const nValues = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

    for (const n of nValues) {
        const result = gaussLegendre(f, a, b, n);
        results.push({
            n,
            value: result.value
        });
    }

    // Calculate differences
    for (let i = 1; i < results.length; i++) {
        results[i].diff = Math.abs(results[i].value - results[i - 1].value);
    }

    reportProgress(90);
    return results;
}
