let trainData = [];
let m = 0; // Slope
let b = 0; // Intercept

self.onmessage = async function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        const { count, noise } = e.data;
        generateData(count, noise);
        self.postMessage({ type: 'data', data: trainData });
    } 
    else if (command === 'train') {
        const { learningRate } = e.data;
        await train(learningRate);
        self.postMessage({ type: 'done' });
    }
};

function generateData(count, noise) {
    trainData = [];
    // Target line: y = 0.8x + 0.1
    const trueM = 0.8;
    const trueB = 0.1;
    
    for(let i=0; i<count; i++) {
        const x = Math.random(); // 0 to 1
        const noiseVal = (Math.random() - 0.5) * (noise / 100);
        const y = trueM * x + trueB + noiseVal;
        trainData.push({ x, y });
    }
    
    // Random init
    m = Math.random();
    b = Math.random();
}

async function train(lr) {
    const maxEpochs = 2000;
    const n = trainData.length;
    
    for (let epoch = 0; epoch <= maxEpochs; epoch++) {
        let sumError = 0;
        let gradM = 0;
        let gradB = 0;
        
        // Batch Gradient Descent
        for (let i = 0; i < n; i++) {
            const x = trainData[i].x;
            const y = trainData[i].y;
            
            const pred = m * x + b;
            const error = pred - y;
            sumError += error * error;
            
            // d(error^2)/dm = 2 * error * x
            gradM += 2 * error * x;
            // d(error^2)/db = 2 * error * 1
            gradB += 2 * error;
        }
        
        const mse = sumError / n;
        
        // Average gradients
        gradM /= n;
        gradB /= n;
        
        // Update
        m -= lr * gradM;
        b -= lr * gradB;
        
        // Report
        if (epoch % 20 === 0) {
            self.postMessage({
                type: 'epoch',
                data: {
                    epoch,
                    loss: mse,
                    m, 
                    b
                }
            });
            await new Promise(r => setTimeout(r, 10)); // UI update delay
        }
        
        if (mse < 0.0001) break; // Converged
    }
}
