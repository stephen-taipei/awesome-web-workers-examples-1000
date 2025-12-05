// Simplified t-SNE Implementation
// Adapted for Web Worker usage without external dependencies

self.onmessage = function(e) {
    const { command, points, perplexity, iterations, epsilon } = e.data;

    if (command === 'start') {
        self.postMessage({ type: 'status', data: 'Generating High-Dim Data...' });
        
        // 1. Generate High-Dimensional Data (e.g., 3 clusters in 10D space)
        const dim = 10;
        const data = [];
        const labels = [];
        const clusters = 3;
        
        for (let i = 0; i < points; i++) {
            const cluster = i % clusters;
            const vec = [];
            // Centroids: [0,0...], [5,5...], [10,10...]
            // Shift centroids to make distinct clusters
            const shift = cluster * 3.0; 
            
            for (let d = 0; d < dim; d++) {
                // Gaussian noise around centroid
                // Box-Muller transform for normal distribution
                const u = 1 - Math.random();
                const v = Math.random();
                const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                vec.push(shift + z * 0.5); // Spread 0.5
            }
            data.push(vec);
            labels.push(cluster);
        }

        self.postMessage({ type: 'status', data: 'Computing P-values...' });

        // 2. Initialize t-SNE
        // We will implement a simplified gradient descent version
        
        // Compute Pairwise Distances (Euclidean squared)
        const n = points;
        const D = new Float32Array(n * n);
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let dist = 0;
                for (let d = 0; d < dim; d++) {
                    dist += (data[i][d] - data[j][d]) ** 2;
                }
                D[i * n + j] = dist;
                D[j * n + i] = dist;
            }
        }

        // Initialize Solution (Random normal)
        const Y = new Float32Array(n * 2);
        for (let i = 0; i < n * 2; i++) {
            const u = 1 - Math.random();
            const v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            Y[i] = z * 0.0001; 
        }

        // P-values (approximate with perplexity)
        // For full t-SNE, we need binary search for sigma_i.
        // Simplifying for demo: constant sigma or just using D as similarity metric directly is bad.
        // Let's implement a very basic Gaussian kernel similarity.
        const P = new Float32Array(n * n);
        const two_sigma_sq = 2.0; // Hardcoded sigma for speed demo
        let sumP = 0;
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    const val = Math.exp(-D[i * n + j] / two_sigma_sq);
                    P[i * n + j] = val;
                    sumP += val;
                }
            }
        }
        // Normalize P
        for (let i = 0; i < n * n; i++) P[i] /= sumP;
        
        // Symmetrize P
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const val = (P[i * n + j] + P[j * n + i]) / (2 * n);
                P[i * n + j] = val;
                P[j * n + i] = val; // Store symmetric
            }
        }
        // P is technically usually multiplied by 4 (early exaggeration) but we skip complex heuristics

        self.postMessage({ type: 'status', data: 'Running Gradient Descent...' });

        // 3. Gradient Descent
        const gains = new Float32Array(n * 2).fill(1.0);
        const yStep = new Float32Array(n * 2).fill(0.0);
        
        // Main Loop
        for (let iter = 0; iter < iterations; iter++) {
            // Compute Q-values (Student-t distribution in low-dim)
            // q_ij = (1 + ||y_i - y_j||^2)^-1 / sum(...)
            const Q = new Float32Array(n * n);
            const num = new Float32Array(n * n);
            let sumQ = 0;

            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const dy0 = Y[i * 2] - Y[j * 2];
                    const dy1 = Y[i * 2 + 1] - Y[j * 2 + 1];
                    const distSq = dy0 * dy0 + dy1 * dy1;
                    const val = 1.0 / (1.0 + distSq);
                    num[i * n + j] = val;
                    num[j * n + i] = val;
                    sumQ += val * 2; // Add both directions
                }
            }

            // Gradient Computation
            // dC/dy_i = 4 * sum_j ( (p_ij - q_ij) * (y_i - y_j) * (1 + ||...||)^-1 )
            const dY = new Float32Array(n * 2); // Gradients initialized to 0

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        const q_ij = num[i * n + j] / sumQ;
                        const p_ij = P[i * n + j] * 12.0; // Early exaggeration constant = 12 (kept always for demo)
                        // Actually typically we turn off exaggeration after 250 iters.
                        // Let's do simplified:
                        const finalP = iter < 100 ? p_ij : P[i * n + j];
                        
                        const mult = 4.0 * (finalP - q_ij) * num[i * n + j];
                        dY[i * 2] += mult * (Y[i * 2] - Y[j * 2]);
                        dY[i * 2 + 1] += mult * (Y[i * 2 + 1] - Y[j * 2 + 1]);
                    }
                }
            }

            // Update Y (with momentum)
            const momentum = iter < 250 ? 0.5 : 0.8;
            for (let i = 0; i < n * 2; i++) {
                yStep[i] = momentum * yStep[i] - epsilon * dY[i];
                Y[i] += yStep[i];
            }

            // Report progress every 10 iters
            if (iter % 10 === 0) {
                self.postMessage({
                    type: 'progress',
                    data: {
                        iter: iter,
                        solution: Y, // Transfer? Float32Array copies are cheap for 1000 pts (8KB)
                        labels: labels
                    }
                });
            }
        }

        self.postMessage({ type: 'done' });
    }
};
