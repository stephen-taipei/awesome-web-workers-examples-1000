self.onmessage = function(e) {
    const { type, funcName, count, batchSize } = e.data;

    if (type === 'start') {
        runRandomSearch(funcName, count, batchSize);
    }
};

const functions = {
    rastrigin: {
        eval: (x, y) => 20 + x*x - 10*Math.cos(2*Math.PI*x) + y*y - 10*Math.cos(2*Math.PI*y),
        xRange: [-5.12, 5.12],
        yRange: [-5.12, 5.12]
    },
    ackley: {
        eval: (x, y) => -20*Math.exp(-0.2*Math.sqrt(0.5*(x*x+y*y))) - Math.exp(0.5*(Math.cos(2*Math.PI*x)+Math.cos(2*Math.PI*y))) + Math.E + 20,
        xRange: [-5, 5],
        yRange: [-5, 5]
    },
    schwefel: {
        eval: (x, y) => 418.9829 * 2 - (x * Math.sin(Math.sqrt(Math.abs(x))) + y * Math.sin(Math.sqrt(Math.abs(y)))),
        xRange: [-500, 500],
        yRange: [-500, 500]
    },
    michalewicz: {
        eval: (x, y) => {
            const m = 10;
            return -(Math.sin(x) * Math.pow(Math.sin(x*x/Math.PI), 2*m) + Math.sin(y) * Math.pow(Math.sin(2*y*y/Math.PI), 2*m));
        },
        xRange: [0, Math.PI],
        yRange: [0, Math.PI]
    }
};

function runRandomSearch(funcName, count, batchSize) {
    const func = functions[funcName];
    if (!func) return;

    let bestVal = Infinity;
    let bestPoint = null;

    let samplesBuffer = [];

    for (let i = 0; i < count; i++) {
        const x = Math.random() * (func.xRange[1] - func.xRange[0]) + func.xRange[0];
        const y = Math.random() * (func.yRange[1] - func.yRange[0]) + func.yRange[0];

        const val = func.eval(x, y);

        if (val < bestVal) {
            bestVal = val;
            bestPoint = { x, y, val };
        }

        samplesBuffer.push({ x, y }); // Don't send val to save bandwidth if not needed, or add if needed

        if ((i + 1) % batchSize === 0 || i === count - 1) {
            self.postMessage({
                type: (i === count - 1) ? 'result' : 'progress',
                completed: i + 1,
                total: count,
                samples: samplesBuffer,
                best: bestPoint
            });
            samplesBuffer = []; // Clear buffer

            // Artificial delay to visualize process if too fast?
            // For thousands of points, JS is too fast. Let's add a tiny delay every batch
            // if batch count is small.
            if (batchSize < 1000) {
                 const start = Date.now();
                 while (Date.now() - start < 10);
            }
        }
    }
}
