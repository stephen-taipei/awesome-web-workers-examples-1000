// Simple MLP for XOR

const Sigmoid = {
    f: x => 1 / (1 + Math.exp(-x)),
    d: x => { const s = 1/(1+Math.exp(-x)); return s * (1-s); } // using x as pre-activation? 
    // Usually d(output) is output*(1-output) if output computed.
    // Here we pass pre-activation sum Z.
};

const Tanh = {
    f: x => Math.tanh(x),
    d: x => { const t = Math.tanh(x); return 1 - t*t; }
};

const ReLU = {
    f: x => Math.max(0, x),
    d: x => x > 0 ? 1 : 0
};

class MLP {
    constructor(input, hidden, output, actFunc) {
        this.act = actFunc;
        
        // Weights: Hidden x Input, Output x Hidden
        this.W1 = new Float32Array(hidden * input);
        this.b1 = new Float32Array(hidden);
        
        this.W2 = new Float32Array(output * hidden);
        this.b2 = new Float32Array(output);
        
        // Init
        for(let i=0; i<this.W1.length; i++) this.W1[i] = (Math.random() - 0.5) * 2;
        for(let i=0; i<this.W2.length; i++) this.W2[i] = (Math.random() - 0.5) * 2;
        
        this.hNodes = hidden;
        this.iNodes = input;
        this.oNodes = output;
    }
    
    forward(x) {
        this.z1 = new Float32Array(this.hNodes);
        this.a1 = new Float32Array(this.hNodes);
        
        // Layer 1
        for(let i=0; i<this.hNodes; i++) {
            let sum = this.b1[i];
            for(let j=0; j<this.iNodes; j++) {
                sum += x[j] * this.W1[i * this.iNodes + j];
            }
            this.z1[i] = sum;
            this.a1[i] = this.act.f(sum);
        }
        
        // Layer 2 (Output is Sigmoid usually for 0-1)
        // Or just linear if we use MSE? Let's use Sigmoid output for prob.
        let z2 = this.b2[0]; // Output dim is 1 for XOR
        for(let i=0; i<this.hNodes; i++) {
            z2 += this.a1[i] * this.W2[i]; // W2 is 1 x hidden flattened
        }
        this.output = 1 / (1 + Math.exp(-z2));
        return this.output;
    }
    
    backward(target, lr) {
        // MSE Loss: (y - t)^2 => dLoss/dy = 2(y-t)
        // With Sigmoid output: dLoss/dZ2 = (y-t) * y(1-y)
        // Actually standard backprop for Sigmoid+MSE:
        // Delta2 = (output - target) * output * (1 - output)
        
        const error = this.output - target;
        const delta2 = error * this.output * (1 - this.output); // scalar
        
        // dW2 = delta2 * a1
        const dW2 = new Float32Array(this.hNodes);
        for(let i=0; i<this.hNodes; i++) dW2[i] = delta2 * this.a1[i];
        
        // delta1 = (W2^T * delta2) * act'(z1)
        const delta1 = new Float32Array(this.hNodes);
        for(let i=0; i<this.hNodes; i++) {
            const weight = this.W2[i]; // W2 is 1xH, so W2[0][i] effectively
            delta1[i] = (weight * delta2) * this.act.d(this.z1[i]);
        }
        
        // Update
        this.b2[0] -= lr * delta2;
        for(let i=0; i<this.hNodes; i++) {
            this.W2[i] -= lr * dW2[i];
            this.b1[i] -= lr * delta1[i]; // db1 = delta1
            
            // dW1 input is stored in x? We need x.
            // Hack: assume forward stored x or pass it
        }
        return delta1; // Return to handle W1 update outside or store X
    }
    
    updateW1(x, delta1, lr) {
        for(let i=0; i<this.hNodes; i++) {
            for(let j=0; j<this.iNodes; j++) {
                const grad = delta1[i] * x[j];
                this.W1[i * this.iNodes + j] -= lr * grad;
            }
        }
    }
}

self.onmessage = async function(e) {
    const { command, hidden, activation } = e.data;

    if (command === 'train') {
        let actFunc = Sigmoid;
        if (activation === 'tanh') actFunc = Tanh;
        if (activation === 'relu') actFunc = ReLU;

        const mlp = new MLP(2, hidden, 1, actFunc);
        const lr = 0.1;
        
        const inputs = [[0,0], [0,1], [1,0], [1,1]];
        const targets = [0, 1, 1, 0]; // XOR

        const gridSize = 50;
        
        for (let epoch = 0; epoch <= 10000; epoch++) {
            let totalLoss = 0;
            
            // Train batch
            for (let i = 0; i < 4; i++) {
                // Shuffle? For XOR 4 points, doesn't matter much
                const idx = Math.floor(Math.random() * 4);
                const x = inputs[idx];
                const t = targets[idx];
                
                const y = mlp.forward(x);
                totalLoss += (y - t) ** 2;
                
                const d1 = mlp.backward(t, lr);
                mlp.updateW1(x, d1, lr);
            }
            
            if (epoch % 100 === 0) {
                // Generate Heatmap
                const heatmap = new Float32Array(gridSize * gridSize);
                for(let r=0; r<gridSize; r++) {
                    for(let c=0; c<gridSize; c++) {
                        // Map pixel to input space -0.1 to 1.1 for margin
                        const px = c / gridSize * 1.2 - 0.1;
                        const py = 1.0 - (r / gridSize * 1.2 - 0.1); // Invert Y match canvas
                        
                        const out = mlp.forward([px, py]);
                        heatmap[r * gridSize + c] = out;
                    }
                }

                self.postMessage({
                    type: 'epoch',
                    data: {
                        epoch,
                        loss: totalLoss / 4,
                        heatmap,
                        gridSize,
                        inputs,
                        targets
                    }
                });
                
                await new Promise(r => setTimeout(r, 10));
                
                if (totalLoss < 0.001) break; // Converged
            }
        }
        
        self.postMessage({ type: 'done' });
    }
};
