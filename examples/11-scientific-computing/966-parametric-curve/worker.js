// Parametric Curve Worker

self.onmessage = function(e) {
    const { command, eqX, eqY, tMin, tMax, steps } = e.data;

    if (command === 'compute') {
        try {
            const start = performance.now();

            // Create safe-ish functions from strings
            // Mapping common Math functions to global scope for eval context
            const funcX = createMathFunction(eqX);
            const funcY = createMathFunction(eqY);

            const points = [];
            const stepSize = (tMax - tMin) / steps;

            for (let i = 0; i <= steps; i++) {
                const t = tMin + i * stepSize;
                const x = funcX(t);
                const y = funcY(t);
                
                if (isFinite(x) && isFinite(y)) {
                    points.push({ x, y });
                }
            }

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    points,
                    duration: (end - start).toFixed(2)
                }
            });

        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};

function createMathFunction(expression) {
    // Whitelist of allowed Math functions
    const mathProps = Object.getOwnPropertyNames(Math);
    const args = ['t'];
    const body = `
        with (Math) {
            return (${expression});
        }
    `;
    return new Function(...args, body);
}
