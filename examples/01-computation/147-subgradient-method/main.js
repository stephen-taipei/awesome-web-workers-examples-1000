/**
 * Main script for Subgradient Method
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
        case 'abs':
            document.getElementById('functionType').value = 'abs';
            document.getElementById('stepRule').value = 'decay_sqrt';
            document.getElementById('stepParam').value = '0.5';
            document.getElementById('initX').value = '2.0';
            document.getElementById('initY').value = '-2.0';
            break;
        case 'hinge':
            document.getElementById('functionType').value = 'hinge';
            document.getElementById('stepRule').value = 'decay_linear';
            document.getElementById('stepParam').value = '1.0';
            document.getElementById('initX').value = '0.0';
            document.getElementById('initY').value = '0.0';
            break;
        case 'slow':
            document.getElementById('functionType').value = 'l1_regularized';
            document.getElementById('stepRule').value = 'decay_sqrt';
            document.getElementById('stepParam').value = '0.1';
            document.getElementById('initX').value = '5.0';
            document.getElementById('initY').value = '5.0';
            break;
    }
}

function calculate() {
    try {
        const functionType = document.getElementById('functionType').value;
        const stepRule = document.getElementById('stepRule').value;
        const stepParam = parseFloat(document.getElementById('stepParam').value);
        const initX = parseFloat(document.getElementById('initX').value);
        const initY = parseFloat(document.getElementById('initY').value);
        const maxIterations = parseInt(document.getElementById('maxIterations').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: {
                functionType,
                stepRule,
                stepParam,
                initPoint: [initX, initY],
                maxIterations
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
            history, distanceToOptimum } = result;

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
                    <span class="stat-label">Best Value</span>
                    <span class="stat-value">${finalValue.toExponential(4)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Distance to Opt</span>
                    <span class="stat-value">${distanceToOptimum.toExponential(4)}</span>
                </div>
            </div>

            <h4>Optimization Path</h4>
            <div class="path-summary">
                <div class="path-point start">
                    <span class="point-label">Start</span>
                    <span class="point-value">(${initialPoint[0].toFixed(4)}, ${initialPoint[1].toFixed(4)})</span>
                </div>
                <div class="path-arrow">→</div>
                <div class="path-point end">
                    <span class="point-label">Best Point</span>
                    <span class="point-value">(${finalPoint[0].toFixed(4)}, ${finalPoint[1].toFixed(4)})</span>
                </div>
            </div>

            <h4>Convergence Plot</h4>
            <div class="convergence-plot">
                <div class="plot-container">
                    <div class="plot-area value-plot">
    `;

    const values = history.map(h => h.value);
    const bestValues = history.map(h => h.bestValue);

    // We want to show both current value (noisy) and best value (monotonic)

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values.filter(v => isFinite(v)));

    const displayHistory = history.length > 100 ?
        history.filter((_, i) => i % Math.ceil(history.length / 100) === 0 || i === history.length - 1) :
        history;

    displayHistory.forEach((h) => {
        let val = h.value; // Current value can oscillate

        let logVal, logMin, logMax;
        const shift = Math.abs(minValue) + 1e-5;

        logVal = Math.log10(val + shift);
        logMin = Math.log10(minValue + shift);
        logMax = Math.log10(maxValue + shift);

        const height = logMax > logMin ? ((logVal - logMin) / (logMax - logMin) * 100) : 50;

        // Also show best value so far
        const bestVal = h.bestValue;
        const logBest = Math.log10(bestVal + shift);
        const bestHeight = logMax > logMin ? ((logBest - logMin) / (logMax - logMin) * 100) : 50;

        // Use a color for best value overlay
        html += `<div class="plot-bar value" style="height: ${Math.max(2, Math.min(100, height))}%; opacity: 0.3;" title="Iter ${h.iteration} Curr: ${h.value.toExponential(4)}"></div>`;
        html += `<div class="plot-bar" style="height: ${Math.max(2, Math.min(100, bestHeight))}%; background-color: #2196f3; width: 2px; position: absolute; margin-left: 0;" title="Iter ${h.iteration} Best: ${h.bestValue.toExponential(4)}"></div>`;
    });

    html += `   </div>
                </div>
                <div style="text-align:center; font-size: 0.8em; color: #666;">Light bars: Current Value | Blue line: Best Value So Far</div>
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
    loadPreset('abs');
});
