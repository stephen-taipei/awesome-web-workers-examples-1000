let dataPoints = [];
let weights = { w0: 0, w1: 0, bias: 0 };

self.onmessage = async function(e) {
    const { command } = e.data;

    if (command === 'generate') {
        const { width, height } = e.data;
        generateLinearlySeparableData(width, height);
        self.postMessage({ type: 'data', data: dataPoints });
    } 
    else if (command === 'train') {
        const { learningRate, delay } = e.data;
        await train(learningRate, delay);
        self.postMessage({ type: 'done' });
    }
};

function generateLinearlySeparableData(w, h) {
    dataPoints = [];
    
    // Define a random separating line: y = mx + b
    const m = (Math.random() * 2 - 1); // Slope -1 to 1
    const b = Math.random() * h;
    
    const numPoints = 100;
    const margin = 20; // Minimum distance from line

    for (let i = 0; i < numPoints; i++) {
        let x, y, label, dist;
        
        // Keep generating until valid point with margin
        do {
            x = Math.random() * w;
            y = Math.random() * h;
            
            // Line val: mx + b - y = 0
            // Ideally normalized distance
            const val = m * x + b - y;
            
            // Assign label based on side of line
            label = val > 0 ? 1 : -1;
            
            // Approx distance check (vertical distance is |val|)
            dist = Math.abs(val);
            
        } while (dist < margin);

        dataPoints.push({ x, y, label });
    }
    
    // Randomize init weights
    weights = {
        w0: Math.random() * 2 - 1,
        w1: Math.random() * 2 - 1,
        bias: Math.random() * 2 - 1
    };
}

async function train(lr, delay) {
    let converged = false;
    let epoch = 0;
    const maxEpochs = 2000;

    while (!converged && epoch < maxEpochs) {
        let errorCount = 0;
        
        for (const p of dataPoints) {
            // Activation: w0*x + w1*y + bias
            const activation = weights.w0 * p.x + weights.w1 * p.y + weights.bias;
            
            // Step function (prediction)
            const pred = activation >= 0 ? 1 : -1;
            
            if (pred !== p.label) {
                // Update rule: w = w + lr * (target - pred) * input
                // error = target - pred. 
                // If target=1, pred=-1, err=2. 
                // If target=-1, pred=1, err=-2.
                const error = p.label - pred; 
                
                weights.w0 += lr * error * p.x; // x is input 0
                weights.w1 += lr * error * p.y; // y is input 1
                weights.bias += lr * error * 1; // bias input is 1
                
                errorCount++;
            }
        }

        epoch++;
        
        // Calculate accuracy
        const acc = (dataPoints.length - errorCount) / dataPoints.length;

        // Report progress
        if (epoch % 5 === 0 || errorCount === 0) {
            self.postMessage({
                type: 'epoch',
                data: {
                    epoch,
                    weights,
                    accuracy: acc
                }
            });
            if (delay > 0) await new Promise(r => setTimeout(r, delay));
        }

        if (errorCount === 0) converged = true;
    }
}
