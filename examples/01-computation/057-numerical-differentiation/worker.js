/**
 * Web Worker: Numerical Differentiation
 * Various methods for computing derivatives numerically
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'forward':
                result = forwardDifference(data.values, data.h);
                break;
            case 'backward':
                result = backwardDifference(data.values, data.h);
                break;
            case 'central':
                result = centralDifference(data.values, data.h);
                break;
            case 'higherorder':
                result = higherOrderDerivatives(data.values, data.h, data.order);
                break;
            case 'richardson':
                result = richardsonExtrapolation(data.values, data.h);
                break;
            case 'compare':
                result = compareAllMethods(data.values, data.h);
                break;
            default:
                throw new Error('Unknown calculation type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', calculationType: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Forward Difference: f'(x) ≈ (f(x+h) - f(x)) / h
 * First-order accurate O(h)
 */
function forwardDifference(values, h) {
    const n = values.length;
    const derivative = [];

    self.postMessage({ type: 'progress', percentage: 20 });

    for (let i = 0; i < n - 1; i++) {
        derivative.push((values[i + 1] - values[i]) / h);
    }
    // Extrapolate last point
    derivative.push(derivative[derivative.length - 1]);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Forward Difference',
        formula: "f'(x) ≈ [f(x+h) - f(x)] / h",
        accuracy: 'O(h) - First order',
        original: values,
        derivative: derivative,
        h: h,
        stats: computeStats(derivative)
    };
}

/**
 * Backward Difference: f'(x) ≈ (f(x) - f(x-h)) / h
 * First-order accurate O(h)
 */
function backwardDifference(values, h) {
    const n = values.length;
    const derivative = [];

    self.postMessage({ type: 'progress', percentage: 20 });

    // Extrapolate first point
    derivative.push((values[1] - values[0]) / h);

    for (let i = 1; i < n; i++) {
        derivative.push((values[i] - values[i - 1]) / h);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Backward Difference',
        formula: "f'(x) ≈ [f(x) - f(x-h)] / h",
        accuracy: 'O(h) - First order',
        original: values,
        derivative: derivative,
        h: h,
        stats: computeStats(derivative)
    };
}

/**
 * Central Difference: f'(x) ≈ (f(x+h) - f(x-h)) / (2h)
 * Second-order accurate O(h²)
 */
function centralDifference(values, h) {
    const n = values.length;
    const derivative = [];

    self.postMessage({ type: 'progress', percentage: 20 });

    // Use forward difference for first point
    derivative.push((values[1] - values[0]) / h);

    // Central difference for interior points
    for (let i = 1; i < n - 1; i++) {
        derivative.push((values[i + 1] - values[i - 1]) / (2 * h));
    }

    // Use backward difference for last point
    derivative.push((values[n - 1] - values[n - 2]) / h);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Central Difference',
        formula: "f'(x) ≈ [f(x+h) - f(x-h)] / (2h)",
        accuracy: 'O(h²) - Second order',
        original: values,
        derivative: derivative,
        h: h,
        stats: computeStats(derivative)
    };
}

/**
 * Higher-order derivatives using finite differences
 */
function higherOrderDerivatives(values, h, maxOrder = 4) {
    const n = values.length;
    const derivatives = [values]; // 0th derivative is original

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let order = 1; order <= maxOrder; order++) {
        const prevDeriv = derivatives[order - 1];
        const currDeriv = [];

        // Use appropriate stencil based on order
        if (order === 1) {
            // Central difference for first derivative
            currDeriv.push((prevDeriv[1] - prevDeriv[0]) / h);
            for (let i = 1; i < n - 1; i++) {
                currDeriv.push((prevDeriv[i + 1] - prevDeriv[i - 1]) / (2 * h));
            }
            currDeriv.push((prevDeriv[n - 1] - prevDeriv[n - 2]) / h);
        } else if (order === 2) {
            // Second derivative: f''(x) ≈ (f(x+h) - 2f(x) + f(x-h)) / h²
            const orig = values;
            currDeriv.push((orig[2] - 2 * orig[1] + orig[0]) / (h * h));
            for (let i = 1; i < n - 1; i++) {
                currDeriv.push((orig[i + 1] - 2 * orig[i] + orig[i - 1]) / (h * h));
            }
            currDeriv.push((orig[n - 1] - 2 * orig[n - 2] + orig[n - 3]) / (h * h));
        } else {
            // Higher derivatives by repeated differentiation
            currDeriv.push((prevDeriv[1] - prevDeriv[0]) / h);
            for (let i = 1; i < n - 1; i++) {
                currDeriv.push((prevDeriv[i + 1] - prevDeriv[i - 1]) / (2 * h));
            }
            currDeriv.push((prevDeriv[n - 1] - prevDeriv[n - 2]) / h);
        }

        derivatives.push(currDeriv);

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((order / maxOrder) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Higher-Order Derivatives',
        maxOrder: maxOrder,
        original: values,
        derivatives: derivatives,
        h: h,
        labels: Array.from({ length: maxOrder + 1 }, (_, i) =>
            i === 0 ? 'f(x)' : `f${"'".repeat(i)}(x)`
        ),
        stats: derivatives.map((d, i) => ({
            order: i,
            ...computeStats(d)
        }))
    };
}

/**
 * Richardson Extrapolation for improved accuracy
 * Combines estimates with different step sizes
 */
function richardsonExtrapolation(values, h) {
    const n = values.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Compute derivative with h
    const d1 = [];
    for (let i = 1; i < n - 1; i++) {
        d1.push((values[i + 1] - values[i - 1]) / (2 * h));
    }

    self.postMessage({ type: 'progress', percentage: 40 });

    // Compute derivative with 2h (using every other point)
    const d2 = [];
    for (let i = 2; i < n - 2; i += 2) {
        d2.push((values[i + 2] - values[i - 2]) / (4 * h));
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Richardson extrapolation: (4*D(h) - D(2h)) / 3
    // This gives O(h⁴) accuracy
    const richardson = [];
    const matchIndices = [];

    for (let i = 1; i < n - 1; i++) {
        const d1Idx = i - 1;
        const d2Idx = Math.floor((i - 2) / 2);

        if (i >= 2 && i < n - 2 && (i - 2) % 2 === 0 && d2Idx < d2.length) {
            richardson.push((4 * d1[d1Idx] - d2[d2Idx]) / 3);
            matchIndices.push(i);
        } else {
            richardson.push(d1[d1Idx]);
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Richardson Extrapolation',
        formula: "f'(x) ≈ [4D(h) - D(2h)] / 3",
        accuracy: 'O(h⁴) - Fourth order',
        original: values,
        derivativeH: [NaN, ...d1, NaN],
        derivativeRichardson: [NaN, ...richardson, NaN],
        h: h,
        stats: {
            h: computeStats(d1),
            richardson: computeStats(richardson)
        }
    };
}

/**
 * Compare all differentiation methods
 */
function compareAllMethods(values, h) {
    const n = values.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    const forward = [];
    const backward = [];
    const central = [];
    const fivePoint = [];

    // Forward difference
    for (let i = 0; i < n - 1; i++) {
        forward.push((values[i + 1] - values[i]) / h);
    }
    forward.push(forward[forward.length - 1]);

    self.postMessage({ type: 'progress', percentage: 30 });

    // Backward difference
    backward.push((values[1] - values[0]) / h);
    for (let i = 1; i < n; i++) {
        backward.push((values[i] - values[i - 1]) / h);
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Central difference
    central.push((values[1] - values[0]) / h);
    for (let i = 1; i < n - 1; i++) {
        central.push((values[i + 1] - values[i - 1]) / (2 * h));
    }
    central.push((values[n - 1] - values[n - 2]) / h);

    self.postMessage({ type: 'progress', percentage: 70 });

    // Five-point stencil: f'(x) ≈ (-f(x+2h) + 8f(x+h) - 8f(x-h) + f(x-2h)) / (12h)
    // O(h⁴) accuracy
    for (let i = 0; i < n; i++) {
        if (i < 2 || i >= n - 2) {
            fivePoint.push(central[i]);
        } else {
            const fp = (-values[i + 2] + 8 * values[i + 1] - 8 * values[i - 1] + values[i - 2]) / (12 * h);
            fivePoint.push(fp);
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Method Comparison',
        original: values,
        methods: {
            forward: {
                name: 'Forward Difference',
                accuracy: 'O(h)',
                values: forward
            },
            backward: {
                name: 'Backward Difference',
                accuracy: 'O(h)',
                values: backward
            },
            central: {
                name: 'Central Difference',
                accuracy: 'O(h²)',
                values: central
            },
            fivePoint: {
                name: 'Five-Point Stencil',
                accuracy: 'O(h⁴)',
                values: fivePoint
            }
        },
        h: h,
        comparison: {
            forward: computeStats(forward),
            backward: computeStats(backward),
            central: computeStats(central),
            fivePoint: computeStats(fivePoint)
        }
    };
}

/**
 * Compute statistics for derivative array
 */
function computeStats(arr) {
    const valid = arr.filter(v => isFinite(v));
    if (valid.length === 0) return { min: 'N/A', max: 'N/A', mean: 'N/A', rms: 'N/A' };

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const rms = Math.sqrt(valid.reduce((sum, v) => sum + v * v, 0) / valid.length);

    return {
        min: min.toFixed(6),
        max: max.toFixed(6),
        mean: mean.toFixed(6),
        rms: rms.toFixed(6)
    };
}
