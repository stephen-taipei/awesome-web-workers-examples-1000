/**
 * Web Worker: Numerical Integration
 * Various methods for computing definite integrals numerically
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'rectangle':
                result = rectangleRule(data.values, data.a, data.b, data.variant);
                break;
            case 'trapezoidal':
                result = trapezoidalRule(data.values, data.a, data.b);
                break;
            case 'simpson':
                result = simpsonRule(data.values, data.a, data.b);
                break;
            case 'romberg':
                result = rombergIntegration(data.values, data.a, data.b, data.maxLevel);
                break;
            case 'adaptive':
                result = adaptiveIntegration(data.values, data.a, data.b, data.tolerance);
                break;
            case 'compare':
                result = compareAllMethods(data.values, data.a, data.b);
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
 * Rectangle Rule (Left, Right, or Midpoint)
 */
function rectangleRule(values, a, b, variant = 'midpoint') {
    const n = values.length - 1;
    const h = (b - a) / n;
    let sum = 0;

    self.postMessage({ type: 'progress', percentage: 20 });

    if (variant === 'left') {
        // Left rectangle: use left endpoint of each subinterval
        for (let i = 0; i < n; i++) {
            sum += values[i];
        }
    } else if (variant === 'right') {
        // Right rectangle: use right endpoint
        for (let i = 1; i <= n; i++) {
            sum += values[i];
        }
    } else {
        // Midpoint: use midpoint value (interpolated)
        for (let i = 0; i < n; i++) {
            sum += (values[i] + values[i + 1]) / 2;
        }
    }

    const integral = sum * h;

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: `Rectangle Rule (${variant})`,
        formula: variant === 'midpoint' ?
            '∫f(x)dx ≈ h × Σf(xᵢ + h/2)' :
            `∫f(x)dx ≈ h × Σf(xᵢ) [${variant}]`,
        accuracy: 'O(h²) for midpoint, O(h) for left/right',
        integral: integral,
        a: a,
        b: b,
        n: n,
        h: h,
        values: values
    };
}

/**
 * Trapezoidal Rule
 * ∫f(x)dx ≈ h/2 × [f(x₀) + 2Σf(xᵢ) + f(xₙ)]
 */
function trapezoidalRule(values, a, b) {
    const n = values.length - 1;
    const h = (b - a) / n;

    self.postMessage({ type: 'progress', percentage: 20 });

    let sum = values[0] + values[n];
    for (let i = 1; i < n; i++) {
        sum += 2 * values[i];
    }

    const integral = (h / 2) * sum;

    self.postMessage({ type: 'progress', percentage: 100 });

    // Error estimate (using second derivative approximation)
    let errorEst = 0;
    if (n >= 3) {
        for (let i = 1; i < n; i++) {
            const secondDeriv = (values[i + 1] - 2 * values[i] + values[i - 1]) / (h * h);
            errorEst += Math.abs(secondDeriv);
        }
        errorEst = (b - a) * h * h * errorEst / (12 * (n - 1));
    }

    return {
        method: 'Trapezoidal Rule',
        formula: '∫f(x)dx ≈ h/2 × [f(x₀) + 2Σf(xᵢ) + f(xₙ)]',
        accuracy: 'O(h²)',
        integral: integral,
        errorEstimate: errorEst.toFixed(8),
        a: a,
        b: b,
        n: n,
        h: h,
        values: values
    };
}

/**
 * Simpson's Rule
 * ∫f(x)dx ≈ h/3 × [f(x₀) + 4Σf(x₂ᵢ₋₁) + 2Σf(x₂ᵢ) + f(xₙ)]
 */
function simpsonRule(values, a, b) {
    let n = values.length - 1;
    // Simpson's rule requires even number of intervals
    if (n % 2 !== 0) {
        n = n - 1;
    }

    const h = (b - a) / n;

    self.postMessage({ type: 'progress', percentage: 20 });

    let sum = values[0] + values[n];

    // Odd indices (coefficient 4)
    for (let i = 1; i < n; i += 2) {
        sum += 4 * values[i];
    }

    // Even indices (coefficient 2)
    for (let i = 2; i < n; i += 2) {
        sum += 2 * values[i];
    }

    const integral = (h / 3) * sum;

    self.postMessage({ type: 'progress', percentage: 100 });

    // Error estimate
    let errorEst = 0;
    if (n >= 5) {
        for (let i = 2; i < n - 2; i++) {
            const fourthDeriv = (values[i + 2] - 4 * values[i + 1] + 6 * values[i] -
                               4 * values[i - 1] + values[i - 2]) / (h * h * h * h);
            errorEst += Math.abs(fourthDeriv);
        }
        errorEst = (b - a) * Math.pow(h, 4) * errorEst / (180 * (n - 4));
    }

    return {
        method: "Simpson's Rule",
        formula: "∫f(x)dx ≈ h/3 × [f₀ + 4f₁ + 2f₂ + 4f₃ + ... + fₙ]",
        accuracy: 'O(h⁴)',
        integral: integral,
        errorEstimate: errorEst.toFixed(10),
        a: a,
        b: b,
        n: n,
        h: h,
        values: values.slice(0, n + 1)
    };
}

/**
 * Romberg Integration
 * Uses Richardson extrapolation on trapezoidal rule
 */
function rombergIntegration(values, a, b, maxLevel = 5) {
    const n = values.length - 1;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Build Romberg table
    const R = [];
    for (let i = 0; i <= maxLevel; i++) {
        R.push(new Array(i + 1).fill(0));
    }

    // R[0][0] = simple trapezoidal
    R[0][0] = ((b - a) / 2) * (values[0] + values[n]);

    // Fill first column with composite trapezoidal rule
    for (let i = 1; i <= maxLevel; i++) {
        const step = Math.pow(2, i);
        if (step > n) break;

        const h = (b - a) / step;
        let sum = 0;

        // Use available data points
        const stride = n / step;
        for (let j = 0; j <= step; j++) {
            const idx = Math.round(j * stride);
            if (idx <= n) {
                const coef = (j === 0 || j === step) ? 1 : 2;
                sum += coef * values[idx];
            }
        }

        R[i][0] = (h / 2) * sum;

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((i / maxLevel) * 40)
        });
    }

    // Fill rest of table using Richardson extrapolation
    for (let i = 1; i <= maxLevel; i++) {
        for (let j = 1; j <= i; j++) {
            const factor = Math.pow(4, j);
            R[i][j] = (factor * R[i][j - 1] - R[i - 1][j - 1]) / (factor - 1);
        }

        self.postMessage({
            type: 'progress',
            percentage: 50 + Math.round((i / maxLevel) * 45)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Find best estimate (bottom-right of table)
    let bestLevel = 0;
    for (let i = maxLevel; i >= 0; i--) {
        if (R[i][i] !== 0) {
            bestLevel = i;
            break;
        }
    }

    return {
        method: 'Romberg Integration',
        formula: 'Richardson extrapolation on trapezoidal rule',
        accuracy: `O(h^${2 * (bestLevel + 1)})`,
        integral: R[bestLevel][bestLevel],
        table: R.map((row, i) => row.slice(0, i + 1)),
        levels: bestLevel + 1,
        a: a,
        b: b,
        n: n
    };
}

/**
 * Adaptive Simpson's Integration
 */
function adaptiveIntegration(values, a, b, tolerance = 1e-6) {
    const n = values.length - 1;
    const h = (b - a) / n;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Interpolation function
    function f(x) {
        const idx = (x - a) / h;
        const i = Math.floor(idx);
        if (i >= n) return values[n];
        if (i < 0) return values[0];
        const t = idx - i;
        return values[i] * (1 - t) + values[i + 1] * t;
    }

    // Recursive adaptive Simpson
    function adaptiveSimpson(left, right, fLeft, fMid, fRight, whole, depth = 0) {
        const mid = (left + right) / 2;
        const leftMid = (left + mid) / 2;
        const rightMid = (mid + right) / 2;

        const fLeftMid = f(leftMid);
        const fRightMid = f(rightMid);

        const leftHalf = (mid - left) / 6 * (fLeft + 4 * fLeftMid + fMid);
        const rightHalf = (right - mid) / 6 * (fMid + 4 * fRightMid + fRight);
        const total = leftHalf + rightHalf;

        if (depth > 20 || Math.abs(total - whole) < 15 * tolerance) {
            return total + (total - whole) / 15;
        }

        return adaptiveSimpson(left, mid, fLeft, fLeftMid, fMid, leftHalf, depth + 1) +
               adaptiveSimpson(mid, right, fMid, fRightMid, fRight, rightHalf, depth + 1);
    }

    const fA = f(a);
    const fB = f(b);
    const fMid = f((a + b) / 2);
    const whole = (b - a) / 6 * (fA + 4 * fMid + fB);

    self.postMessage({ type: 'progress', percentage: 50 });

    const integral = adaptiveSimpson(a, b, fA, fMid, fB, whole);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Adaptive Simpson',
        formula: 'Recursive subdivision with error control',
        accuracy: `Tolerance: ${tolerance}`,
        integral: integral,
        tolerance: tolerance,
        a: a,
        b: b,
        n: n
    };
}

/**
 * Compare all integration methods
 */
function compareAllMethods(values, a, b) {
    const n = values.length - 1;
    const h = (b - a) / n;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Left Rectangle
    let leftRect = 0;
    for (let i = 0; i < n; i++) {
        leftRect += values[i];
    }
    leftRect *= h;

    self.postMessage({ type: 'progress', percentage: 25 });

    // Midpoint
    let midpoint = 0;
    for (let i = 0; i < n; i++) {
        midpoint += (values[i] + values[i + 1]) / 2;
    }
    midpoint *= h;

    self.postMessage({ type: 'progress', percentage: 40 });

    // Trapezoidal
    let trap = values[0] + values[n];
    for (let i = 1; i < n; i++) {
        trap += 2 * values[i];
    }
    trap *= h / 2;

    self.postMessage({ type: 'progress', percentage: 55 });

    // Simpson's (need even n)
    let nSimp = n % 2 === 0 ? n : n - 1;
    let hSimp = (b - a) / nSimp;
    let simp = values[0] + values[nSimp];
    for (let i = 1; i < nSimp; i += 2) {
        simp += 4 * values[i];
    }
    for (let i = 2; i < nSimp; i += 2) {
        simp += 2 * values[i];
    }
    simp *= hSimp / 3;

    self.postMessage({ type: 'progress', percentage: 70 });

    // Simpson's 3/8 rule
    let nSimp38 = Math.floor(n / 3) * 3;
    if (nSimp38 < 3) nSimp38 = 3;
    let hSimp38 = (b - a) / nSimp38;
    let simp38 = values[0] + values[nSimp38];
    for (let i = 1; i < nSimp38; i++) {
        simp38 += (i % 3 === 0 ? 2 : 3) * values[i];
    }
    simp38 *= 3 * hSimp38 / 8;

    self.postMessage({ type: 'progress', percentage: 85 });

    // Boole's Rule (need n divisible by 4)
    let nBoole = Math.floor(n / 4) * 4;
    if (nBoole < 4) nBoole = 4;
    let hBoole = (b - a) / nBoole;
    let boole = 7 * (values[0] + values[nBoole]);
    for (let i = 1; i < nBoole; i++) {
        const coef = [32, 12, 32, 14][i % 4] || 14;
        boole += coef * values[i];
    }
    boole *= 2 * hBoole / 45;

    self.postMessage({ type: 'progress', percentage: 100 });

    const results = {
        leftRectangle: { value: leftRect, accuracy: 'O(h)' },
        midpoint: { value: midpoint, accuracy: 'O(h²)' },
        trapezoidal: { value: trap, accuracy: 'O(h²)' },
        simpson: { value: simp, accuracy: 'O(h⁴)' },
        simpson38: { value: simp38, accuracy: 'O(h⁴)' },
        boole: { value: boole, accuracy: 'O(h⁶)' }
    };

    // Find consensus (average of higher-order methods)
    const highOrder = [simp, simp38, boole];
    const consensus = highOrder.reduce((a, b) => a + b, 0) / highOrder.length;

    return {
        method: 'Method Comparison',
        results: results,
        consensus: consensus,
        a: a,
        b: b,
        n: n,
        h: h
    };
}
