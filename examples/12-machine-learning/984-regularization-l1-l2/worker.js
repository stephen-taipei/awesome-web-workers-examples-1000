self.onmessage = async function(e) {
    const { command, degree, lambda, learningRate, regType } = e.data;

    if (command === 'start') {
        self.postMessage({ type: 'status', data: 'Generating Data...' });

        // 1. Generate noisy sine wave data
        const points = [];
        const n = 20;
        for (let i = 0; i < n; i++) {
            const x = i / (n - 1); // 0 to 1
            // y = sin(2pi x) + noise
            const y = Math.sin(2 * Math.PI * x) + (Math.random() - 0.5) * 0.5;
            points.push({ x, y });
        }

        // 2. Initialize Weights (0..degree, so degree+1 weights)
        // Random small weights
        const weights = new Float32Array(degree + 1);
        for(let i=0; i<=degree; i++) weights[i] = Math.random() * 0.1;

        let iterations = 0;
        
        // Gradient Descent Loop
        while (iterations < 5000) {
            let grad = new Float32Array(degree + 1);
            let mse = 0;

            // Compute Gradient per sample
            for (let p of points) {
                // Predict
                let pred = 0;
                for (let d = 0; d <= degree; d++) {
                    pred += weights[d] * Math.pow(p.x, d);
                }

                const error = pred - p.y;
                mse += error * error;

                // d(Error^2)/dw_j = 2 * Error * x^j
                for (let d = 0; d <= degree; d++) {
                    grad[d] += 2 * error * Math.pow(p.x, d);
                }
            }
            
            mse /= points.length;

            // Average gradient
            for (let d = 0; d <= degree; d++) {
                grad[d] /= points.length;
            }

            // Add Regularization Gradient
            // L2 (Ridge): Loss += lambda * sum(w^2). Grad += 2 * lambda * w
            // L1 (Lasso): Loss += lambda * sum(|w|). Grad += lambda * sign(w)
            // Note: Usually don't regularize bias (weights[0]), but for simplicity we might.
            // Let's skip reg for bias (d=0).
            
            for (let d = 1; d <= degree; d++) {
                if (regType === 'l2') {
                    grad[d] += 2 * lambda * weights[d];
                } else if (regType === 'l1') {
                    const sign = weights[d] > 0 ? 1 : (weights[d] < 0 ? -1 : 0);
                    grad[d] += lambda * sign;
                }
            }

            // Update weights
            for (let d = 0; d <= degree; d++) {
                weights[d] -= learningRate * grad[d];
            }

            iterations++;

            if (iterations % 50 === 0) {
                self.postMessage({
                    type: 'step',
                    data: {
                        iteration: iterations,
                        loss: mse,
                        weights: weights,
                        points: points,
                        degree: degree
                    }
                });
                await new Promise(r => setTimeout(r, 10));
            }
        }

        self.postMessage({ type: 'done' });
    }
};
