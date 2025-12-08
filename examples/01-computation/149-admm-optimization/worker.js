// ADMM for Lasso
// Problem: min (1/2)||Ax - b||_2^2 + lambda ||x||_1
// Reformulation: min (1/2)||Ax - b||_2^2 + lambda ||z||_1  s.t. x - z = 0
// Augmented Lagrangian: L_rho(x, z, u) = (1/2)||Ax - b||^2 + lambda||z||_1 + (rho/2)||x - z + u||^2
// where u is the scaled dual variable.

self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'start') {
        const { N, D, sparsity, lambda, rho, iterations } = data;
        runOptimization(N, D, sparsity, lambda, rho, iterations);
    }
};

function runOptimization(N, D, sparsity, lambda, rho, iterations) {
    // 1. Generate Data
    let A = new Float32Array(N * D);
    for (let i = 0; i < N * D; i++) A[i] = Math.random() * 2 - 1;

    let x_true = new Float32Array(D);
    for (let i = 0; i < D; i++) {
        if (Math.random() < sparsity / 100) x_true[i] = Math.random() * 2 - 1;
        else x_true[i] = 0;
    }

    let b = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        let sum = 0;
        for (let j = 0; j < D; j++) sum += A[i * D + j] * x_true[j];
        b[i] = sum + (Math.random() * 0.1 - 0.05);
    }

    self.postMessage({ type: 'data', x_true: x_true, b: b });

    // 2. Precompute Matrix Factorizations for x-update
    // x-update: (A^T A + rho I) x = A^T b + rho(z - u)
    // We need to invert (A^T A + rho I).
    // Since D is small (e.g. 50-200), we can compute explicit inverse or Cholesky.
    // Let's do simple naive inversion for demonstration (or just solve linear system if possible).
    // Matrix multiplication: C = A^T * A

    // Note: In real scenarios, we use Sherman-Morrison-Woodbury if N << D, or Cholesky caching.
    // Here we assume D is manageable.

    let AtA = new Float32Array(D * D);
    for (let r = 0; r < D; r++) {
        for (let c = 0; c < D; c++) {
            let sum = 0;
            for (let k = 0; k < N; k++) {
                sum += A[k * D + r] * A[k * D + c];
            }
            AtA[r * D + c] = sum;
        }
    }

    // Add rho * I
    for (let i = 0; i < D; i++) {
        AtA[i * D + i] += rho;
    }

    // Invert (AtA + rho I). Using Gauss-Jordan for simplicity (O(D^3))
    let M = invertMatrix(AtA, D);

    // Precompute A^T * b
    let Atb = new Float32Array(D);
    for (let j = 0; j < D; j++) {
        let sum = 0;
        for (let i = 0; i < N; i++) sum += A[i * D + j] * b[i];
        Atb[j] = sum;
    }

    // 3. ADMM Loop
    let x = new Float32Array(D).fill(0);
    let z = new Float32Array(D).fill(0);
    let u = new Float32Array(D).fill(0);

    const reportInterval = Math.max(1, Math.floor(iterations / 50));

    for (let k = 0; k < iterations; k++) {
        // --- x-update ---
        // x = (A^T A + rho I)^(-1) (A^T b + rho(z - u))
        // Let rhs = A^T b + rho(z - u)
        let rhs = new Float32Array(D);
        for (let j = 0; j < D; j++) {
            rhs[j] = Atb[j] + rho * (z[j] - u[j]);
        }

        // x = M * rhs
        for (let r = 0; r < D; r++) {
            let sum = 0;
            for (let c = 0; c < D; c++) {
                sum += M[r * D + c] * rhs[c];
            }
            x[r] = sum;
        }

        // --- z-update ---
        // z = S_{lambda/rho}(x + u)
        // Soft thresholding
        let x_plus_u = new Float32Array(D);
        let z_old = new Float32Array(z); // Save for residual calculation

        for(let j=0; j<D; j++) z[j] = softThreshold(x[j] + u[j], lambda / rho);

        // --- u-update ---
        // u = u + x - z
        for(let j=0; j<D; j++) u[j] = u[j] + x[j] - z[j];

        // --- Diagnostics ---
        if (k % reportInterval === 0 || k === iterations - 1) {
            // Objective function value
            // (1/2)||Ax - b||^2 + lambda ||z||_1
            let residuals = new Float32Array(N);
            for(let i=0; i<N; i++) {
                let pred = 0;
                for(let j=0; j<D; j++) pred += A[i * D + j] * x[j];
                residuals[i] = pred - b[i];
            }
            let lossSq = 0;
            for(let i=0; i<N; i++) lossSq += residuals[i] * residuals[i];
            lossSq *= 0.5;

            let reg = 0;
            for(let j=0; j<D; j++) reg += Math.abs(z[j]);

            let obj = lossSq + lambda * reg;

            // Primal Residual: r_norm = ||x - z||_2
            let r_norm_sq = 0;
            for(let j=0; j<D; j++) r_norm_sq += (x[j] - z[j])**2;
            let r_norm = Math.sqrt(r_norm_sq);

            // Dual Residual: s_norm = ||-rho(z - z_old)||_2
            let s_norm_sq = 0;
            for(let j=0; j<D; j++) s_norm_sq += (rho * (z[j] - z_old[j]))**2;
            let s_norm = Math.sqrt(s_norm_sq);

            self.postMessage({
                type: 'progress',
                iteration: k,
                obj: obj,
                r_norm: r_norm,
                s_norm: s_norm,
                x: x
            });
        }
    }

    self.postMessage({ type: 'done', x: x });
}

function softThreshold(v, kappa) {
    return Math.max(0, v - kappa) - Math.max(0, -v - kappa);
}

// Invert matrix using Gauss-Jordan elimination
// M is flattened DxD array
function invertMatrix(M, D) {
    let A = new Float32Array(M); // Copy
    let I = new Float32Array(D * D);
    for (let i = 0; i < D; i++) I[i * D + i] = 1;

    for (let i = 0; i < D; i++) {
        // Find pivot
        let pivot = A[i * D + i];
        if (Math.abs(pivot) < 1e-10) continue; // Singular or close

        // Normalize row i
        for (let j = 0; j < D; j++) {
            A[i * D + j] /= pivot;
            I[i * D + j] /= pivot;
        }

        // Eliminate other rows
        for (let k = 0; k < D; k++) {
            if (k === i) continue;
            let factor = A[k * D + i];
            for (let j = 0; j < D; j++) {
                A[k * D + j] -= factor * A[i * D + j];
                I[k * D + j] -= factor * I[i * D + j];
            }
        }
    }
    return I;
}
