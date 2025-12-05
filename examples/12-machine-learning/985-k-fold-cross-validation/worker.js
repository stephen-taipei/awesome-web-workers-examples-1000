self.onmessage = async function(e) {
    const { command, n, k, noise } = e.data;

    if (command === 'run') {
        self.postMessage({ type: 'status', data: 'Generating Data...' });

        // 1. Generate Synthetic Data (Linear: y = 2x + 5 + noise)
        const data = [];
        for (let i = 0; i < n; i++) {
            const x = Math.random() * 100;
            const y = 2 * x + 5 + (Math.random() - 0.5) * noise * 5;
            data.push({ x, y });
        }

        // Shuffle Data
        shuffle(data);

        const foldSize = Math.floor(n / k);
        let totalMSE = 0;
        let totalR2 = 0;

        for (let i = 0; i < k; i++) {
            self.postMessage({ type: 'status', data: `Processing Fold ${i + 1}/${k}...` });

            // Split Train/Test
            const start = i * foldSize;
            const end = start + foldSize;
            const testSet = data.slice(start, end);
            const trainSet = [...data.slice(0, start), ...data.slice(end)];

            // Visualize first (before blocking calc)
            self.postMessage({
                type: 'foldStart',
                data: {
                    foldIndex: i,
                    trainPoints: trainSet.slice(0, 200), // Send subset for vis
                    testPoints: testSet.slice(0, 100)
                }
            });

            // Simulate slight delay to show UI update
            await new Promise(r => setTimeout(r, 300));

            // Train Linear Regression (Analytical OLS)
            // beta = Cov(x,y) / Var(x)
            // alpha = mean(y) - beta * mean(x)
            
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            const trainLen = trainSet.length;
            
            for (let p of trainSet) {
                sumX += p.x;
                sumY += p.y;
                sumXY += p.x * p.y;
                sumXX += p.x * p.x;
            }
            
            const meanX = sumX / trainLen;
            const meanY = sumY / trainLen;
            
            const numerator = sumXY - trainLen * meanX * meanY;
            const denominator = sumXX - trainLen * meanX * meanX;
            const beta = numerator / denominator;
            const alpha = meanY - beta * meanX;

            // Evaluate on Test Set
            let sse = 0; // Sum Squared Error
            let sst = 0; // Total Sum of Squares
            let sumTestY = 0;
            
            for (let p of testSet) sumTestY += p.y;
            const meanTestY = sumTestY / testSet.length;

            for (let p of testSet) {
                const pred = alpha + beta * p.x;
                sse += Math.pow(p.y - pred, 2);
                sst += Math.pow(p.y - meanTestY, 2);
            }

            const mse = sse / testSet.length;
            const r2 = 1 - (sse / sst);

            totalMSE += mse;
            totalR2 += r2;

            self.postMessage({
                type: 'foldResult',
                data: {
                    foldIndex: i,
                    mse,
                    r2
                }
            });
        }

        self.postMessage({
            type: 'finalResult',
            data: {
                avgMSE: totalMSE / k,
                avgR2: totalR2 / k
            }
        });
    }
};

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
