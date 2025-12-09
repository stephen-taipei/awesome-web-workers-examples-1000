self.onmessage = function(e) {
    const { command, samples, dimensions } = e.data;

    if (command === 'run') {
        const start = performance.now();

        self.postMessage({ type: 'status', data: 'Generating Data...' });

        // 1. Generate Synthetic Data (3 clusters in N-dim space)
        // We want the clusters to be distinct but rotated so PCA finds the best axis.
        const data = new Float32Array(samples * dimensions);
        const labels = new Int32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            const cluster = i % 3;
            labels[i] = cluster;
            
            // Base centroids
            // To make PCA meaningful, spread them primarily along non-axis directions or random
            const bias = cluster * 5.0;
            
            for (let d = 0; d < dimensions; d++) {
                // Create correlation: higher dims related to first dims
                let val = bias + (Math.random() - 0.5) * 2.0;
                
                // Add correlation to make first Principal Component distinct
                if (d > 0) val += data[i * dimensions] * 0.5; 
                
                data[i * dimensions + d] = val;
            }
        }

        self.postMessage({ type: 'status', data: 'Standardizing Data...' });

        // 2. Standardize (Mean = 0)
        // PCA typically requires centering. Scaling to unit variance is optional but good.
        const means = new Float32Array(dimensions);
        for (let i = 0; i < samples; i++) {
            for (let d = 0; d < dimensions; d++) {
                means[d] += data[i * dimensions + d];
            }
        }
        for (let d = 0; d < dimensions; d++) means[d] /= samples;

        for (let i = 0; i < samples; i++) {
            for (let d = 0; d < dimensions; d++) {
                data[i * dimensions + d] -= means[d];
            }
        }

        self.postMessage({ type: 'status', data: 'Computing Covariance Matrix...' });

        // 3. Compute Covariance Matrix
        // Cov(X,Y) = sum((x-mean)(y-mean)) / (N-1)
        // Matrix size: dim x dim
        const covMatrix = new Float32Array(dimensions * dimensions);
        
        for (let row = 0; row < dimensions; row++) {
            for (let col = row; col < dimensions; col++) { // Symmetric
                let sum = 0;
                for (let i = 0; i < samples; i++) {
                    sum += data[i * dimensions + row] * data[i * dimensions + col];
                }
                const cov = sum / (samples - 1);
                covMatrix[row * dimensions + col] = cov;
                covMatrix[col * dimensions + row] = cov;
            }
        }

        self.postMessage({ type: 'status', data: 'Solving Eigenproblems...' });

        // 4. Eigen Decomposition (Power Iteration for top K components)
        // Since we only need 2D for visualization, we find top 2 eigenvectors.
        // Power Iteration finds the largest eigenvalue/vector.
        // To find the second, we deflate the matrix.
        
        const eigenvectors = [];
        const eigenvalues = [];
        
        // Clone cov matrix for deflation
        const currentMatrix = new Float32Array(covMatrix);

        for (let k = 0; k < 2; k++) {
            // Random start vector
            let v = new Float32Array(dimensions);
            for(let i=0; i<dimensions; i++) v[i] = Math.random();
            
            // Iterate
            for (let iter = 0; iter < 50; iter++) {
                // w = M * v
                const w = new Float32Array(dimensions);
                for (let r = 0; r < dimensions; r++) {
                    for (let c = 0; c < dimensions; c++) {
                        w[r] += currentMatrix[r * dimensions + c] * v[c];
                    }
                }
                
                // Normalize w
                let norm = 0;
                for (let i = 0; i < dimensions; i++) norm += w[i] * w[i];
                norm = Math.sqrt(norm);
                
                for (let i = 0; i < dimensions; i++) v[i] = w[i] / norm;
            }
            
            // Rayleigh quotient for eigenvalue
            // lambda = (v^T M v) / (v^T v) -> since v is normalized, just v^T M v
            let lambda = 0;
            for (let r = 0; r < dimensions; r++) {
                let rowSum = 0;
                for (let c = 0; c < dimensions; c++) {
                    rowSum += currentMatrix[r * dimensions + c] * v[c];
                }
                lambda += v[r] * rowSum;
            }
            
            eigenvectors.push(v);
            eigenvalues.push(lambda);
            
            // Deflation: M_new = M - lambda * v * v^T
            for (let r = 0; r < dimensions; r++) {
                for (let c = 0; c < dimensions; c++) {
                    currentMatrix[r * dimensions + c] -= lambda * v[r] * v[c];
                }
            }
        }

        self.postMessage({ type: 'status', data: 'Projecting Data...' });

        // 5. Project Data
        // New Data = Data * Eigenvectors^T
        const projectedData = new Float32Array(samples * 2);
        
        for (let i = 0; i < samples; i++) {
            const pc1 = dotProduct(data, i * dimensions, eigenvectors[0], 0, dimensions);
            const pc2 = dotProduct(data, i * dimensions, eigenvectors[1], 0, dimensions);
            projectedData[i * 2] = pc1;
            projectedData[i * 2 + 1] = pc2;
        }

        // Calculate Variance Explained ratio (approximate total trace)
        let totalTrace = 0;
        for (let i = 0; i < dimensions; i++) totalTrace += covMatrix[i * dimensions + i];
        const varianceExplained = (eigenvalues[0] + eigenvalues[1]) / totalTrace;

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                projectedData,
                labels,
                totalVariance: varianceExplained,
                duration: (end - start).toFixed(2)
            }
        });
    }
};

function dotProduct(arr1, offset1, arr2, offset2, length) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
        sum += arr1[offset1 + i] * arr2[offset2 + i];
    }
    return sum;
}
