// Simple Neural Network Framework in Worker

// Helper: Random Normal
function randn() {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Activation Functions
const ReLU = {
    f: x => Math.max(0, x),
    d: x => x > 0 ? 1 : 0
};

// Softmax Cross Entropy Loss is standard for classification
// We implement a simple 3-layer network: Input(2) -> Hidden(100) -> Hidden(100) -> Output(3)

class NeuralNet {
    constructor(layers) {
        this.layers = layers;
        this.weights = [];
        this.biases = [];
        
        // Init weights (He initialization)
        for (let i = 0; i < layers.length - 1; i++) {
            const dimIn = layers[i];
            const dimOut = layers[i+1];
            const scale = Math.sqrt(2.0 / dimIn);
            
            const W = new Float32Array(dimIn * dimOut);
            const b = new Float32Array(dimOut);
            
            for(let j=0; j<W.length; j++) W[j] = randn() * scale;
            
            this.weights.push({ data: W, rows: dimOut, cols: dimIn });
            this.biases.push(b);
        }
        
        // Cache for backprop
        this.activations = [];
        this.zs = [];
    }

    forward(input) {
        this.activations = [input];
        this.zs = [];
        
        let current = input; // input vector
        
        for (let i = 0; i < this.weights.length; i++) {
            const W = this.weights[i];
            const b = this.biases[i];
            
            const z = new Float32Array(W.rows);
            for(let r=0; r<W.rows; r++) {
                let sum = b[r];
                for(let c=0; c<W.cols; c++) {
                    sum += current[c] * W.data[r * W.cols + c];
                }
                z[r] = sum;
            }
            this.zs.push(z);
            
            // Activation
            let a;
            if (i === this.weights.length - 1) {
                // Softmax for last layer
                a = new Float32Array(W.rows);
                let maxVal = -Infinity;
                for(let v of z) if(v > maxVal) maxVal = v; // Stable softmax
                
                let sumExp = 0;
                for(let k=0; k<z.length; k++) {
                    a[k] = Math.exp(z[k] - maxVal);
                    sumExp += a[k];
                }
                for(let k=0; k<z.length; k++) a[k] /= sumExp;
            } else {
                // ReLU
                a = new Float32Array(W.rows);
                for(let k=0; k<z.length; k++) a[k] = ReLU.f(z[k]);
            }
            this.activations.push(a);
            current = a;
        }
        return current;
    }

    backward(target, lr, optimizer, iter) {
        const L = this.weights.length;
        // dLoss/dZ_last = Prob - OneHot(Target)
        const output = this.activations[L];
        let delta = new Float32Array(output);
        delta[target] -= 1.0; // Softmax Gradient simplified
        
        for (let i = L - 1; i >= 0; i--) {
            const prevA = this.activations[i];
            const W = this.weights[i];
            const rows = W.rows;
            const cols = W.cols;
            
            // Gradients
            // dW = delta * prevA^T
            // db = delta
            // dPrev = W^T * delta
            
            const dW = new Float32Array(rows * cols);
            for(let r=0; r<rows; r++) {
                for(let c=0; c<cols; c++) {
                    dW[r * cols + c] = delta[r] * prevA[c];
                }
            }
            
            const dB = delta; // Alias
            
            // Propagate delta backwards (if not first layer)
            if (i > 0) {
                const nextDelta = new Float32Array(cols);
                const zPrev = this.zs[i-1];
                
                for(let c=0; c<cols; c++) {
                    let sum = 0;
                    for(let r=0; r<rows; r++) {
                        sum += W.data[r * cols + c] * delta[r];
                    }
                    // ReLU derivative
                    nextDelta[c] = sum * ReLU.d(zPrev[c]);
                }
                delta = nextDelta;
            }
            
            // Update Weights (Optimizer Step)
            optimizer.update(i, this.weights[i].data, this.biases[i], dW, dB, lr, iter);
        }
    }
}

class SGD {
    update(layerIdx, W, b, dW, db, lr) {
        for(let i=0; i<W.length; i++) W[i] -= lr * dW[i];
        for(let i=0; i<b.length; i++) b[i] -= lr * db[i];
    }
}

class Adam {
    constructor(numLayers) {
        this.m_w = {}; this.v_w = {};
        this.m_b = {}; this.v_b = {};
        this.beta1 = 0.9; this.beta2 = 0.999;
        this.epsilon = 1e-8;
    }
    
    update(idx, W, b, dW, db, lr, t) {
        // Initialize stats if needed
        if (!this.m_w[idx]) {
            this.m_w[idx] = new Float32Array(W.length);
            this.v_w[idx] = new Float32Array(W.length);
            this.m_b[idx] = new Float32Array(b.length);
            this.v_b[idx] = new Float32Array(b.length);
        }
        
        const mw = this.m_w[idx], vw = this.v_w[idx];
        const mb = this.m_b[idx], vb = this.v_b[idx];
        
        // Weights
        for(let i=0; i<W.length; i++) {
            mw[i] = this.beta1 * mw[i] + (1 - this.beta1) * dW[i];
            vw[i] = this.beta2 * vw[i] + (1 - this.beta2) * dW[i] * dW[i];
            
            const m_hat = mw[i] / (1 - Math.pow(this.beta1, t));
            const v_hat = vw[i] / (1 - Math.pow(this.beta2, t));
            
            W[i] -= lr * m_hat / (Math.sqrt(v_hat) + this.epsilon);
        }
        
        // Biases
        for(let i=0; i<b.length; i++) {
            mb[i] = this.beta1 * mb[i] + (1 - this.beta1) * db[i];
            vb[i] = this.beta2 * vb[i] + (1 - this.beta2) * db[i] * db[i];
            
            const m_hat = mb[i] / (1 - Math.pow(this.beta1, t));
            const v_hat = vb[i] / (1 - Math.pow(this.beta2, t));
            
            b[i] -= lr * m_hat / (Math.sqrt(v_hat) + this.epsilon);
        }
    }
}

self.onmessage = async function(e) {
    const { command, optimizer: optType, learningRate, batchSize } = e.data;

    if (command === 'start') {
        // 1. Generate Spiral Data
        // 3 classes
        const N = 100; // points per class
        const K = 3;
        const D = 2;
        const X = new Float32Array(N*K*D);
        const y = new Int32Array(N*K);
        
        for (let j = 0; j < K; j++) {
            for (let i = 0; i < N; i++) {
                const r = i / N;
                const t = 1.75 * i / N * 2 * Math.PI + j * (2 * Math.PI / K);
                const ix = N*j + i;
                X[ix*D] = r * Math.sin(t) * 0.5 + 0.5 + randn()*0.01; // Normalize 0-1 approx
                X[ix*D+1] = r * Math.cos(t) * 0.5 + 0.5 + randn()*0.01;
                y[ix] = j;
            }
        }

        // 2. Init Network
        const nn = new NeuralNet([2, 50, 3]); // 2 Inputs, 50 Hidden, 3 Outputs
        const opt = optType === 'adam' ? new Adam() : new SGD();

        let epoch = 0;
        let iter = 0;

        // Grid for heatmap
        const gridSize = 50;
        const gridInput = new Float32Array(gridSize * gridSize * 2);
        for(let i=0; i<gridSize; i++) {
            for(let j=0; j<gridSize; j++) {
                const idx = (i * gridSize + j) * 2;
                gridInput[idx] = j / gridSize; // x
                gridInput[idx+1] = i / gridSize; // y
            }
        }

        // Training Loop
        while (epoch < 500) {
            // Shuffle? Naive: just random sample batch
            let lossSum = 0;
            let accSum = 0;
            
            // Batches per epoch
            const batches = Math.ceil((N*K) / batchSize);
            
            for (let b = 0; b < batches; b++) {
                iter++;
                
                for (let s = 0; s < batchSize; s++) {
                    // Random sample
                    const idx = Math.floor(Math.random() * (N*K));
                    const input = X.subarray(idx*2, idx*2+2);
                    const target = y[idx];
                    
                    const probs = nn.forward(input);
                    
                    // Loss: -log(p_correct)
                    lossSum += -Math.log(probs[target] + 1e-10);
                    
                    // Acc
                    let maxP = -1, pred = -1;
                    for(let k=0; k<3; k++) if(probs[k]>maxP) { maxP=probs[k]; pred=k; }
                    if(pred === target) accSum++;
                    
                    nn.backward(target, learningRate, opt, iter);
                }
            }
            
            epoch++;
            
            // Calc Heatmap
            const heatmap = new Uint8Array(gridSize * gridSize);
            for(let i=0; i<gridSize * gridSize; i++) {
                const input = gridInput.subarray(i*2, i*2+2);
                const probs = nn.forward(input);
                let maxP = -1, pred = -1;
                for(let k=0; k<3; k++) if(probs[k]>maxP) { maxP=probs[k]; pred=k; }
                heatmap[i] = pred;
            }

            self.postMessage({
                type: 'epoch',
                data: {
                    epoch,
                    loss: lossSum / (batches * batchSize),
                    accuracy: accSum / (batches * batchSize),
                    points: X,
                    labels: y,
                    heatmap: heatmap,
                    gridSize: gridSize
                }
            });
            
            await new Promise(r => setTimeout(r, 10));
        }
        
        self.postMessage({ type: 'done' });
    }
};
