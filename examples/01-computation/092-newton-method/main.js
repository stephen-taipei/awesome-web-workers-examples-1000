/**
 * Main script for Newton's Method
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

    // Update default initial guess
    const defaults = {
        'polynomial': 1.5,
        'trig': 0.5,
        'exp': 0.5,
        'sqrt': 1,
        'log': 2
    };

    if (defaults[select.value]) {
        document.getElementById('initialGuess').value = defaults[select.value];
    }
}

function loadSample(type) {
    if (type === 'diverge') {
        // Example that can diverge: x^(1/3) at x=0
        document.getElementById('functionSelect').value = 'polynomial';
        document.getElementById('initialGuess').value = 0.1;
        document.getElementById('maxIterations').value = 20;
        return;
    }

    document.getElementById('functionSelect').value = type;
    updateFunction();

    const samples = {
        'polynomial': { x0: 1.5 },
        'sqrt': { x0: 1 },
        'trig': { x0: 0.5 }
    };

    if (samples[type]) {
        document.getElementById('initialGuess').value = samples[type].x0;
    }
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const customDerivative = document.getElementById('customDerivative').value;
    const x0 = parseFloat(document.getElementById('initialGuess').value);
    const tolerance = parseFloat(document.getElementById('tolerance').value);
    const maxIterations = parseInt(document.getElementById('maxIterations').value);
    const derivativeMethod = document.getElementById('derivativeMethod').value;

    if (isNaN(x0) || isNaN(tolerance) || isNaN(maxIterations)) {
        displayError('Please enter valid numeric values');
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
        data: { functionType, customFunction, customDerivative, x0, tolerance, maxIterations, derivativeMethod }
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

    let statusClass, statusText;
    if (result.converged) {
        statusClass = 'success';
        statusText = 'Converged';
    } else if (result.diverged) {
        statusClass = 'error';
        statusText = 'Diverged';
    } else {
        statusClass = 'warning';
        statusText = 'Max iterations';
    }

    let html = `
        <div class="result-card">
            <h3>Newton's Method Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${result.functionString}</div>
                <div class="method-info">f'(x) = ${result.derivativeString}</div>
            </div>

            <div class="formula-display">
                <span>x_{n+1} = x_n - f(x_n) / f'(x_n)</span>
            </div>

            <div class="root-result ${statusClass}">
                <div class="root-label">Root Found</div>
                <div class="root-value">${formatNumber(result.root, 14)}</div>
                <div class="root-verification">f(root) = ${formatNumber(result.fRoot)}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item ${statusClass}">
                    <span class="stat-label">Status</span>
                    <span class="stat-value">${statusText}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Iterations</span>
                    <span class="stat-value">${result.iterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Initial x₀</span>
                    <span class="stat-value">${result.initialGuess}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tolerance</span>
                    <span class="stat-value">${result.tolerance.toExponential(0)}</span>
                </div>
    `;

    if (result.avgConvergenceOrder !== null) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Convergence Order</span>
                    <span class="stat-value">≈ ${result.avgConvergenceOrder.toFixed(2)}</span>
                </div>
        `;
    }

    html += `
                <div class="stat-item">
                    <span class="stat-label">Derivative</span>
                    <span class="stat-value">${result.derivativeMethod === 'exact' ? 'Exact' : 'Numerical'}</span>
                </div>
            </div>
    `;

    // Convergence indicator
    if (result.converged && result.iterations < 10) {
        html += `
            <div class="convergence-info success">
                <strong>Quadratic Convergence!</strong> Only ${result.iterations} iterations needed.
                Newton's method roughly doubles the digits of accuracy each step.
            </div>
        `;
    } else if (result.diverged) {
        html += `
            <div class="convergence-info error">
                <strong>Divergence detected.</strong> Try a different initial guess or check if f'(x) ≈ 0 near your starting point.
            </div>
        `;
    }

    // Iteration history table
    if (result.iterationHistory && result.iterationHistory.length > 0) {
        html += `
            <h4>Iteration History</h4>
            <div class="table-container">
                <table class="iteration-table">
                    <tr>
                        <th>n</th>
                        <th>xₙ</th>
                        <th>f(xₙ)</th>
                        <th>f'(xₙ)</th>
                        <th>|xₙ₊₁ - xₙ|</th>
                        <th>Order</th>
                    </tr>
        `;

        for (const iter of result.iterationHistory) {
            const orderStr = iter.convergenceOrder !== null && isFinite(iter.convergenceOrder) ?
                iter.convergenceOrder.toFixed(2) : '-';
            const noteClass = iter.note ? 'note-cell' : '';

            html += `
                <tr class="${noteClass}">
                    <td>${iter.iteration}</td>
                    <td>${formatNumber(iter.x)}</td>
                    <td>${formatNumber(iter.fx)}</td>
                    <td>${formatNumber(iter.dfx)}</td>
                    <td>${iter.error !== null ? formatNumber(iter.error) : '-'}</td>
                    <td>${orderStr}</td>
                </tr>
            `;

            if (iter.note) {
                html += `
                    <tr class="note-row">
                        <td colspan="6">⚠️ ${iter.note}</td>
                    </tr>
                `;
            }
        }

        html += `</table></div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-16) return '0';
    if (Math.abs(val) < 0.0001 || Math.abs(val) > 100000) {
        return val.toExponential(decimals > 8 ? 12 : 4);
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
