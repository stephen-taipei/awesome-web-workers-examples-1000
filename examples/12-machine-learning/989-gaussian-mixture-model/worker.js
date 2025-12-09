// GMM with EM Algorithm

self.onmessage = async function(e) {
    const { command, points, k, delay, width, height } = e.data;

    if (command === 'start') {
        self.postMessage({ type: 'status', data: 'Generating Clusters...' });

        // 1. Generate Synthetic Data (Mixture of Gaussians)
        const data = new Float32Array(points * 2);
        const trueK = Math.floor(Math.random() * 3) + 2; // Random true clusters 2-4
        
        for (let i = 0; i < points; i++) {
            // Pick a cluster
            const c = i % trueK;
            
            // Random centroid
            const cx = (0.2 + Math.random() * 0.6) * width;
            const cy = (0.2 + Math.random() * 0.6) * height;
            
            // Random spread
            const sx = 20 + Math.random() * 40;
            const sy = 20 + Math.random() * 40;
            
            // Box-Muller
            const u = 1 - Math.random();
            const v = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);

            data[i * 2] = cx + z1 * sx;
            data[i * 2 + 1] = cy + z2 * sy;
        }

        self.postMessage({ type: 'status', data: 'Initializing Parameters...' });

        // 2. Initialize GMM Parameters
        // Means (random points)
        const mu = [];
        for(let i=0; i<k; i++) {
            const idx = Math.floor(Math.random() * points);
            mu.push([data[idx*2], data[idx*2+1]]);
        }

        // Covariances (Identity * large variance initially)
        const sigma = [];
        for(let i=0; i<k; i++) {
            sigma.push([2500, 0, 0, 2500]); // 2x2 matrix flattened [xx, xy, yx, yy]
        }

        // Mixing Coefficients (Uniform)
        const pi = new Float32Array(k).fill(1.0 / k);

        // Responsibilities: N x K
        // Store as array of arrays or flat. Let's do array of arrays for readability in loop
        let gamma = Array(points).fill(0).map(() => new Float32Array(k));

        let iterations = 0;
        let converged = false;
        let prevLL = -Infinity;

        // EM Loop
        while (!converged && iterations < 200) {
            // --- E-Step ---
            // Calculate responsibilities gamma(z_nk)
            
            for (let i = 0; i < points; i++) {
                const x = [data[i*2], data[i*2+1]];
                let sum = 0;
                
                for (let j = 0; j < k; j++) {
                    const prob = gaussianPdf(x, mu[j], sigma[j]);
                    const val = pi[j] * prob;
                    gamma[i][j] = val;
                    sum += val;
                }

                // Normalize
                if (sum > 0) {
                    for (let j = 0; j < k; j++) gamma[i][j] /= sum;
                } else {
                    // Fallback to uniform if prob is vanishingly small (outliers)
                    for (let j = 0; j < k; j++) gamma[i][j] = 1.0 / k;
                }
            }

            // --- M-Step ---
            // Update Means, Covariances, Pi
            
            let currentLL = 0;

            for (let j = 0; j < k; j++) {
                let N_k = 0;
                let sumMuX = 0;
                let sumMuY = 0;

                // Sum responsibilities for cluster j
                for (let i = 0; i < points; i++) {
                    N_k += gamma[i][j];
                    sumMuX += gamma[i][j] * data[i*2];
                    sumMuY += gamma[i][j] * data[i*2+1];
                }

                // Update Mean
                // Add small epsilon to N_k to avoid division by zero
                const safeNk = N_k + 1e-10;
                mu[j][0] = sumMuX / safeNk;
                mu[j][1] = sumMuY / safeNk;

                // Update Covariance
                let sumSigXX = 0;
                let sumSigXY = 0;
                let sumSigYY = 0;

                for (let i = 0; i < points; i++) {
                    const dx = data[i*2] - mu[j][0];
                    const dy = data[i*2+1] - mu[j][1];
                    const w = gamma[i][j];
                    
                    sumSigXX += w * dx * dx;
                    sumSigXY += w * dx * dy;
                    sumSigYY += w * dy * dy;
                }

                // Add regularization to diagonal to prevent singular matrices
                sigma[j][0] = sumSigXX / safeNk + 1.0; 
                sigma[j][1] = sumSigXY / safeNk;
                sigma[j][2] = sumSigXY / safeNk; // Symmetry
                sigma[j][3] = sumSigYY / safeNk + 1.0;

                // Update Pi
                pi[j] = N_k / points;
            }

            // Calculate Log Likelihood (for convergence check)
            currentLL = 0;
            for (let i = 0; i < points; i++) {
                const x = [data[i*2], data[i*2+1]];
                let sum = 0;
                for (let j = 0; j < k; j++) {
                    sum += pi[j] * gaussianPdf(x, mu[j], sigma[j]);
                }
                currentLL += Math.log(sum + 1e-20);
            }

            // Check convergence
            if (Math.abs(currentLL - prevLL) < 0.1) {
                converged = true;
            }
            prevLL = currentLL;
            iterations++;

            // Prepare visualization data
            // Assignments (Hard) for coloring
            const assignments = new Int32Array(points);
            for(let i=0; i<points; i++) {
                let maxP = -1;
                let maxIdx = 0;
                for(let j=0; j<k; j++) {
                    if (gamma[i][j] > maxP) {
                        maxP = gamma[i][j];
                        maxIdx = j;
                    }
                }
                assignments[i] = maxIdx;
            }

            self.postMessage({
                type: 'update',
                data: {
                    iteration: iterations,
                    logLikelihood: currentLL,
                    points: data,
                    gaussians: mu.map((m, i) => ({ mu: m, sigma: sigma[i] })),
                    assignments: assignments
                }
            });

            if (delay > 0) {
                await new Promise(r => setTimeout(r, delay));
            }
        }

        self.postMessage({ type: 'done' });
    }
};

function gaussianPdf(x, mu, sigma) {
    // Bivariate Gaussian PDF
    // f(x) = 1 / (2pi * sqrt(|Sigma|)) * exp(-0.5 * (x-mu)^T * Sigma^-1 * (x-mu))
    
    const dx = x[0] - mu[0];
    const dy = x[1] - mu[1];

    // Determinant
    const det = sigma[0] * sigma[3] - sigma[1] * sigma[2];
    if (det <= 0) return 1e-20; // Degenerate

    // Inverse Sigma
    const invDet = 1.0 / det;
    const invSig00 = sigma[3] * invDet;
    const invSig01 = -sigma[1] * invDet;
    const invSig10 = -sigma[2] * invDet; // Same as 01
    const invSig11 = sigma[0] * invDet;

    // Mahalanobis distance squared
    // [dx dy] * [i00 i01] * [dx]
    //           [i10 i11]   [dy]
    const termX = dx * invSig00 + dy * invSig10;
    const termY = dx * invSig01 + dy * invSig11;
    const mahal = dx * termX + dy * termY;

    const norm = 1.0 / (2.0 * Math.PI * Math.sqrt(det));
    return norm * Math.exp(-0.5 * mahal);
}
