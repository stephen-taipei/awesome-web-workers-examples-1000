/**
 * Main script for Stochastic Gradient Descent
 */

let worker = null;

function initWorker() {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, result, executionTime, percentage, message } = e.data;

        if (type === 'progress') {
            updateProgress(percentage);
        } else if (type === 'result') {
            hideProgress();
            displayResults(result, executionTime);
            document.getElementById('calculateBtn').disabled = false;
        } else if (type === 'error') {
            hideProgress();
            displayError(message);
            document.getElementById('calculateBtn').disabled = false;
        }
    };

    worker.onerror = function(error) {
        hideProgress();
        displayError('Worker error: ' + error.message);
        document.getElementById('calculateBtn').disabled = false;
    };
}

function loadPreset(preset) {
    switch (preset) {
        case 'fast':
            document.getElementById('problemType').value = 'linear';
            document.getElementById('datasetSize').value = '1000';
            document.getElementById('batchSize').value = '32';
            document.getElementById('learningRate').value = '0.1';
            document.getElementById('momentum').value = '0';
            document.getElementById('epochs').value = '50';
            document.getElementById('noiseLevel').value = '0.3';
            break;
        case 'stable':
            document.getElementById('problemType').value = 'polynomial';
            document.getElementById('datasetSize').value = '1000';
            document.getElementById('batchSize').value = '64';
            document.getElementById('learningRate').value = '0.01';
            document.getElementById('momentum').value = '0';
            document.getElementById('epochs').value = '100';
            document.getElementById('noiseLevel').value = '0.3';
            break;
        case 'compare':
            document.getElementById('problemType').value = 'linear';
            document.getElementById('datasetSize').value = '1000';
            document.getElementById('batchSize').value = '1';
            document.getElementById('learningRate').value = '0.01';
            document.getElementById('momentum').value = '0';
            document.getElementById('epochs').value = '50';
            document.getElementById('noiseLevel').value = '0.3';
            break;
        case 'momentum':
            document.getElementById('problemType').value = 'polynomial';
            document.getElementById('datasetSize').value = '1000';
            document.getElementById('batchSize').value = '32';
            document.getElementById('learningRate').value = '0.01';
            document.getElementById('momentum').value = '0.9';
            document.getElementById('epochs').value = '100';
            document.getElementById('noiseLevel').value = '0.3';
            break;
    }
}

function calculate() {
    try {
        const problemType = document.getElementById('problemType').value;
        const datasetSize = parseInt(document.getElementById('datasetSize').value);
        const batchSize = document.getElementById('batchSize').value;
        const learningRate = parseFloat(document.getElementById('learningRate').value);
        const momentum = parseFloat(document.getElementById('momentum').value);
        const epochs = parseInt(document.getElementById('epochs').value);
        const noiseLevel = parseFloat(document.getElementById('noiseLevel').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { problemType, datasetSize, batchSize, learningRate, momentum, epochs, noiseLevel }
        });
    } catch (error) {
        displayError(error.message);
    }
}

function showProgress() {
    document.getElementById('progress').style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = 'Processing...';
}

function updateProgress(percentage) {
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Training... ${percentage}%`;
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

function displayResults(result, executionTime) {
    const resultsDiv = document.getElementById('results');
    const { problemType, datasetSize, batchSize, learningRate, momentum, epochs,
            finalTheta, trueTheta, history, finalLoss, r2, accuracy,
            batchesPerEpoch, totalIterations, sampleData } = result;

    const problemNames = {
        'linear': 'Linear Regression',
        'polynomial': 'Polynomial Regression',
        'logistic': 'Logistic Regression'
    };

    let html = `
        <div class="result-card">
            <h3>SGD Training Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${problemNames[problemType]}</div>
                <div class="method-info">
                    ${datasetSize} samples | Batch: ${batchSize} | α=${learningRate} | β=${momentum}
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Final Loss</span>
                    <span class="stat-value">${finalLoss.toFixed(6)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${problemType === 'logistic' ? 'Accuracy' : 'R²'}</span>
                    <span class="stat-value">${problemType === 'logistic' ? (accuracy * 100).toFixed(2) + '%' : r2.toFixed(4)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Epochs</span>
                    <span class="stat-value">${epochs}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Iterations</span>
                    <span class="stat-value">${totalIterations}</span>
                </div>
            </div>

            <h4>Learned Parameters vs True Parameters</h4>
            <div class="params-comparison">
                <table>
                    <tr>
                        <th>Parameter</th>
                        <th>True Value</th>
                        <th>Learned Value</th>
                        <th>Error</th>
                    </tr>
    `;

    const paramNames = problemType === 'polynomial' ?
        ['θ₀ (bias)', 'θ₁ (x)', 'θ₂ (x²)'] :
        ['θ₀ (bias)', 'θ₁ (slope)'];

    finalTheta.forEach((theta, i) => {
        const error = Math.abs(theta - trueTheta[i]);
        html += `
            <tr>
                <td>${paramNames[i]}</td>
                <td>${trueTheta[i].toFixed(4)}</td>
                <td>${theta.toFixed(4)}</td>
                <td class="${error < 0.1 ? 'good' : error < 0.5 ? 'ok' : 'bad'}">${error.toFixed(4)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Training loss plot
    html += `
        <h4>Training Loss</h4>
        <div class="plot-container">
            <div class="plot-area loss-plot">
    `;

    const maxLoss = Math.max(...history.trainLoss);
    const minLoss = Math.min(...history.trainLoss);
    const displayLoss = history.trainLoss.length > 100 ?
        history.trainLoss.filter((_, i) => i % Math.ceil(history.trainLoss.length / 100) === 0) :
        history.trainLoss;

    displayLoss.forEach((loss, i) => {
        const height = maxLoss > minLoss ?
            ((loss - minLoss) / (maxLoss - minLoss) * 100) : 50;
        html += `<div class="plot-bar loss" style="height: ${Math.max(2, height)}%" title="Epoch ${i}: Loss=${loss.toFixed(6)}"></div>`;
    });

    html += `</div></div>`;

    // Gradient norm plot
    html += `
        <h4>Gradient Norm (per epoch average)</h4>
        <div class="plot-container">
            <div class="plot-area grad-plot">
    `;

    const maxGrad = Math.max(...history.gradNorms);
    const minGrad = Math.min(...history.gradNorms);
    const displayGrads = history.gradNorms.length > 100 ?
        history.gradNorms.filter((_, i) => i % Math.ceil(history.gradNorms.length / 100) === 0) :
        history.gradNorms;

    displayGrads.forEach((grad, i) => {
        const height = maxGrad > minGrad ?
            ((grad - minGrad) / (maxGrad - minGrad) * 100) : 50;
        html += `<div class="plot-bar grad" style="height: ${Math.max(2, height)}%" title="Epoch ${i}: |∇|=${grad.toFixed(6)}"></div>`;
    });

    html += `</div></div>`;

    // Data visualization (for regression)
    if (problemType !== 'logistic') {
        html += `
            <h4>Data & Fit (Sample)</h4>
            <div class="data-plot">
                <div class="scatter-container">
        `;

        // Find range for scaling
        const xVals = sampleData.X.map(x => x[1]);
        const yVals = sampleData.y;
        const predVals = sampleData.predictions;

        const xMin = Math.min(...xVals);
        const xMax = Math.max(...xVals);
        const yMin = Math.min(...yVals, ...predVals);
        const yMax = Math.max(...yVals, ...predVals);

        sampleData.X.forEach((x, i) => {
            const xPos = (x[1] - xMin) / (xMax - xMin) * 100;
            const yPos = (sampleData.y[i] - yMin) / (yMax - yMin) * 100;
            html += `<div class="data-point" style="left: ${xPos}%; bottom: ${yPos}%" title="(${x[1].toFixed(2)}, ${sampleData.y[i].toFixed(2)})"></div>`;
        });

        // Draw fit line (simplified - just show some points)
        const fitPoints = [];
        for (let i = 0; i <= 20; i++) {
            const xVal = xMin + (xMax - xMin) * i / 20;
            let yPred;
            if (problemType === 'polynomial') {
                yPred = finalTheta[0] + finalTheta[1] * xVal + finalTheta[2] * xVal * xVal;
            } else {
                yPred = finalTheta[0] + finalTheta[1] * xVal;
            }
            const xPos = i / 20 * 100;
            const yPos = (yPred - yMin) / (yMax - yMin) * 100;
            fitPoints.push(`${xPos}%,${100 - yPos}%`);
        }

        html += `</div></div>`;
    }

    // Training summary
    html += `
        <h4>Training Summary</h4>
        <div class="summary-table">
            <table>
                <tr>
                    <td>Batches per Epoch</td>
                    <td>${batchesPerEpoch}</td>
                </tr>
                <tr>
                    <td>Initial Loss</td>
                    <td>${history.trainLoss[0].toFixed(6)}</td>
                </tr>
                <tr>
                    <td>Final Loss</td>
                    <td>${history.trainLoss[history.trainLoss.length - 1].toFixed(6)}</td>
                </tr>
                <tr>
                    <td>Loss Reduction</td>
                    <td>${((1 - history.trainLoss[history.trainLoss.length - 1] / history.trainLoss[0]) * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Avg Time per Epoch</td>
                    <td>${(history.epochTimes.reduce((a, b) => a + b, 0) / epochs).toFixed(2)}ms</td>
                </tr>
            </table>
        </div>
    `;

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadPreset('fast');
});
