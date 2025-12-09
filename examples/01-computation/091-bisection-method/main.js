/**
 * Main script for Bisection Method
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

function updateFunction() {
    const select = document.getElementById('functionSelect');
    const customInput = document.getElementById('customInput');
    customInput.style.display = select.value === 'custom' ? 'block' : 'none';

    // Update default bounds
    const defaults = {
        'polynomial': { a: 1, b: 2 },
        'trig': { a: 0, b: 1 },
        'exp': { a: 0, b: 1 },
        'log': { a: 2, b: 3 },
        'sqrt': { a: 0, b: Math.PI / 2 }
    };

    if (defaults[select.value]) {
        document.getElementById('leftBound').value = defaults[select.value].a;
        document.getElementById('rightBound').value = defaults[select.value].b;
    }
}

function loadSample(type) {
    document.getElementById('functionSelect').value = type;
    updateFunction();

    const samples = {
        'polynomial': { a: 1, b: 2 },
        'trig': { a: 0, b: 1 },
        'exp': { a: 0, b: 1 },
        'sqrt': { a: 0, b: Math.PI / 2 }
    };

    if (samples[type]) {
        document.getElementById('leftBound').value = samples[type].a;
        document.getElementById('rightBound').value = samples[type].b;
    }
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const a = parseFloat(document.getElementById('leftBound').value);
    const b = parseFloat(document.getElementById('rightBound').value);
    const tolerance = parseFloat(document.getElementById('tolerance').value);
    const maxIterations = parseInt(document.getElementById('maxIterations').value);

    if (isNaN(a) || isNaN(b) || isNaN(tolerance) || isNaN(maxIterations)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (a >= b) {
        displayError('Left bound must be less than right bound');
        return;
    }

    if (functionType === 'custom' && !customFunction.trim()) {
        displayError('Please enter a custom function');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { functionType, customFunction, a, b, tolerance, maxIterations }
    });
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

    const convergedClass = result.converged ? 'success' : 'warning';
    const convergedText = result.converged ? 'Converged' : 'Max iterations reached';

    let html = `
        <div class="result-card">
            <h3>Bisection Method Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${result.functionString}</div>
                <div class="method-info">Finding root in [${result.initialBounds.a}, ${result.initialBounds.b}]</div>
            </div>

            <div class="root-result ${convergedClass}">
                <div class="root-label">Root Found</div>
                <div class="root-value">${formatNumber(result.root, 12)}</div>
                <div class="root-verification">f(root) = ${formatNumber(result.fRoot)}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item ${convergedClass}">
                    <span class="stat-label">Status</span>
                    <span class="stat-value">${convergedText}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Iterations</span>
                    <span class="stat-value">${result.iterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Theoretical</span>
                    <span class="stat-value">${result.theoreticalIterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tolerance</span>
                    <span class="stat-value">${result.tolerance.toExponential(0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Initial Interval</span>
                    <span class="stat-value">${formatNumber(result.initialInterval)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Final Interval</span>
                    <span class="stat-value">${formatNumber(result.finalInterval)}</span>
                </div>
            </div>

            <h4>Initial Values</h4>
            <div class="initial-values">
                <div class="value-box">
                    <span class="label">f(${result.initialBounds.a})</span>
                    <span class="value">${formatNumber(result.initialBounds.fa)}</span>
                </div>
                <div class="value-box">
                    <span class="label">f(${result.initialBounds.b})</span>
                    <span class="value">${formatNumber(result.initialBounds.fb)}</span>
                </div>
                <div class="value-box sign-check ${result.initialBounds.fa * result.initialBounds.fb < 0 ? 'valid' : 'invalid'}">
                    <span class="label">f(a)×f(b)</span>
                    <span class="value">${result.initialBounds.fa * result.initialBounds.fb < 0 ? '< 0 ✓' : '> 0 ✗'}</span>
                </div>
            </div>
    `;

    // Iteration history table
    if (result.iterationHistory && result.iterationHistory.length > 0) {
        html += `
            <h4>Iteration History</h4>
            <div class="table-container">
                <table class="iteration-table">
                    <tr>
                        <th>n</th>
                        <th>a</th>
                        <th>b</th>
                        <th>c (midpoint)</th>
                        <th>f(c)</th>
                        <th>Interval</th>
                    </tr>
        `;

        for (const iter of result.iterationHistory) {
            html += `
                <tr>
                    <td>${iter.iteration}</td>
                    <td>${formatNumber(iter.a)}</td>
                    <td>${formatNumber(iter.b)}</td>
                    <td>${formatNumber(iter.c)}</td>
                    <td>${formatNumber(iter.fc)}</td>
                    <td>${formatNumber(iter.interval)}</td>
                </tr>
            `;
        }

        if (result.iterations > 20) {
            html += `
                <tr class="more-rows">
                    <td colspan="6">... ${result.iterations - 20} more iterations ...</td>
                </tr>
            `;
        }

        html += `</table></div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 6) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-14) return '0';
    if (Math.abs(val) < 0.0001 || Math.abs(val) > 100000) {
        return val.toExponential(decimals > 6 ? 10 : 3);
    }
    return val.toFixed(decimals);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('polynomial');
});
