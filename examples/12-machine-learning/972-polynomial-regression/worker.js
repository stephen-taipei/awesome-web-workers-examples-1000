let trainData = [];
let weights = [];

self.onmessage = async function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        generateData();
        self.postMessage({ type: 'data', data: trainData });
    } 
    else if (command === 'train') {
        const { degree, learningRate } = e.data;
        await train(degree, learningRate);
        self.postMessage({ type: 'done' });
    }
};

function generateData() {
    trainData = [];
    const n = 50;
    for(let i=0; i<n; i++) {
        const x = i / (n-1); // 0 to 1
        // Function: y = sin(2*pi*x) + 0.5*x + noise
        // Non-linear shape
        const y = Math.sin(2 * Math.PI * x) + 0.5 * x + (Math.random()-0.5)*0.4;
        trainData.push({ x, y });
    }
    
    // Reset weights to empty so UI clears
    weights = [];
}

async function train(degree, lr) {
    // Initialize weights: degree + 1 coefficients (w0 ... wd)
    weights = new Float32Array(degree + 1);
    for(let i=0; i<=degree; i++) weights[i] = Math.random() * 0.1;

    const maxEpochs = 5000;
    
    for (let epoch = 0; epoch <= maxEpochs; epoch++) {
        let totalLoss = 0;
        
        // Gradients for each weight
        const grads = new Float32Array(degree + 1);
        
        // Compute gradients over whole batch (Batch Gradient Descent)
        for (let p of trainData) {
            // Prediction
            let y_pred = 0;
            for (let d = 0; d <= degree; d++) {
                y_pred += weights[d] * Math.pow(p.x, d);
            }
            
            const error = y_pred - p.y;
            totalLoss += error * error;
            
            // dLoss/dw_d = 2 * error * x^d
            for (let d = 0; d <= degree; d++) {
                grads[d] += 2 * error * Math.pow(p.x, d);
            }
        }
        
        // Average gradients
        for (let d = 0; d <= degree; d++) {
            grads[d] /= trainData.length;
        }
        
        totalLoss /= trainData.length; // MSE
        
        // Update weights
        for (let d = 0; d <= degree; d++) {
            weights[d] -= lr * grads[d];
        }
        
        // Report
        if (epoch % 50 === 0) {
            self.postMessage({
                type: 'epoch',
                data: {
                    epoch,
                    loss: totalLoss,
                    weights: weights
                }
            });
            // Delay for visualization
            await new Promise(r => setTimeout(r, 10));
        }
    }
}
