/**
 * Main script for Coordinate Descent
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
        case 'cyclic':
            document.getElementById('functionType').value = 'quadratic';
            document.getElementById('updateRule').value = 'cyclic';
            document.getElementById('initX').value = '-4.0';
            document.getElementById('initY').value = '3.0';
            break;
        case 'random':
            document.getElementById('functionType').value = 'rosenbrock';
            document.getElementById('updateRule').value = 'random';
            document.getElementById('initX').value = '-1.0';
            document.getElementById('initY').value = '1.0';
            break;
        case 'lasso':
            document.getElementById('functionType').value = 'lasso';
            document.getElementById('updateRule').value = 'cyclic';
            document.getElementById('initX').value = '5.0';
            document.getElementById('initY').value = '5.0';
            break;
    }
}

function calculate() {
    try {
        const functionType = document.getElementById('functionType').value;
        const updateRule = document.getElementById('updateRule').value;
        const initX = parseFloat(document.getElementById('initX').value);
        const initY = parseFloat(document.getElementById('initY').value);
        const maxIterations = parseInt(document.getElementById('maxIterations').value);
        const stepSize = parseFloat(document.getElementById('stepSize').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: {
                functionType,
                updateRule,
                initPoint: [initX, initY],
                maxIterations,
                stepSize
            }
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
    document.getElementById('progressText').textContent = `Processing... ${percentage}%`;
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

function displayResults(result, executionTime) {
    const resultsDiv = document.getElementById('results');
    const { functionName, initialPoint, finalPoint, finalValue, iterations,
            converged, history, distanceToOptimum } = result;

    let html = `
        <div class="result-card">
            <h3>Optimization Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${functionName} Function</div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Iterations</span>
                    <span class="stat-value">${iterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Converged</span>
                    <span class="stat-value ${converged ? 'success' : 'warning'}">${converged ? 'Yes' : 'No'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Final Value</span>
                    <span class="stat-value">${finalValue.toExponential(4)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Distance to Opt</span>
                    <span class="stat-value">${distanceToOptimum.toExponential(4)}</span>
                </div>
            </div>

            <h4>Optimization Path (Staircase Pattern)</h4>
            <div class="path-summary">
                <div class="path-point start">
                    <span class="point-label">Start</span>
                    <span class="point-value">(${initialPoint[0].toFixed(4)}, ${initialPoint[1].toFixed(4)})</span>
                </div>
                <div class="path-arrow">→</div>
                <div class="path-point end">
                    <span class="point-label">End</span>
                    <span class="point-value">(${finalPoint[0].toFixed(4)}, ${finalPoint[1].toFixed(4)})</span>
                </div>
            </div>

            <h4>Convergence Plot</h4>
            <div class="convergence-plot">
                <div class="plot-container">
                    <div class="plot-area value-plot">
    `;

    const values = history.map(h => h.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values.filter(v => isFinite(v)));

    const displayHistory = history.length > 100 ?
        history.filter((_, i) => i % Math.ceil(history.length / 100) === 0 || i === history.length - 1) :
        history;

    displayHistory.forEach((h) => {
        let val = h.value;
        let logVal, logMin, logMax;

        if (minValue <= 0) {
             const shift = Math.abs(minValue) + 1e-10;
             logVal = Math.log10(val + shift);
             logMin = Math.log10(minValue + shift);
             logMax = Math.log10(maxValue + shift);
        } else {
             logVal = Math.log10(val + 1e-10);
             logMin = Math.log10(minValue + 1e-10);
             logMax = Math.log10(maxValue + 1e-10);
        }

        const height = logMax > logMin ? ((logVal - logMin) / (logMax - logMin) * 100) : 50;

        html += `<div class="plot-bar value" style="height: ${Math.max(2, Math.min(100, height))}%" title="Iter ${h.iteration}: ${h.value.toExponential(4)}"></div>`;
    });

    html += `   </div>
                </div>
             </div>
        </div>`;

    resultsDiv.innerHTML = html;
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadPreset('cyclic');
});
