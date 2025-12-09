// Bayesian Optimization Worker

// Simple Matrix Operations
const Mat = {
    zeros: (r, c) => Array(r).fill().map(() => Array(c).fill(0)),

    eye: (n) => {
        const m = Mat.zeros(n, n);
        for(let i=0; i<n; i++) m[i][i] = 1;
        return m;
    },

    transpose: (m) => {
        return m[0].map((_, c) => m.map(r => r[c]));
    },

    dot: (A, B) => {
        const rA = A.length, cA = A[0].length;
        const rB = B.length, cB = B[0].length;
        if (cA !== rB) throw new Error("Matrix dimension mismatch");
        const C = Mat.zeros(rA, cB);
        for(let i=0; i<rA; i++)
            for(let j=0; j<cB; j++)
                for(let k=0; k<cA; k++)
                    C[i][j] += A[i][k] * B[k][j];
        return C;
    },

    // Cholesky Decomposition L * L^T = A
    cholesky: (A) => {
        const n = A.length;
        const L = Mat.zeros(n, n);
        for(let i=0; i<n; i++) {
            for(let j=0; j<=i; j++) {
                let sum = 0;
                for(let k=0; k<j; k++) sum += L[i][k] * L[j][k];

                if (i === j) {
                    const val = A[i][i] - sum;
                    if (val <= 0) {
                        // Regularization for numerical stability
                        L[i][i] = Math.sqrt(Math.abs(val) + 1e-6);
                    } else {
                        L[i][i] = Math.sqrt(val);
                    }
                } else {
                    L[i][j] = (A[i][j] - sum) / L[j][j];
                }
            }
        }
        return L;
    },

    // Solve Ax = b using Cholesky L (A = LL^T) -> LL^Tx = b -> Ly = b, L^Tx = y
    solveCholesky: (L, b) => {
        const n = L.length;
        const y = Array(n).fill(0);

        // Forward sub: Ly = b
        for(let i=0; i<n; i++) {
            let sum = 0;
            for(let j=0; j<i; j++) sum += L[i][j] * y[j];
            y[i] = (b[i] - sum) / L[i][i];
        }

        // Backward sub: L^Tx = y
        const x = Array(n).fill(0);
        for(let i=n-1; i>=0; i--) {
            let sum = 0;
            for(let j=i+1; j<n; j++) sum += L[j][i] * x[j];
            x[i] = (y[i] - sum) / L[i][i];
        }
        return x;
    }
};

// Gaussian Process
class GaussianProcess {
    constructor(kernelParams) {
        this.sigma_f = kernelParams.sigma_f || 1.0;
        this.l = kernelParams.l || 1.0;
        this.sigma_n = kernelParams.sigma_n || 0.1; // Noise
        this.X = [];
        this.Y = [];
        this.L = null;
        this.alpha = null;
    }

    kernel(x1, x2) {
        // RBF Kernel
        const distSq = (x1 - x2) ** 2;
        return (this.sigma_f ** 2) * Math.exp(-0.5 * distSq / (this.l ** 2));
    }

    fit(X, Y) {
        this.X = X;
        this.Y = Y;
        const n = X.length;

        // Build K
        const K = Mat.zeros(n, n);
        for(let i=0; i<n; i++) {
            for(let j=0; j<n; j++) {
                K[i][j] = this.kernel(X[i], X[j]);
                if (i === j) K[i][j] += this.sigma_n ** 2;
            }
        }

        this.L = Mat.cholesky(K);
        // alpha = K^-1 Y
        this.alpha = Mat.solveCholesky(this.L, Y);
    }

    predict(x_star) {
        // x_star is a single point or array of points. Handling array of points.
        const n_star = x_star.length;
        const n = this.X.length;

        // k_star: [n x n_star]
        // K(X, x_star)
        const k_star = Mat.zeros(n, n_star);
        for(let i=0; i<n; i++) {
            for(let j=0; j<n_star; j++) {
                k_star[i][j] = this.kernel(this.X[i], x_star[j]);
            }
        }

        // Mean: k_star^T * alpha
        // [n_star x n] * [n x 1] = [n_star x 1]
        const mean = [];
        for(let j=0; j<n_star; j++) {
            let sum = 0;
            for(let i=0; i<n; i++) sum += k_star[i][j] * this.alpha[i];
            mean.push(sum);
        }

        // Variance: k(x*, x*) - k_star^T * K^-1 * k_star
        // v = L^-1 * k_star
        // var = kernel(x*, x*) - v^T v

        const variance = [];
        for(let j=0; j<n_star; j++) {
            const k_xx = this.kernel(x_star[j], x_star[j]) + this.sigma_n**2; // Add predictive noise? Usually yes.

            // Solve L * v = k_star_col
            // Forward sub only
            const k_col = [];
            for(let i=0; i<n; i++) k_col.push(k_star[i][j]);

            const v = Array(n).fill(0);
            for(let i=0; i<n; i++) {
                let sum = 0;
                for(let k=0; k<i; k++) sum += this.L[i][k] * v[k];
                v[i] = (k_col[i] - sum) / this.L[i][i];
            }

            let v_dot_v = 0;
            for(let i=0; i<n; i++) v_dot_v += v[i] * v[i];

            variance.push(Math.max(0, k_xx - v_dot_v));
        }

        return { mean, variance };
    }
}

// Stats functions
function cdf(x) {
    // Error function approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) prob = 1 - prob;
    return prob;
}

function pdf(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Problem Definitions
const functions = {
    sin_x_x: {
        eval: x => x * Math.sin(x),
        bounds: [0, 10]
    },
    gramacy_lee: {
        eval: x => Math.sin(10 * Math.PI * x) / (2 * x) + Math.pow(x - 1, 4),
        bounds: [0.5, 2.5]
    },
    forrester: {
        eval: x => Math.pow(6*x - 2, 2) * Math.sin(12*x - 4),
        bounds: [0, 1]
    }
};

let currentProb = null;
let currentGP = null;
let currentX = [];
let currentY = [];
let iteration = 0;

self.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'init') {
        initProblem(e.data.funcName, e.data.initialSamples);
    } else if (type === 'step') {
        performStep(e.data.exploration);
    }
};

function initProblem(funcName, initSamples) {
    currentProb = functions[funcName];
    currentX = [];
    currentY = [];
    iteration = 0;

    // Initial random sampling
    const [min, max] = currentProb.bounds;
    for(let i=0; i<initSamples; i++) {
        const x = Math.random() * (max - min) + min;
        currentX.push(x);
        currentY.push(currentProb.eval(x));
    }

    // Fit GP
    currentGP = new GaussianProcess({ sigma_f: 1.0, l: (max-min)/5, sigma_n: 0.01 });
    currentGP.fit(currentX, currentY);

    reportState();
}

function performStep(exploration) {
    iteration++;
    const [min, max] = currentProb.bounds;

    // 1. Grid search for Acquisition Function optimization (simple approach)
    const gridSize = 100;
    const testPoints = [];
    for(let i=0; i<gridSize; i++) {
        testPoints.push(min + (i / (gridSize-1)) * (max - min));
    }

    const pred = currentGP.predict(testPoints);
    const mean = pred.mean;
    const std = pred.variance.map(Math.sqrt);

    // Calculate Expected Improvement (EI)
    // We are minimizing, so improvement is (f_best - f_pred)
    // f_best is min(currentY)
    const f_best = Math.min(...currentY);

    const ei = [];
    let maxEI = -1;
    let nextX = testPoints[0];

    for(let i=0; i<gridSize; i++) {
        const mu = mean[i];
        const sigma = std[i];

        let imp = 0;
        if (sigma > 0) {
            const z = (f_best - mu - exploration) / sigma;
            imp = (f_best - mu - exploration) * cdf(z) + sigma * pdf(z);
        } else {
            imp = 0;
        }

        ei.push(imp);

        if (imp > maxEI) {
            maxEI = imp;
            nextX = testPoints[i];
        }
    }

    // 2. Evaluate new point
    const nextY = currentProb.eval(nextX);

    currentX.push(nextX);
    currentY.push(nextY);

    // 3. Update GP
    currentGP.fit(currentX, currentY);

    // Generate data for visualization (True function, GP mean/std, EI)
    // Re-predict on grid for updated model
    const newPred = currentGP.predict(testPoints);

    // Also compute true function on grid for comparison
    const trueFuncY = testPoints.map(x => currentProb.eval(x));

    self.postMessage({
        type: 'step',
        iteration,
        X: currentX,
        Y: currentY,
        nextX: nextX,
        gpMean: newPred.mean,
        gpStd: newPred.variance.map(Math.sqrt),
        ei: ei,
        trueFuncY: trueFuncY,
        testPoints: testPoints
    });
}

function reportState() {
    // Generate initial vis data
    const [min, max] = currentProb.bounds;
    const gridSize = 100;
    const testPoints = [];
    for(let i=0; i<gridSize; i++) {
        testPoints.push(min + (i / (gridSize-1)) * (max - min));
    }

    const pred = currentGP.predict(testPoints);
    const trueFuncY = testPoints.map(x => currentProb.eval(x));

    // Calculate EI for initial state (with default exploration?)
    // Just zeros for now or compute based on default
    const f_best = Math.min(...currentY);
    const ei = pred.mean.map((mu, i) => {
        const sigma = Math.sqrt(pred.variance[i]);
        if(sigma <= 0) return 0;
        const z = (f_best - mu - 0.01) / sigma;
        return (f_best - mu - 0.01) * cdf(z) + sigma * pdf(z);
    });

    let nextX = testPoints[0];
    let maxEI = -1;
    ei.forEach((val, i) => {
        if(val > maxEI) { maxEI = val; nextX = testPoints[i]; }
    });

    self.postMessage({
        type: 'init',
        iteration: 0,
        X: currentX,
        Y: currentY,
        gpMean: pred.mean,
        gpStd: pred.variance.map(Math.sqrt),
        ei: ei,
        trueFuncY: trueFuncY,
        testPoints: testPoints,
        nextX: nextX
    });
}
