/**
 * Web Worker for Stochastic Gradient Descent
 * Implements mini-batch SGD with momentum for regression problems
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { problemType, datasetSize, batchSize, learningRate,
                momentum, epochs, noiseLevel } = data;

        reportProgress(5);

        // Generate synthetic dataset
        const dataset = generateDataset(problemType, datasetSize, noiseLevel);

        reportProgress(10);

        // Initialize parameters based on problem type
        const numFeatures = problemType === 'polynomial' ? 3 : 2;
        let theta = new Array(numFeatures).fill(0).map(() => (Math.random() - 0.5) * 0.1);
        let velocity = new Array(numFeatures).fill(0);

        // Determine actual batch size
        const actualBatchSize = batchSize === 'full' ? datasetSize : parseInt(batchSize);
        const batchesPerEpoch = Math.ceil(datasetSize / actualBatchSize);

        // Training history
        const history = {
            trainLoss: [],
            gradNorms: [],
            paramHistory: [],
            epochTimes: []
        };

        // Training loop
        for (let epoch = 0; epoch < epochs; epoch++) {
            const epochStart = performance.now();

            // Shuffle dataset
            shuffleArray(dataset.X, dataset.y);

            let epochLoss = 0;
            let epochGradNorm = 0;
            let batchCount = 0;

            // Process mini-batches
            for (let i = 0; i < datasetSize; i += actualBatchSize) {
                const batchEnd = Math.min(i + actualBatchSize, datasetSize);
                const batchX = dataset.X.slice(i, batchEnd);
                const batchY = dataset.y.slice(i, batchEnd);

                // Compute gradient
                const { gradient, loss } = computeGradient(
                    theta, batchX, batchY, problemType
                );

                // Update with momentum
                for (let j = 0; j < theta.length; j++) {
                    velocity[j] = momentum * velocity[j] + gradient[j];
                    theta[j] -= learningRate * velocity[j];
                }

                epochLoss += loss;
                epochGradNorm += norm(gradient);
                batchCount++;
            }

            epochLoss /= batchCount;
            epochGradNorm /= batchCount;

            // Record history
            history.trainLoss.push(epochLoss);
            history.gradNorms.push(epochGradNorm);
            history.paramHistory.push(theta.slice());
            history.epochTimes.push(performance.now() - epochStart);

            // Progress update
            if (epoch % Math.ceil(epochs / 20) === 0 || epoch === epochs - 1) {
                reportProgress(10 + (epoch / epochs) * 80);
            }
        }

        reportProgress(95);

        // Compute final predictions and metrics
        const predictions = dataset.X.map(x => predict(theta, x, problemType));
        const finalLoss = computeLoss(predictions, dataset.y, problemType);

        // Compute R² for regression
        let r2 = 0;
        if (problemType !== 'logistic') {
            const meanY = dataset.y.reduce((a, b) => a + b, 0) / dataset.y.length;
            const ssTotal = dataset.y.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
            const ssResidual = dataset.y.reduce((sum, y, i) => sum + (y - predictions[i]) ** 2, 0);
            r2 = 1 - ssResidual / ssTotal;
        }

        // For classification, compute accuracy
        let accuracy = 0;
        if (problemType === 'logistic') {
            const predicted = predictions.map(p => p > 0.5 ? 1 : 0);
            accuracy = predicted.reduce((sum, p, i) => sum + (p === dataset.y[i] ? 1 : 0), 0) / datasetSize;
        }

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                problemType,
                datasetSize,
                batchSize: actualBatchSize,
                learningRate,
                momentum,
                epochs,
                finalTheta: theta,
                trueTheta: dataset.trueTheta,
                history,
                finalLoss,
                r2,
                accuracy,
                batchesPerEpoch,
                totalIterations: epochs * batchesPerEpoch,
                sampleData: {
                    X: dataset.X.slice(0, 50),
                    y: dataset.y.slice(0, 50),
                    predictions: predictions.slice(0, 50)
                }
            },
            executionTime
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};

function reportProgress(percent) {
    self.postMessage({ type: 'progress', percentage: Math.round(percent) });
}

function generateDataset(problemType, size, noiseLevel) {
    const X = [];
    const y = [];
    let trueTheta;

    switch (problemType) {
        case 'linear':
            // y = 2x + 1 + noise
            trueTheta = [1, 2]; // [bias, slope]
            for (let i = 0; i < size; i++) {
                const x = Math.random() * 10 - 5;
                X.push([1, x]); // Add bias term
                y.push(trueTheta[0] + trueTheta[1] * x + (Math.random() - 0.5) * noiseLevel * 10);
            }
            break;

        case 'polynomial':
            // y = 0.5 + 2x - 0.3x² + noise
            trueTheta = [0.5, 2, -0.3];
            for (let i = 0; i < size; i++) {
                const x = Math.random() * 6 - 3;
                X.push([1, x, x * x]);
                y.push(trueTheta[0] + trueTheta[1] * x + trueTheta[2] * x * x +
                       (Math.random() - 0.5) * noiseLevel * 5);
            }
            break;

        case 'logistic':
            // Binary classification
            trueTheta = [-0.5, 1.5];
            for (let i = 0; i < size; i++) {
                const x = Math.random() * 8 - 4;
                X.push([1, x]);
                const p = sigmoid(trueTheta[0] + trueTheta[1] * x);
                // Add noise to probability
                const noisyP = Math.min(1, Math.max(0, p + (Math.random() - 0.5) * noiseLevel));
                y.push(Math.random() < noisyP ? 1 : 0);
            }
            break;
    }

    return { X, y, trueTheta };
}

function computeGradient(theta, X, y, problemType) {
    const m = X.length;
    const gradient = new Array(theta.length).fill(0);
    let loss = 0;

    for (let i = 0; i < m; i++) {
        const prediction = predict(theta, X[i], problemType);
        const error = prediction - y[i];

        if (problemType === 'logistic') {
            // Cross-entropy loss gradient
            loss -= y[i] * Math.log(prediction + 1e-10) +
                    (1 - y[i]) * Math.log(1 - prediction + 1e-10);
        } else {
            // MSE loss
            loss += error * error;
        }

        for (let j = 0; j < theta.length; j++) {
            gradient[j] += error * X[i][j];
        }
    }

    // Average
    for (let j = 0; j < gradient.length; j++) {
        gradient[j] /= m;
    }
    loss /= m;

    return { gradient, loss };
}

function predict(theta, x, problemType) {
    let linear = 0;
    for (let j = 0; j < theta.length; j++) {
        linear += theta[j] * x[j];
    }

    if (problemType === 'logistic') {
        return sigmoid(linear);
    }
    return linear;
}

function computeLoss(predictions, y, problemType) {
    const m = y.length;
    let loss = 0;

    for (let i = 0; i < m; i++) {
        if (problemType === 'logistic') {
            loss -= y[i] * Math.log(predictions[i] + 1e-10) +
                    (1 - y[i]) * Math.log(1 - predictions[i] + 1e-10);
        } else {
            loss += (predictions[i] - y[i]) ** 2;
        }
    }

    return loss / m;
}

function sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

function norm(v) {
    return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function shuffleArray(X, y) {
    for (let i = X.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [X[i], X[j]] = [X[j], X[i]];
        [y[i], y[j]] = [y[j], y[i]];
    }
}
