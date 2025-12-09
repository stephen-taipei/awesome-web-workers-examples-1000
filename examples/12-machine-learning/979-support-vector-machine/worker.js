// Simplified SMO (Sequential Minimal Optimization)
// Based on Platt's SMO algorithm for SVM training

let data = [];
let alphas = [];
let b = 0;
let kernelType = 'linear';
let paramC = 1.0;
let paramSigma = 0.5;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        // Generate 2D data, some linear, some circle
        data = [];
        // Class 1: Center blob
        for(let i=0; i<30; i++) {
            const r = Math.random() * 0.3;
            const t = Math.random() * 2 * Math.PI;
            data.push({ x: r*Math.cos(t), y: r*Math.sin(t), label: 1 });
        }
        // Class -1: Outer ring
        for(let i=0; i<40; i++) {
            const r = 0.6 + Math.random() * 0.3;
            const t = Math.random() * 2 * Math.PI;
            data.push({ x: r*Math.cos(t), y: r*Math.sin(t), label: -1 });
        }
        self.postMessage({ type: 'data', data });
    }
    else if (command === 'train') {
        kernelType = e.data.kernel;
        paramC = e.data.C;
        paramSigma = e.data.sigma;
        
        trainSMO();
        
        // Generate grid for visualization
        const size = 50;
        const grid = new Float32Array(size * size);
        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                // Map 0..size to -1..1
                const x = (c / size) * 2 - 1;
                const y = (r / size) * 2 - 1;
                const val = predict(x, y);
                grid[r * size + c] = val;
            }
        }
        
        self.postMessage({ type: 'result', data: { grid, gridSize: size } });
    }
};

function kernel(p1, p2) {
    if (kernelType === 'linear') {
        return p1.x * p2.x + p1.y * p2.y;
    } else {
        // RBF
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.exp(-(dx*dx + dy*dy) / (2 * paramSigma * paramSigma));
    }
}

function predict(x, y) {
    let sum = b;
    const p = { x, y };
    for (let i = 0; i < data.length; i++) {
        if (alphas[i] > 0) {
            sum += alphas[i] * data[i].label * kernel(data[i], p);
        }
    }
    return sum;
}

function trainSMO() {
    const maxPasses = 5;
    const tol = 1e-4;
    const n = data.length;
    alphas = new Float32Array(n).fill(0);
    b = 0;
    
    let passes = 0;
    let iter = 0;
    
    // Pre-compute kernel matrix for speed? For small N ok.
    
    while (passes < maxPasses && iter < 2000) {
        let numChangedAlphas = 0;
        for (let i = 0; i < n; i++) {
            const Ei = predict(data[i].x, data[i].y) - data[i].label;
            
            if ((data[i].label * Ei < -tol && alphas[i] < paramC) || 
                (data[i].label * Ei > tol && alphas[i] > 0)) {
                
                // Select j random != i
                let j = Math.floor(Math.random() * (n - 1));
                if (j >= i) j++;
                
                const Ej = predict(data[j].x, data[j].y) - data[j].label;
                
                const oldAi = alphas[i];
                const oldAj = alphas[j];
                
                let L, H;
                if (data[i].label !== data[j].label) {
                    L = Math.max(0, alphas[j] - alphas[i]);
                    H = Math.min(paramC, paramC + alphas[j] - alphas[i]);
                } else {
                    L = Math.max(0, alphas[i] + alphas[j] - paramC);
                    H = Math.min(paramC, alphas[i] + alphas[j]);
                }
                
                if (L === H) continue;
                
                const eta = 2 * kernel(data[i], data[j]) - kernel(data[i], data[i]) - kernel(data[j], data[j]);
                if (eta >= 0) continue;
                
                alphas[j] -= (data[j].label * (Ei - Ej)) / eta;
                alphas[j] = Math.max(L, Math.min(H, alphas[j]));
                
                if (Math.abs(alphas[j] - oldAj) < 1e-5) continue;
                
                alphas[i] += data[i].label * data[j].label * (oldAj - alphas[j]);
                
                const b1 = b - Ei - data[i].label * (alphas[i] - oldAi) * kernel(data[i], data[i]) - 
                           data[j].label * (alphas[j] - oldAj) * kernel(data[i], data[j]);
                           
                const b2 = b - Ej - data[i].label * (alphas[i] - oldAi) * kernel(data[i], data[j]) -
                           data[j].label * (alphas[j] - oldAj) * kernel(data[j], data[j]);
                           
                if (alphas[i] > 0 && alphas[i] < paramC) b = b1;
                else if (alphas[j] > 0 && alphas[j] < paramC) b = b2;
                else b = (b1 + b2) / 2;
                
                numChangedAlphas++;
            }
        }
        
        if (numChangedAlphas === 0) passes++;
        else passes = 0;
        
        iter++;
        if (iter % 50 === 0) {
            self.postMessage({ type: 'progress', data: { iter } });
        }
    }
}
