// Gradient Boosting Regressor

// Weak Learner: Decision Stump (Tree depth 1)
// Finds best split point to minimize variance of residuals
class DecisionStump {
    constructor() {
        this.splitVal = 0;
        this.leftVal = 0;
        this.rightVal = 0;
    }

    fit(data, residuals) {
        let bestErr = Infinity;
        
        // Sort data by X to find split points easily
        // But data might be large. O(N log N).
        // For simple 1D, we assume passed sorted indices or data is small enough.
        // Let's assume data is sorted by x for simplicity in this loop.
        
        const n = data.length;
        
        // Iterate possible splits (between points)
        for (let i = 0; i < n - 1; i++) {
            const split = (data[i].x + data[i+1].x) / 2;
            
            // Calculate means of residuals for left and right
            let sumL = 0, cntL = 0;
            let sumR = 0, cntR = 0;
            
            for(let j=0; j<n; j++) {
                if (data[j].x < split) {
                    sumL += residuals[j];
                    cntL++;
                } else {
                    sumR += residuals[j];
                    cntR++;
                }
            }
            
            const meanL = cntL === 0 ? 0 : sumL / cntL;
            const meanR = cntR === 0 ? 0 : sumR / cntR;
            
            // Calculate Error (MSE)
            let err = 0;
            for(let j=0; j<n; j++) {
                const pred = data[j].x < split ? meanL : meanR;
                err += (residuals[j] - pred) ** 2;
            }
            
            if (err < bestErr) {
                bestErr = err;
                this.splitVal = split;
                this.leftVal = meanL;
                this.rightVal = meanR;
            }
        }
    }

    predict(x) {
        return x < this.splitVal ? this.leftVal : this.rightVal;
    }
}

self.onmessage = async function(e) {
    const { command, nEstimators, learningRate, noise } = e.data;

    if (command === 'start') {
        self.postMessage({ type: 'status', data: 'Generating Data...' });

        // 1. Generate Data: y = sin(3x) + noise, x in [0, 1]
        const n = 100;
        const data = [];
        for(let i=0; i<n; i++) {
            const x = i / (n-1);
            const y = Math.sin(3 * Math.PI * x) + (Math.random() - 0.5) * noise * 2;
            data.push({ x, y });
        }
        // Sort by x for easier line drawing and splitting
        data.sort((a, b) => a.x - b.x);

        // 2. Gradient Boosting Loop
        // F_0(x) = mean(y)
        let sumY = 0;
        for(let p of data) sumY += p.y;
        const meanY = sumY / n;
        
        // Current predictions
        const F = new Float32Array(n).fill(meanY);
        
        // Trees
        const trees = [];

        self.postMessage({ type: 'status', data: 'Boosting...' });

        for (let iter = 0; iter < nEstimators; iter++) {
            // Calculate Residuals: r_i = y_i - F(x_i)
            const residuals = new Float32Array(n);
            let loss = 0;
            for(let i=0; i<n; i++) {
                residuals[i] = data[i].y - F[i];
                loss += residuals[i] ** 2;
            }
            loss /= n;

            // Fit a weak learner to residuals
            const stump = new DecisionStump();
            stump.fit(data, residuals);
            
            // Update Model
            // F(x) <- F(x) + lr * h(x)
            for(let i=0; i<n; i++) {
                F[i] += learningRate * stump.predict(data[i].x);
            }
            
            trees.push(stump);

            // Visualize
            const prediction = [];
            for(let i=0; i<n; i++) prediction.push({ x: data[i].x, y: F[i] });

            self.postMessage({
                type: 'update',
                data: {
                    trees: iter + 1,
                    loss,
                    points: data,
                    prediction
                }
            });

            // Slow down to visualize
            await new Promise(r => setTimeout(r, 100));
        }

        self.postMessage({ type: 'done' });
    }
};
