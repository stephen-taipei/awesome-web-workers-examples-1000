// Proximal Gradient Descent for Lasso Regression
// Objective: min (1/2N) * ||Xw - y||^2 + lambda * ||w||_1

self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'start') {
        const { N, D, sparsity, lambda, learningRate, iterations } = data;
        runOptimization(N, D, sparsity, lambda, learningRate, iterations);
    }
};

function runOptimization(N, D, sparsity, lambda, learningRate, iterations) {
    // 1. Generate Synthetic Data
    // X: N x D matrix
    // w_true: D x 1 vector (sparse)
    // y: N x 1 vector = X * w_true + noise

    let X = new Float32Array(N * D);
    for (let i = 0; i < N * D; i++) {
        X[i] = Math.random() * 2 - 1; // [-1, 1]
    }

    let w_true = new Float32Array(D);
    for (let i = 0; i < D; i++) {
        if (Math.random() < sparsity / 100) {
            w_true[i] = Math.random() * 2 - 1; // [-1, 1]
        } else {
            w_true[i] = 0;
        }
    }

    let y = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        let sum = 0;
        for (let j = 0; j < D; j++) {
            sum += X[i * D + j] * w_true[j];
        }
        y[i] = sum + (Math.random() * 0.1 - 0.05); // Add small noise
    }

    // Send initial data back for visualization
    self.postMessage({
        type: 'data',
        w_true: w_true,
        y: y
    });

    // 2. Optimization Loop (ISTA)
    let w = new Float32Array(D).fill(0); // Initialize weights to 0

    const reportInterval = Math.max(1, Math.floor(iterations / 50));

    for (let iter = 0; iter < iterations; iter++) {
        // Gradient of smooth part f(w) = (1/2N) ||Xw - y||^2
        // grad = (1/N) X^T (Xw - y)

        // Calculate residuals: r = Xw - y
        let r = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            let pred = 0;
            for (let j = 0; j < D; j++) {
                pred += X[i * D + j] * w[j];
            }
            r[i] = pred - y[i];
        }

        // Calculate gradient: grad = (1/N) X^T * r
        let grad = new Float32Array(D);
        for (let j = 0; j < D; j++) {
            let sum = 0;
            for (let i = 0; i < N; i++) {
                sum += X[i * D + j] * r[i];
            }
            grad[j] = sum / N;
        }

        // Gradient Descent Step
        let w_next = new Float32Array(D);
        for (let j = 0; j < D; j++) {
            w_next[j] = w[j] - learningRate * grad[j];
        }

        // Proximal Operator (Soft Thresholding)
        // prox(v) = sign(v) * max(|v| - lambda * lr, 0)
        let threshold = lambda * learningRate;
        for (let j = 0; j < D; j++) {
            let v = w_next[j];
            if (v > threshold) {
                w[j] = v - threshold;
            } else if (v < -threshold) {
                w[j] = v + threshold;
            } else {
                w[j] = 0;
            }
        }

        // Calculate Loss
        // Loss = (1/2N)||r||^2 + lambda * ||w||_1
        if (iter % reportInterval === 0 || iter === iterations - 1) {
            let l2_loss = 0;
            for(let i=0; i<N; i++) {
                // We need to re-calculate r with updated w for accurate loss
                let pred = 0;
                for (let j = 0; j < D; j++) {
                    pred += X[i * D + j] * w[j];
                }
                let diff = pred - y[i];
                l2_loss += diff * diff;
            }
            l2_loss = l2_loss / (2 * N);

            let l1_norm = 0;
            for (let j = 0; j < D; j++) {
                l1_norm += Math.abs(w[j]);
            }

            let total_loss = l2_loss + lambda * l1_norm;

            self.postMessage({
                type: 'progress',
                iteration: iter,
                loss: total_loss,
                w: w
            });
        }
    }

    self.postMessage({
        type: 'done',
        w: w
    });
}
