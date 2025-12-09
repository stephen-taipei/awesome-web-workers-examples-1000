/**
 * Main script for Gradient Descent
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
        case 'simple':
            document.getElementById('functionType').value = 'quadratic';
            document.getElementById('learningRate').value = '0.1';
            document.getElementById('lrSchedule').value = 'constant';
            document.getElementById('initX').value = '5';
            document.getElementById('initY').value = '5';
            document.getElementById('maxIterations').value = '100';
            document.getElementById('tolerance').value = '1e-6';
            break;
        case 'rosenbrock':
            document.getElementById('functionType').value = 'rosenbrock';
            document.getElementById('learningRate').value = '0.001';
            document.getElementById('lrSchedule').value = 'constant';
            document.getElementById('initX').value = '-1';
            document.getElementById('initY').value = '1';
            document.getElementById('maxIterations').value = '10000';
            document.getElementById('tolerance').value = '1e-8';
            break;
        case 'multimodal':
            document.getElementById('functionType').value = 'rastrigin';
            document.getElementById('learningRate').value = '0.01';
            document.getElementById('lrSchedule').value = 'decay';
            document.getElementById('initX').value = '2';
            document.getElementById('initY').value = '2';
            document.getElementById('maxIterations').value = '1000';
            document.getElementById('tolerance').value = '1e-6';
            break;
        case 'unstable':
            document.getElementById('functionType').value = 'quadratic';
            document.getElementById('learningRate').value = '1.0';
            document.getElementById('lrSchedule').value = 'constant';
            document.getElementById('initX').value = '5';
            document.getElementById('initY').value = '5';
            document.getElementById('maxIterations').value = '100';
            document.getElementById('tolerance').value = '1e-6';
            break;
    }
}

function calculate() {
    try {
        const functionType = document.getElementById('functionType').value;
        const learningRate = parseFloat(document.getElementById('learningRate').value);
        const lrSchedule = document.getElementById('lrSchedule').value;
        const initX = parseFloat(document.getElementById('initX').value);
        const initY = parseFloat(document.getElementById('initY').value);
        const maxIterations = parseInt(document.getElementById('maxIterations').value);
        const tolerance = parseFloat(document.getElementById('tolerance').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { functionType, learningRate, lrSchedule, initX, initY, maxIterations, tolerance }
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
            converged, convergenceReason, history, learningRate, lrSchedule,
            optimum, optimumValue, distanceToOptimum, gradientNorm } = result;

    const scheduleNames = {
        'constant': 'Constant',
        'decay': 'Time Decay',
        'step': 'Step Decay',
        'exponential': 'Exponential Decay'
    };

    const reasonNames = {
        'gradient_small': 'Gradient norm < tolerance',
        'function_stable': 'Function value stable',
        'step_small': 'Step size < tolerance',
        'max_iterations': 'Maximum iterations reached',
        'diverged': 'Algorithm diverged'
    };

    let html = `
        <div class="result-card">
            <h3>Gradient Descent Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${functionName} Function</div>
                <div class="method-info">α = ${learningRate} | Schedule: ${scheduleNames[lrSchedule]}</div>
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
                    <span class="stat-label">|∇f|</span>
                    <span class="stat-value">${gradientNorm.toExponential(4)}</span>
                </div>
            </div>

            <div class="convergence-info ${converged ? 'converged' : convergenceReason === 'diverged' ? 'diverged' : 'not-converged'}">
                <strong>Status:</strong> ${reasonNames[convergenceReason]}
            </div>

            <h4>Optimization Path</h4>
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
                <div class="path-arrow">≈</div>
                <div class="path-point optimum">
                    <span class="point-label">Optimum</span>
                    <span class="point-value">(${optimum[0]}, ${optimum[1]})</span>
                </div>
            </div>

            <h4>Distance to Known Optimum: ${distanceToOptimum.toExponential(4)}</h4>

            <h4>Convergence Plot</h4>
            <div class="convergence-plot">
                <div class="plot-container">
    `;

    // Function value convergence
    const values = history.map(h => h.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values.filter(v => isFinite(v) && v > 0));

    html += `<div class="plot-title">Function Value f(x)</div><div class="plot-area value-plot">`;

    const displayHistory = history.length > 100 ?
        history.filter((_, i) => i % Math.ceil(history.length / 100) === 0 || i === history.length - 1) :
        history;

    displayHistory.forEach((h, i) => {
        const logVal = h.value > 0 ? Math.log10(h.value + 1e-10) : -10;
        const logMax = Math.log10(maxValue + 1e-10);
        const logMin = Math.log10(minValue + 1e-10);
        const height = logMax > logMin ? ((logVal - logMin) / (logMax - logMin) * 100) : 50;
        html += `<div class="plot-bar value" style="height: ${Math.max(2, Math.min(100, height))}%" title="Iter ${h.iteration}: f=${h.value.toExponential(2)}"></div>`;
    });

    html += `</div>`;

    // Gradient norm convergence
    html += `<div class="plot-title">Gradient Norm |∇f|</div><div class="plot-area grad-plot">`;

    const grads = history.map(h => h.gradNorm);
    const maxGrad = Math.max(...grads);
    const minGrad = Math.min(...grads.filter(g => isFinite(g) && g > 0));

    displayHistory.forEach((h) => {
        const logGrad = h.gradNorm > 0 ? Math.log10(h.gradNorm + 1e-10) : -10;
        const logMax = Math.log10(maxGrad + 1e-10);
        const logMin = Math.log10(minGrad + 1e-10);
        const height = logMax > logMin ? ((logGrad - logMin) / (logMax - logMin) * 100) : 50;
        html += `<div class="plot-bar grad" style="height: ${Math.max(2, Math.min(100, height))}%" title="Iter ${h.iteration}: |∇f|=${h.gradNorm.toExponential(2)}"></div>`;
    });

    html += `</div>`;

    // Learning rate over time
    html += `<div class="plot-title">Learning Rate α</div><div class="plot-area lr-plot">`;

    const lrs = history.map(h => h.lr);
    const maxLR = Math.max(...lrs);

    displayHistory.forEach((h) => {
        const height = maxLR > 0 ? (h.lr / maxLR * 100) : 50;
        html += `<div class="plot-bar lr" style="height: ${height}%" title="Iter ${h.iteration}: α=${h.lr.toExponential(2)}"></div>`;
    });

    html += `</div></div></div>`;

    // Trajectory table
    html += `
        <h4>Optimization Trajectory (Sample)</h4>
        <div class="trajectory-table">
            <table>
                <tr>
                    <th>Iteration</th>
                    <th>x</th>
                    <th>y</th>
                    <th>f(x,y)</th>
                    <th>|∇f|</th>
                    <th>α</th>
                </tr>
    `;

    // Show first few, last few, and some middle points
    const showIndices = new Set([0, 1, 2, 3, 4]);
    const len = history.length;
    if (len > 10) {
        showIndices.add(Math.floor(len / 4));
        showIndices.add(Math.floor(len / 2));
        showIndices.add(Math.floor(3 * len / 4));
    }
    showIndices.add(len - 3);
    showIndices.add(len - 2);
    showIndices.add(len - 1);

    let prevIdx = -1;
    [...showIndices].filter(i => i >= 0 && i < len).sort((a, b) => a - b).forEach(idx => {
        if (prevIdx >= 0 && idx - prevIdx > 1) {
            html += `<tr class="ellipsis"><td colspan="6">...</td></tr>`;
        }
        const h = history[idx];
        html += `
            <tr>
                <td>${h.iteration}</td>
                <td>${h.point[0].toFixed(6)}</td>
                <td>${h.point[1].toFixed(6)}</td>
                <td>${h.value.toExponential(4)}</td>
                <td>${h.gradNorm.toExponential(4)}</td>
                <td>${h.lr.toExponential(3)}</td>
            </tr>
        `;
        prevIdx = idx;
    });

    html += `</table></div></div>`;
    resultsDiv.innerHTML = html;
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadPreset('simple');
});
