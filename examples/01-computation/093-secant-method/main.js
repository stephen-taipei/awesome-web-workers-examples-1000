/**
 * Main script for Secant Method
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

    // Update default initial guesses
    const defaults = {
        'polynomial': { x0: 1, x1: 2 },
        'trig': { x0: 0, x1: 1 },
        'exp': { x0: 0, x1: 1 },
        'sqrt': { x0: 1, x1: 2 },
        'log': { x0: 2, x1: 3 }
    };

    if (defaults[select.value]) {
        document.getElementById('x0').value = defaults[select.value].x0;
        document.getElementById('x1').value = defaults[select.value].x1;
    }
}

function loadSample(type) {
    if (type === 'close') {
        // Example with very close initial guesses
        document.getElementById('functionSelect').value = 'polynomial';
        document.getElementById('x0').value = 1.5;
        document.getElementById('x1').value = 1.51;
        return;
    }

    document.getElementById('functionSelect').value = type;
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const x0 = parseFloat(document.getElementById('x0').value);
    const x1 = parseFloat(document.getElementById('x1').value);
    const tolerance = parseFloat(document.getElementById('tolerance').value);
    const maxIterations = parseInt(document.getElementById('maxIterations').value);

    if (isNaN(x0) || isNaN(x1) || isNaN(tolerance) || isNaN(maxIterations)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (x0 === x1) {
        displayError('Initial guesses x₀ and x₁ must be different');
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
        data: { functionType, customFunction, x0, x1, tolerance, maxIterations }
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
            <h3>Secant Method Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${result.functionString}</div>
                <div class="method-info">Derivative-free method</div>
            </div>

            <div class="formula-display">
                <span>x_{n+1} = x_n - f(x_n) * (x_n - x_{n-1}) / (f(x_n) - f(x_{n-1}))</span>
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
                    <span class="stat-label">x₀</span>
                    <span class="stat-value">${result.initialGuesses.x0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">x₁</span>
                    <span class="stat-value">${result.initialGuesses.x1}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tolerance</span>
                    <span class="stat-value">${result.tolerance.toExponential(0)}</span>
                </div>
    `;

    if (result.avgConvergenceOrder !== null) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Observed Order</span>
                    <span class="stat-value">≈ ${result.avgConvergenceOrder.toFixed(3)}</span>
                </div>
        `;
    }

    html += `
                <div class="stat-item">
                    <span class="stat-label">Theory Order</span>
                    <span class="stat-value">φ ≈ ${result.theoreticalOrder.toFixed(3)}</span>
                </div>
            </div>
    `;

    // Convergence info
    if (result.converged) {
        const orderMatch = result.avgConvergenceOrder !== null &&
                           Math.abs(result.avgConvergenceOrder - result.theoreticalOrder) < 0.3;
        html += `
            <div class="convergence-info success">
                <strong>Superlinear Convergence!</strong>
                ${result.iterations} iterations used.
                ${orderMatch ? 'Observed order matches theoretical φ ≈ 1.618 (Golden ratio).' : ''}
            </div>
        `;
    } else if (result.diverged) {
        html += `
            <div class="convergence-info error">
                <strong>Divergence detected.</strong>
                Try different initial guesses. Ensure x₀ and x₁ are not too far apart.
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
                        <th>|xₙ - xₙ₋₁|</th>
                        <th>Order</th>
                    </tr>
        `;

        for (const iter of result.iterationHistory) {
            const orderStr = iter.convergenceOrder !== null && isFinite(iter.convergenceOrder) ?
                iter.convergenceOrder.toFixed(3) : '-';
            const noteClass = iter.note ? 'note-cell' : '';

            html += `
                <tr class="${noteClass}">
                    <td>${iter.iteration}</td>
                    <td>${formatNumber(iter.x)}</td>
                    <td>${formatNumber(iter.fx)}</td>
                    <td>${iter.error !== null ? formatNumber(iter.error) : '-'}</td>
                    <td>${orderStr}</td>
                </tr>
            `;

            if (iter.note) {
                html += `
                    <tr class="note-row">
                        <td colspan="5">${iter.note}</td>
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
