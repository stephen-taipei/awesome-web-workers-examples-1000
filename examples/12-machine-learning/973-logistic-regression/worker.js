let trainData = [];
let weights = { w0: 0, w1: 0 };
let bias = 0;

self.onmessage = async function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        const { width, height } = e.data;
        generateData(width, height);
        self.postMessage({ type: 'data', data: trainData });
    } 
    else if (command === 'train') {
        const { learningRate, epochs } = e.data;
        await train(learningRate, epochs);
        self.postMessage({ type: 'done' });
    }
};

function generateData(w, h) {
    trainData = [];
    // Generate two clusters
    // Cluster 0: centered at (w/3, h/3)
    // Cluster 1: centered at (2w/3, 2h/3)
    const n = 50; // per class
    
    for(let i=0; i<n; i++) {
        // Class 0
        trainData.push({
            x: w/3 + (Math.random()-0.5) * w/3,
            y: h/3 + (Math.random()-0.5) * h/3,
            label: 0
        });
        // Class 1
        trainData.push({
            x: 2*w/3 + (Math.random()-0.5) * w/3,
            y: 2*h/3 + (Math.random()-0.5) * h/3,
            label: 1
        });
    }
    
    // Init weights
    weights = { w0: Math.random()-0.5, w1: Math.random()-0.5 };
    bias = Math.random()-0.5;
}

function sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
}

async function train(lr, maxEpochs) {
    // Normalize data for stable training? 
    // Standard SGD on raw pixels (0-500) is unstable.
    // Let's scale inputs during calculation.
    // Or just use very small LR. 0.05 implies normalized inputs usually.
    // Let's use normalized coordinates internally for calculation.
    
    const normData = trainData.map(p => ({
        x: p.x / 500, // assuming canvas size roughly
        y: p.y / 500,
        label: p.label
    }));
    
    // Reset weights for normalized space
    weights = { w0: Math.random()-0.5, w1: Math.random()-0.5 };
    bias = Math.random()-0.5;

    for (let epoch = 0; epoch <= maxEpochs; epoch++) {
        let totalLoss = 0;
        let correct = 0;
        
        // Gradient Descent (Batch or Stochastic? Let's do SGD)
        for (let i = 0; i < normData.length; i++) {
            const p = normData[i];
            
            // Forward
            const z = weights.w0 * p.x + weights.w1 * p.y + bias;
            const pred = sigmoid(z);
            
            // Log Loss: -y*log(p) - (1-y)*log(1-p)
            totalLoss += -(p.label * Math.log(pred + 1e-15) + (1 - p.label) * Math.log(1 - pred + 1e-15));
            
            // Accuracy check
            const cls = pred >= 0.5 ? 1 : 0;
            if (cls === p.label) correct++;
            
            // Backward (Gradient)
            // dL/dz = pred - y
            const error = pred - p.label;
            
            weights.w0 -= lr * error * p.x;
            weights.w1 -= lr * error * p.y;
            bias -= lr * error * 1;
        }
        
        if (epoch % 20 === 0) {
            // Denormalize weights for drawing
            // w0*x_norm + w1*y_norm + b_norm = 0
            // w0*(x/500) + w1*(y/500) + b_norm = 0
            // (w0/500)*x + (w1/500)*y + b_norm = 0
            // So effective display weights are w/500.
            
            const displayWeights = {
                w0: weights.w0 / 500,
                w1: weights.w1 / 500
            };
            
            self.postMessage({
                type: 'step',
                data: {
                    epoch,
                    loss: totalLoss / normData.length,
                    accuracy: correct / normData.length,
                    weights: displayWeights,
                    bias: bias // bias is constant term, doesn't scale with input
                }
            });
            await new Promise(r => setTimeout(r, 10));
        }
    }
}
