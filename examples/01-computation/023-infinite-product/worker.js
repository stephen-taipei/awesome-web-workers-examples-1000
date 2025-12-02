/**
 * Web Worker: Infinite Product Calculator
 *
 * Computes various infinite products and their partial products.
 * Many famous mathematical constants can be expressed as infinite products.
 */

/**
 * Predefined infinite products
 */
const PRODUCTS = {
    // Wallis product: π/2 = ∏(4k²/(4k²-1))
    wallis: {
        name: "Wallis Product for π/2",
        formula: (k) => (4 * k * k) / (4 * k * k - 1),
        startIndex: 1,
        limit: Math.PI / 2,
        description: "∏(4k²/(4k²-1)) = π/2"
    },

    // Vieta's formula: 2/π = ∏(cos(π/2^k))
    vieta: {
        name: "Vieta's Formula for 2/π",
        formula: (k) => Math.cos(Math.PI / Math.pow(2, k)),
        startIndex: 2,
        limit: 2 / Math.PI,
        description: "∏ cos(π/2^k) = 2/π"
    },

    // Euler's product for sine: sin(x)/x = ∏(1 - x²/(k²π²))
    eulerSine: {
        name: "Euler's Product for sin(x)/x",
        formula: (k, params) => 1 - (params.x * params.x) / (k * k * Math.PI * Math.PI),
        startIndex: 1,
        limit: (params) => params.x === 0 ? 1 : Math.sin(params.x) / params.x,
        description: "∏(1 - x²/(k²π²)) = sin(x)/x"
    },

    // Product representation of e: e = ∏((1 + 1/k)^k * e^(-1)) ... simplified version
    // Actually: ∏(1 + 1/k)^k / e^n → 1 (not useful)
    // Better: n!/n^n * e^n → sqrt(2πn) (Stirling)

    // Pentagonal number product: ∏(1-x^k) for |x|<1
    pentagonal: {
        name: "Euler's Pentagonal Product",
        formula: (k, params) => 1 - Math.pow(params.x, k),
        startIndex: 1,
        limit: (params) => "Euler's function φ(x)",
        description: "∏(1 - x^k) = Euler's φ function"
    },

    // Double factorial product related
    // sqrt(π/2) = ∏((2k)/(2k-1) * (2k)/(2k+1))^(1/2) ... Wallis variant

    // Gamma function product: 1/Γ(x) = x * e^(γx) * ∏((1+x/k)*e^(-x/k))

    // Simple convergent product: ∏(1 + 1/k²)
    convergentSimple: {
        name: "Simple Convergent Product",
        formula: (k) => 1 + 1 / (k * k),
        startIndex: 1,
        limit: Math.sinh(Math.PI) / Math.PI,
        description: "∏(1 + 1/k²) = sinh(π)/π"
    },

    // Product for sqrt(2): ∏(1 + (-1)^k/(2k+1)) variant
    // Actually: 2 = ∏((4k²)/(4k²-1)) * 2 ... related to Wallis

    // Telescoping product: ∏(1 - 1/k²) = 1/2 for k>=2
    telescoping: {
        name: "Telescoping Product",
        formula: (k) => 1 - 1 / (k * k),
        startIndex: 2,
        limit: 0.5,
        description: "∏(1 - 1/k²) = 1/2 (k≥2)"
    },

    // Product for 1/e: ∏((k/(k+1))^k)
    inverseE: {
        name: "Product for 1/e",
        formula: (k) => Math.pow(k / (k + 1), k),
        startIndex: 1,
        limit: 1 / Math.E,
        description: "∏(k/(k+1))^k = 1/e"
    },

    // Catalan-like: ∏(1 - 1/(4k²))
    catalanLike: {
        name: "Catalan-like Product",
        formula: (k) => 1 - 1 / (4 * k * k),
        startIndex: 1,
        limit: 2 / Math.PI,
        description: "∏(1 - 1/(4k²)) = 2/π"
    }
};

/**
 * Calculate infinite product
 *
 * @param {string} productName - Name of predefined product
 * @param {number} n - Number of terms
 * @param {object} params - Additional parameters
 * @returns {object} Result with product value and terms
 */
function calculateProduct(productName, n, params = {}) {
    const productDef = PRODUCTS[productName];
    if (!productDef) {
        throw new Error(`Unknown product: ${productName}`);
    }

    let product = 1;
    const terms = [];
    const startIndex = productDef.startIndex;

    for (let k = startIndex; k <= n; k++) {
        const factor = productDef.formula(k, params);

        if (!isFinite(factor) || factor === 0) {
            break;
        }

        product *= factor;

        if (k <= startIndex + 20 || k === n || k % Math.ceil(n / 20) === 0) {
            terms.push({
                k,
                factor: factor.toFixed(10),
                partialProduct: product.toFixed(12)
            });
        }

        if (k % 10000 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k - startIndex + 1,
                total: n - startIndex + 1,
                percentage: Math.round(((k - startIndex + 1) / (n - startIndex + 1)) * 100)
            });
        }
    }

    const limit = typeof productDef.limit === 'function'
        ? productDef.limit(params)
        : productDef.limit;

    return {
        product: product.toFixed(15),
        terms: terms,
        limit: typeof limit === 'number' ? limit.toFixed(15) : limit,
        error: typeof limit === 'number' ? Math.abs(product - limit).toExponential(6) : 'N/A',
        description: productDef.description
    };
}

/**
 * Calculate custom infinite product
 * Formula should use 'k' as the index variable
 *
 * @param {string} expression - Product factor formula
 * @param {number} n - Number of terms
 * @param {number} startIndex - Starting index
 * @returns {object} Result with product value and terms
 */
function calculateCustomProduct(expression, n, startIndex = 1) {
    let product = 1;
    const terms = [];

    const safeEval = (k) => {
        try {
            const expr = expression
                .replace(/\bsin\b/g, 'Math.sin')
                .replace(/\bcos\b/g, 'Math.cos')
                .replace(/\btan\b/g, 'Math.tan')
                .replace(/\bexp\b/g, 'Math.exp')
                .replace(/\blog\b/g, 'Math.log')
                .replace(/\bsqrt\b/g, 'Math.sqrt')
                .replace(/\babs\b/g, 'Math.abs')
                .replace(/\bpow\b/g, 'Math.pow')
                .replace(/\bPI\b/g, 'Math.PI')
                .replace(/\bE\b/g, 'Math.E');

            return eval(expr);
        } catch (e) {
            return NaN;
        }
    };

    for (let k = startIndex; k <= n; k++) {
        const factor = safeEval(k);

        if (!isFinite(factor)) {
            throw new Error(`Invalid factor at k=${k}`);
        }

        if (factor === 0) {
            product = 0;
            terms.push({ k, factor: '0', partialProduct: '0' });
            break;
        }

        product *= factor;

        if (k <= startIndex + 15 || k === n) {
            terms.push({
                k,
                factor: factor.toFixed(10),
                partialProduct: product.toFixed(12)
            });
        }

        if (k % 10000 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k - startIndex + 1,
                total: n - startIndex + 1,
                percentage: Math.round(((k - startIndex + 1) / (n - startIndex + 1)) * 100)
            });
        }
    }

    return {
        product: product.toFixed(15),
        terms: terms,
        limit: 'Unknown (custom product)',
        description: `Custom: ∏(${expression})`
    };
}

/**
 * Get list of available products with descriptions
 */
function getProductList() {
    return Object.entries(PRODUCTS).map(([key, value]) => ({
        id: key,
        name: value.name,
        description: value.description
    }));
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, productName, expression, n, params, startIndex } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'predefined':
                result = calculateProduct(productName, n, params || {});
                break;

            case 'custom':
                result = calculateCustomProduct(expression, n, startIndex || 1);
                break;

            case 'list':
                result = getProductList();
                break;

            default:
                throw new Error(`Unknown calculation type: ${type}`);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            calculationType: type,
            productName: productName,
            expression: expression,
            n: n,
            result: result,
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};
