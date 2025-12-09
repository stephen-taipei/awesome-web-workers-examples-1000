// Rosenbrock function: f(x,y) = (a-x)^2 + b(y-x^2)^2
// Global minimum at (a, a^2). Standard: a=1, b=100, min at (1,1) is 0.
function rosenbrock(x, y) {
    const a = 1;
    const b = 100;
    return Math.pow(a - x, 2) + b * Math.pow(y - x * x, 2);
}

self.onmessage = function(e) {
    const { command, strategy, iterations, gridSize, rangeX, rangeY } = e.data;

    if (command === 'start') {
        let bestLoss = Infinity;
        let bestParams = null;

        if (strategy === 'grid') {
            const stepX = (rangeX[1] - rangeX[0]) / gridSize;
            const stepY = (rangeY[1] - rangeY[0]) / gridSize;
            const totalPoints = (gridSize + 1) * (gridSize + 1);
            let count = 0;

            for (let i = 0; i <= gridSize; i++) {
                const x = rangeX[0] + i * stepX;
                for (let j = 0; j <= gridSize; j++) {
                    const y = rangeY[0] + j * stepY;
                    
                    // Simulate expensive evaluation
                    expensiveOp();
                    
                    const loss = rosenbrock(x, y);

                    self.postMessage({ type: 'point', data: { x, y, loss } });

                    if (loss < bestLoss) {
                        bestLoss = loss;
                        bestParams = { x, y };
                        self.postMessage({ type: 'newBest', data: { x, y, loss } });
                    }

                    count++;
                    if (count % 50 === 0) {
                        self.postMessage({ type: 'progress', data: Math.round(count / totalPoints * 100) });
                    }
                }
            }
        } else if (strategy === 'random') {
            for (let i = 0; i < iterations; i++) {
                const x = rangeX[0] + Math.random() * (rangeX[1] - rangeX[0]);
                const y = rangeY[0] + Math.random() * (rangeY[1] - rangeY[0]);

                // Simulate expensive evaluation
                expensiveOp();

                const loss = rosenbrock(x, y);

                self.postMessage({ type: 'point', data: { x, y, loss } });

                if (loss < bestLoss) {
                    bestLoss = loss;
                    bestParams = { x, y };
                    self.postMessage({ type: 'newBest', data: { x, y, loss } });
                }

                if (i % 10 === 0) {
                    self.postMessage({ type: 'progress', data: Math.round((i + 1) / iterations * 100) });
                }
            }
        }

        self.postMessage({ type: 'done' });
    }
};

function expensiveOp() {
    const start = performance.now();
    while (performance.now() - start < 0.5) {
        // block for 0.5ms to simulate model training/eval
    }
}
