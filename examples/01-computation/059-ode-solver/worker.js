/**
 * Web Worker: ODE Solver
 * Various methods for solving Ordinary Differential Equations
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'euler':
                result = eulerMethod(data.f, data.y0, data.t0, data.tEnd, data.h);
                break;
            case 'midpoint':
                result = midpointMethod(data.f, data.y0, data.t0, data.tEnd, data.h);
                break;
            case 'rk4':
                result = rungeKutta4(data.f, data.y0, data.t0, data.tEnd, data.h);
                break;
            case 'rk45':
                result = rungeKuttaFehlberg(data.f, data.y0, data.t0, data.tEnd, data.tolerance);
                break;
            case 'system':
                result = solveSystem(data.equations, data.y0, data.t0, data.tEnd, data.h);
                break;
            case 'compare':
                result = compareAllMethods(data.f, data.y0, data.t0, data.tEnd, data.h);
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
 * Parse function string to executable function
 * Supports: t, y, sin, cos, exp, log, sqrt, pow, abs
 */
function parseFunction(fStr) {
    // Create safe function from string
    return function(t, y) {
        try {
            const sin = Math.sin, cos = Math.cos, tan = Math.tan;
            const exp = Math.exp, log = Math.log, sqrt = Math.sqrt;
            const abs = Math.abs, pow = Math.pow;
            const PI = Math.PI, E = Math.E;
            return eval(fStr);
        } catch (e) {
            return 0;
        }
    };
}

/**
 * Euler's Method (First-order)
 * y_{n+1} = y_n + h * f(t_n, y_n)
 */
function eulerMethod(fStr, y0, t0, tEnd, h) {
    const f = parseFunction(fStr);
    const steps = Math.ceil((tEnd - t0) / h);
    const t = [t0];
    const y = [y0];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < steps; i++) {
        const ti = t[i];
        const yi = y[i];
        const slope = f(ti, yi);

        t.push(ti + h);
        y.push(yi + h * slope);

        if (i % Math.ceil(steps / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((i / steps) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: "Euler's Method",
        formula: 'y_{n+1} = y_n + h × f(t_n, y_n)',
        accuracy: 'O(h) - First Order',
        t: t,
        y: y,
        steps: steps,
        h: h,
        t0: t0,
        tEnd: tEnd,
        y0: y0,
        equation: fStr
    };
}

/**
 * Midpoint Method (Second-order)
 * y_{n+1} = y_n + h * f(t_n + h/2, y_n + (h/2)*f(t_n, y_n))
 */
function midpointMethod(fStr, y0, t0, tEnd, h) {
    const f = parseFunction(fStr);
    const steps = Math.ceil((tEnd - t0) / h);
    const t = [t0];
    const y = [y0];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < steps; i++) {
        const ti = t[i];
        const yi = y[i];

        const k1 = f(ti, yi);
        const k2 = f(ti + h/2, yi + (h/2) * k1);

        t.push(ti + h);
        y.push(yi + h * k2);

        if (i % Math.ceil(steps / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((i / steps) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Midpoint Method',
        formula: 'y_{n+1} = y_n + h × f(t_n + h/2, y_n + (h/2)×k₁)',
        accuracy: 'O(h²) - Second Order',
        t: t,
        y: y,
        steps: steps,
        h: h,
        t0: t0,
        tEnd: tEnd,
        y0: y0,
        equation: fStr
    };
}

/**
 * Classical Runge-Kutta (Fourth-order)
 * The workhorse of ODE solvers
 */
function rungeKutta4(fStr, y0, t0, tEnd, h) {
    const f = parseFunction(fStr);
    const steps = Math.ceil((tEnd - t0) / h);
    const t = [t0];
    const y = [y0];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < steps; i++) {
        const ti = t[i];
        const yi = y[i];

        const k1 = f(ti, yi);
        const k2 = f(ti + h/2, yi + (h/2) * k1);
        const k3 = f(ti + h/2, yi + (h/2) * k2);
        const k4 = f(ti + h, yi + h * k3);

        t.push(ti + h);
        y.push(yi + (h/6) * (k1 + 2*k2 + 2*k3 + k4));

        if (i % Math.ceil(steps / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((i / steps) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Runge-Kutta 4 (RK4)',
        formula: 'y_{n+1} = y_n + (h/6)(k₁ + 2k₂ + 2k₃ + k₄)',
        accuracy: 'O(h⁴) - Fourth Order',
        t: t,
        y: y,
        steps: steps,
        h: h,
        t0: t0,
        tEnd: tEnd,
        y0: y0,
        equation: fStr
    };
}

/**
 * Runge-Kutta-Fehlberg (RK45) - Adaptive Step Size
 * Uses 4th and 5th order estimates for error control
 */
function rungeKuttaFehlberg(fStr, y0, t0, tEnd, tolerance = 1e-6) {
    const f = parseFunction(fStr);
    const t = [t0];
    const y = [y0];
    const hValues = [];

    // Initial step size
    let h = (tEnd - t0) / 100;
    const hMin = (tEnd - t0) / 10000;
    const hMax = (tEnd - t0) / 10;

    // RK45 coefficients (Fehlberg)
    const a2 = 1/4, a3 = 3/8, a4 = 12/13, a5 = 1, a6 = 1/2;
    const b21 = 1/4;
    const b31 = 3/32, b32 = 9/32;
    const b41 = 1932/2197, b42 = -7200/2197, b43 = 7296/2197;
    const b51 = 439/216, b52 = -8, b53 = 3680/513, b54 = -845/4104;
    const b61 = -8/27, b62 = 2, b63 = -3544/2565, b64 = 1859/4104, b65 = -11/40;

    // 4th order coefficients
    const c1 = 25/216, c3 = 1408/2565, c4 = 2197/4104, c5 = -1/5;
    // 5th order coefficients
    const d1 = 16/135, d3 = 6656/12825, d4 = 28561/56430, d5 = -9/50, d6 = 2/55;

    self.postMessage({ type: 'progress', percentage: 10 });

    let ti = t0;
    let yi = y0;
    let stepCount = 0;
    const maxSteps = 100000;

    while (ti < tEnd && stepCount < maxSteps) {
        // Ensure we don't overshoot
        if (ti + h > tEnd) {
            h = tEnd - ti;
        }

        // Compute k values
        const k1 = f(ti, yi);
        const k2 = f(ti + a2*h, yi + h*b21*k1);
        const k3 = f(ti + a3*h, yi + h*(b31*k1 + b32*k2));
        const k4 = f(ti + a4*h, yi + h*(b41*k1 + b42*k2 + b43*k3));
        const k5 = f(ti + a5*h, yi + h*(b51*k1 + b52*k2 + b53*k3 + b54*k4));
        const k6 = f(ti + a6*h, yi + h*(b61*k1 + b62*k2 + b63*k3 + b64*k4 + b65*k5));

        // 4th order estimate
        const y4 = yi + h*(c1*k1 + c3*k3 + c4*k4 + c5*k5);
        // 5th order estimate
        const y5 = yi + h*(d1*k1 + d3*k3 + d4*k4 + d5*k5 + d6*k6);

        // Error estimate
        const error = Math.abs(y5 - y4);

        if (error <= tolerance || h <= hMin) {
            // Accept step
            ti += h;
            yi = y5;
            t.push(ti);
            y.push(yi);
            hValues.push(h);
            stepCount++;
        }

        // Adjust step size
        if (error > 0) {
            const s = 0.84 * Math.pow(tolerance / error, 0.25);
            h = Math.min(hMax, Math.max(hMin, s * h));
        }

        if (stepCount % 100 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round(((ti - t0) / (tEnd - t0)) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Runge-Kutta-Fehlberg (RK45)',
        formula: 'Adaptive step with 4th/5th order error control',
        accuracy: `Tolerance: ${tolerance}`,
        t: t,
        y: y,
        steps: stepCount,
        hValues: hValues,
        avgStepSize: hValues.reduce((a, b) => a + b, 0) / hValues.length,
        minStepSize: Math.min(...hValues),
        maxStepSize: Math.max(...hValues),
        t0: t0,
        tEnd: tEnd,
        y0: y0,
        equation: fStr
    };
}

/**
 * Solve system of first-order ODEs using RK4
 * dy₁/dt = f₁(t, y₁, y₂, ...)
 * dy₂/dt = f₂(t, y₁, y₂, ...)
 */
function solveSystem(equationStrs, y0Array, t0, tEnd, h) {
    const n = equationStrs.length;
    const steps = Math.ceil((tEnd - t0) / h);

    // Parse all equations
    const equations = equationStrs.map(eq => {
        return function(t, y) {
            try {
                const sin = Math.sin, cos = Math.cos, tan = Math.tan;
                const exp = Math.exp, log = Math.log, sqrt = Math.sqrt;
                const abs = Math.abs, pow = Math.pow;
                const PI = Math.PI, E = Math.E;
                // y is an array, equations can use y[0], y[1], etc.
                return eval(eq);
            } catch (e) {
                return 0;
            }
        };
    });

    const t = [t0];
    const y = [y0Array.slice()];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < steps; i++) {
        const ti = t[i];
        const yi = y[i];

        // Compute k1
        const k1 = equations.map(f => f(ti, yi));

        // Compute k2
        const y_k2 = yi.map((yj, j) => yj + (h/2) * k1[j]);
        const k2 = equations.map(f => f(ti + h/2, y_k2));

        // Compute k3
        const y_k3 = yi.map((yj, j) => yj + (h/2) * k2[j]);
        const k3 = equations.map(f => f(ti + h/2, y_k3));

        // Compute k4
        const y_k4 = yi.map((yj, j) => yj + h * k3[j]);
        const k4 = equations.map(f => f(ti + h, y_k4));

        // Update
        const yNext = yi.map((yj, j) =>
            yj + (h/6) * (k1[j] + 2*k2[j] + 2*k3[j] + k4[j])
        );

        t.push(ti + h);
        y.push(yNext);

        if (i % Math.ceil(steps / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((i / steps) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'System Solver (RK4)',
        formula: 'RK4 applied to each equation in system',
        accuracy: 'O(h⁴) - Fourth Order',
        t: t,
        y: y,
        numEquations: n,
        steps: steps,
        h: h,
        t0: t0,
        tEnd: tEnd,
        y0: y0Array,
        equations: equationStrs
    };
}

/**
 * Compare all methods on the same problem
 */
function compareAllMethods(fStr, y0, t0, tEnd, h) {
    const f = parseFunction(fStr);
    const steps = Math.ceil((tEnd - t0) / h);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Euler
    let tEuler = [t0], yEuler = [y0];
    for (let i = 0; i < steps; i++) {
        const ti = tEuler[i], yi = yEuler[i];
        tEuler.push(ti + h);
        yEuler.push(yi + h * f(ti, yi));
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Midpoint
    let tMid = [t0], yMid = [y0];
    for (let i = 0; i < steps; i++) {
        const ti = tMid[i], yi = yMid[i];
        const k1 = f(ti, yi);
        const k2 = f(ti + h/2, yi + (h/2)*k1);
        tMid.push(ti + h);
        yMid.push(yi + h * k2);
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Heun (Improved Euler)
    let tHeun = [t0], yHeun = [y0];
    for (let i = 0; i < steps; i++) {
        const ti = tHeun[i], yi = yHeun[i];
        const k1 = f(ti, yi);
        const k2 = f(ti + h, yi + h*k1);
        tHeun.push(ti + h);
        yHeun.push(yi + (h/2) * (k1 + k2));
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // RK4
    let tRK4 = [t0], yRK4 = [y0];
    for (let i = 0; i < steps; i++) {
        const ti = tRK4[i], yi = yRK4[i];
        const k1 = f(ti, yi);
        const k2 = f(ti + h/2, yi + (h/2)*k1);
        const k3 = f(ti + h/2, yi + (h/2)*k2);
        const k4 = f(ti + h, yi + h*k3);
        tRK4.push(ti + h);
        yRK4.push(yi + (h/6)*(k1 + 2*k2 + 2*k3 + k4));
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Method Comparison',
        results: {
            euler: { t: tEuler, y: yEuler, accuracy: 'O(h)' },
            midpoint: { t: tMid, y: yMid, accuracy: 'O(h²)' },
            heun: { t: tHeun, y: yHeun, accuracy: 'O(h²)' },
            rk4: { t: tRK4, y: yRK4, accuracy: 'O(h⁴)' }
        },
        steps: steps,
        h: h,
        t0: t0,
        tEnd: tEnd,
        y0: y0,
        equation: fStr
    };
}
