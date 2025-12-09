// Simple Matrix / Vector Math Helpers
function randomMatrix(rows, cols) {
    const data = new Float32Array(rows * cols);
    for(let i=0; i<data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sqrt(2.0 / (rows + cols)); // Xavier init
    return { rows, cols, data };
}

function matMul(A, x) { // Matrix A * Vector x
    const result = new Float32Array(A.rows);
    for(let i=0; i<A.rows; i++) {
        let sum = 0;
        for(let j=0; j<A.cols; j++) {
            sum += A.data[i * A.cols + j] * x[j];
        }
        result[i] = sum;
    }
    return result;
}

function relu(x) {
    return x.map(v => Math.max(0, v));
}

function reluDerivative(x) {
    return x.map(v => v > 0 ? 1 : 0);
}

// Global state
let W1, B1, W2, B2;
let inputDim, hiddenDim, lr;
let isTraining = false;

self.onmessage = function(e) {
    const { command } = e.data;
    if (command === 'start') {
        inputDim = e.data.inputDim;
        hiddenDim = e.data.hiddenDim;
        lr = e.data.learningRate;
        
        // Initialize Weights
        // Encoder: Input -> Hidden
        W1 = randomMatrix(hiddenDim, inputDim);
        B1 = new Float32Array(hiddenDim);
        
        // Decoder: Hidden -> Input
        W2 = randomMatrix(inputDim, hiddenDim);
        B2 = new Float32Array(inputDim);
        
        isTraining = true;
        trainLoop();
    }
};

async function trainLoop() {
    let epoch = 0;
    
    // Generate a fixed pattern to learn (e.g., Sine wave)
    const pattern = new Float32Array(inputDim);
    for(let i=0; i<inputDim; i++) {
        pattern[i] = Math.sin(i / inputDim * Math.PI * 2);
    }

    // Add some noise for robustness? Or just learn one pattern.
    // For autoencoder demo, learning one pattern is enough to show convergence.

    while (isTraining && epoch < 5000) {
        // Forward Pass
        // 1. Encoder
        const z1 = matMul(W1, pattern);
        // Add bias
        for(let i=0; i<hiddenDim; i++) z1[i] += B1[i];
        const h = relu(z1); // Hidden activation

        // 2. Decoder
        const z2 = matMul(W2, h);
        for(let i=0; i<inputDim; i++) z2[i] += B2[i];
        const output = z2; // Linear output for reconstruction (or Tanh if range -1 to 1)
        
        // Loss (MSE)
        let loss = 0;
        const error = new Float32Array(inputDim);
        for(let i=0; i<inputDim; i++) {
            error[i] = output[i] - pattern[i]; // Pred - Target
            loss += error[i] * error[i];
        }
        loss /= inputDim;

        // Backward Pass (Gradient Descent)
        // dLoss/dOutput = 2 * error / N (We omit 2/N scaling for simplicity or fold into LR)
        const dOutput = error; 

        // Gradients for W2, B2
        // dOutput = d(W2*h + B2)
        // dW2 = dOutput * h^T
        // dB2 = dOutput
        for(let i=0; i<inputDim; i++) {
            B2[i] -= lr * dOutput[i];
            for(let j=0; j<hiddenDim; j++) {
                // W2[i][j] -= lr * dOutput[i] * h[j]
                W2.data[i * hiddenDim + j] -= lr * dOutput[i] * h[j];
            }
        }

        // Backprop to Hidden
        // dH = W2^T * dOutput
        const dH = new Float32Array(hiddenDim);
        for(let j=0; j<hiddenDim; j++) {
            let sum = 0;
            for(let i=0; i<inputDim; i++) {
                sum += W2.data[i * hiddenDim + j] * dOutput[i];
            }
            dH[j] = sum;
        }

        // Activation derivative
        const dZ1 = new Float32Array(hiddenDim);
        const reluGrad = reluDerivative(z1);
        for(let i=0; i<hiddenDim; i++) dZ1[i] = dH[i] * reluGrad[i];

        // Gradients for W1, B1
        for(let i=0; i<hiddenDim; i++) {
            B1[i] -= lr * dZ1[i];
            for(let j=0; j<inputDim; j++) {
                // W1[i][j] -= lr * dZ1[i] * pattern[j]
                W1.data[i * inputDim + j] -= lr * dZ1[i] * pattern[j];
            }
        }

        epoch++;
        
        // Report progress every 50 epochs (or 10ms approx)
        if (epoch % 50 === 0) {
            self.postMessage({
                type: 'epoch',
                data: {
                    epoch,
                    loss,
                    original: pattern,
                    reconstructed: output
                }
            });
            // Yield to event loop to allow message passing and termination
            await new Promise(r => setTimeout(r, 10));
        }
    }
    
    if (isTraining) {
        self.postMessage({ type: 'done' });
    }
}
