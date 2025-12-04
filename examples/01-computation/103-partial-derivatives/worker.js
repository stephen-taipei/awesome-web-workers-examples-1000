/**
 * Web Worker for Partial Derivatives
 * Compute partial derivatives of multivariable functions
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, x, y, h, order } = data;

        // Create function
        const f = createFunction(functionType, customFunction);
        const exactDerivatives = getExactDerivatives(functionType);

        reportProgress(10);

        // Calculate function value at point
        const fValue = f(x, y);

        // Calculate first-order partial derivatives
        const firstOrder = {
            fx: centralDiffX(f, x, y, h),
            fy: centralDiffY(f, x, y, h)
        };

        reportProgress(40);

        // Calculate second-order partial derivatives
        let secondOrder = null;
        if (order >= 2) {
            secondOrder = {
                fxx: secondDerivativeXX(f, x, y, h),
                fyy: secondDerivativeYY(f, x, y, h),
                fxy: mixedDerivativeXY(f, x, y, h)
            };
        }

        reportProgress(70);

        // Calculate exact values if available
        const exact = {};
        if (exactDerivatives) {
            exact.fx = exactDerivatives.fx ? exactDerivatives.fx(x, y) : null;
            exact.fy = exactDerivatives.fy ? exactDerivatives.fy(x, y) : null;
            if (order >= 2) {
                exact.fxx = exactDerivatives.fxx ? exactDerivatives.fxx(x, y) : null;
                exact.fyy = exactDerivatives.fyy ? exactDerivatives.fyy(x, y) : null;
                exact.fxy = exactDerivatives.fxy ? exactDerivatives.fxy(x, y) : null;
            }
        }

        // Calculate gradient magnitude and direction
        const gradientMag = Math.sqrt(firstOrder.fx.value * firstOrder.fx.value +
                                       firstOrder.fy.value * firstOrder.fy.value);
        const gradientAngle = Math.atan2(firstOrder.fy.value, firstOrder.fx.value) * 180 / Math.PI;

        // Calculate Laplacian if second order
        let laplacian = null;
        if (secondOrder) {
            laplacian = secondOrder.fxx.value + secondOrder.fyy.value;
        }

        // Directional derivative in a sample direction
        const directionalDerivatives = calculateDirectionalDerivatives(firstOrder.fx.value, firstOrder.fy.value);

        reportProgress(90);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                fValue,
                firstOrder,
                secondOrder,
                exact,
                gradientMag,
                gradientAngle,
                laplacian,
                directionalDerivatives,
                functionString: getFunctionString(functionType),
                x, y, h, order
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
        case 'quadratic':
            return (x, y) => x * x + y * y;
        case 'saddle':
            return (x, y) => x * x - y * y;
        case 'product':
            return (x, y) => x * y;
        case 'trig':
            return (x, y) => Math.sin(x) * Math.cos(y);
        case 'exp':
            return (x, y) => Math.exp(x + y);
        case 'mixed':
            return (x, y) => x * x * y + x * y * y;
        case 'rosenbrock':
            return (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2);
        case 'custom':
            try {
                return new Function('x', 'y', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }
        default:
            return (x, y) => x * x + y * y;
    }
}

function getExactDerivatives(functionType) {
    switch (functionType) {
        case 'quadratic':
            return {
                fx: (x, y) => 2 * x,
                fy: (x, y) => 2 * y,
                fxx: (x, y) => 2,
                fyy: (x, y) => 2,
                fxy: (x, y) => 0
            };
        case 'saddle':
            return {
                fx: (x, y) => 2 * x,
                fy: (x, y) => -2 * y,
                fxx: (x, y) => 2,
                fyy: (x, y) => -2,
                fxy: (x, y) => 0
            };
        case 'product':
            return {
                fx: (x, y) => y,
                fy: (x, y) => x,
                fxx: (x, y) => 0,
                fyy: (x, y) => 0,
                fxy: (x, y) => 1
            };
        case 'trig':
            return {
                fx: (x, y) => Math.cos(x) * Math.cos(y),
                fy: (x, y) => -Math.sin(x) * Math.sin(y),
                fxx: (x, y) => -Math.sin(x) * Math.cos(y),
                fyy: (x, y) => -Math.sin(x) * Math.cos(y),
                fxy: (x, y) => -Math.cos(x) * Math.sin(y)
            };
        case 'exp':
            return {
                fx: (x, y) => Math.exp(x + y),
                fy: (x, y) => Math.exp(x + y),
                fxx: (x, y) => Math.exp(x + y),
                fyy: (x, y) => Math.exp(x + y),
                fxy: (x, y) => Math.exp(x + y)
            };
        case 'mixed':
            // f = x²y + xy²
            return {
                fx: (x, y) => 2 * x * y + y * y,
                fy: (x, y) => x * x + 2 * x * y,
                fxx: (x, y) => 2 * y,
                fyy: (x, y) => 2 * x,
                fxy: (x, y) => 2 * x + 2 * y
            };
        case 'rosenbrock':
            // f = (1-x)² + 100(y-x²)²
            return {
                fx: (x, y) => -2 * (1 - x) - 400 * x * (y - x * x),
                fy: (x, y) => 200 * (y - x * x),
                fxx: (x, y) => 2 - 400 * y + 1200 * x * x,
                fyy: (x, y) => 200,
                fxy: (x, y) => -400 * x
            };
        default:
            return null;
    }
}

function getFunctionString(functionType) {
    switch (functionType) {
        case 'quadratic': return 'x² + y²';
        case 'saddle': return 'x² - y²';
        case 'product': return 'x·y';
        case 'trig': return 'sin(x)·cos(y)';
        case 'exp': return 'e^(x+y)';
        case 'mixed': return 'x²y + xy²';
        case 'rosenbrock': return '(1-x)² + 100(y-x²)²';
        default: return 'f(x, y)';
    }
}

// First-order partial derivative with respect to x (central difference)
function centralDiffX(f, x, y, h) {
    const value = (f(x + h, y) - f(x - h, y)) / (2 * h);
    return {
        value,
        formula: '[f(x+h, y) - f(x-h, y)] / 2h',
        order: 'O(h²)',
        evaluations: 2
    };
}

// First-order partial derivative with respect to y (central difference)
function centralDiffY(f, x, y, h) {
    const value = (f(x, y + h) - f(x, y - h)) / (2 * h);
    return {
        value,
        formula: '[f(x, y+h) - f(x, y-h)] / 2h',
        order: 'O(h²)',
        evaluations: 2
    };
}

// Second-order partial derivative ∂²f/∂x²
function secondDerivativeXX(f, x, y, h) {
    const value = (f(x + h, y) - 2 * f(x, y) + f(x - h, y)) / (h * h);
    return {
        value,
        formula: '[f(x+h, y) - 2f(x, y) + f(x-h, y)] / h²',
        order: 'O(h²)',
        evaluations: 3
    };
}

// Second-order partial derivative ∂²f/∂y²
function secondDerivativeYY(f, x, y, h) {
    const value = (f(x, y + h) - 2 * f(x, y) + f(x, y - h)) / (h * h);
    return {
        value,
        formula: '[f(x, y+h) - 2f(x, y) + f(x, y-h)] / h²',
        order: 'O(h²)',
        evaluations: 3
    };
}

// Mixed partial derivative ∂²f/∂x∂y
function mixedDerivativeXY(f, x, y, h) {
    const value = (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h);
    return {
        value,
        formula: '[f(x+h, y+h) - f(x+h, y-h) - f(x-h, y+h) + f(x-h, y-h)] / 4h²',
        order: 'O(h²)',
        evaluations: 4
    };
}

function calculateDirectionalDerivatives(fx, fy) {
    const directions = [
        { name: 'x-axis', angle: 0 },
        { name: 'y-axis', angle: 90 },
        { name: 'diagonal', angle: 45 },
        { name: 'anti-diagonal', angle: 135 }
    ];

    return directions.map(dir => {
        const rad = dir.angle * Math.PI / 180;
        const ux = Math.cos(rad);
        const uy = Math.sin(rad);
        const value = fx * ux + fy * uy;
        return {
            name: dir.name,
            angle: dir.angle,
            value
        };
    });
}
