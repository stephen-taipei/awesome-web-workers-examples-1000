/**
 * Main script for Simpson's Integration
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

    const defaults = {
        'polynomial': { a: 0, b: 1 },
        'sin': { a: 0, b: Math.PI },
        'exp': { a: 0, b: 1 },
        'gaussian': { a: 0, b: 2 },
        'log': { a: 1, b: Math.E },
        'rational': { a: 0, b: 1 }
    };

    if (defaults[select.value]) {
        document.getElementById('a').value = defaults[select.value].a;
        document.getElementById('b').value = defaults[select.value].b;
    }
}

function loadSample(type) {
    if (type === 'compare') {
        document.getElementById('functionSelect').value = 'polynomial';
        document.getElementById('a').value = 0;
        document.getElementById('b').value = 1;
        document.getElementById('n').value = 100;
        document.getElementById('method').value = 'both';
        return;
    }
    document.getElementById('functionSelect').value = type;
    document.getElementById('method').value = '1/3';
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    let n = parseInt(document.getElementById('n').value);
    const method = document.getElementById('method').value;

    if (isNaN(a) || isNaN(b) || isNaN(n)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (n < 2) {
        displayError('Number of subintervals must be at least 2');
        return;
    }

    if (a >= b) {
        displayError('Lower bound must be less than upper bound');
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
        data: { functionType, customFunction, a, b, n, method }
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
    const { simpson13, simpson38, trapezoidal, exact, convergence, functionString, integralString, a, b, method } = result;

    let html = `
        <div class="result-card">
            <h3>Simpson's Integration Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">∫ ${functionString} dx</div>
                <div class="method-info">from ${a} to ${b}</div>
            </div>

            <div class="integral-results">
    `;

    if (simpson13) {
        html += `
            <div class="integral-result simpson13">
                <div class="result-label">Simpson's 1/3 Rule</div>
                <div class="result-value">${formatNumber(simpson13.value, 12)}</div>
                <div class="result-detail">n = ${simpson13.n}, h = ${formatNumber(simpson13.h, 6)}</div>
            </div>
        `;
    }

    if (simpson38) {
        html += `
            <div class="integral-result simpson38">
                <div class="result-label">Simpson's 3/8 Rule</div>
                <div class="result-value">${formatNumber(simpson38.value, 12)}</div>
                <div class="result-detail">n = ${simpson38.n}, h = ${formatNumber(simpson38.h, 6)}</div>
            </div>
        `;
    }

    if (trapezoidal) {
        html += `
            <div class="integral-result trapezoidal">
                <div class="result-label">Trapezoidal Rule</div>
                <div class="result-value">${formatNumber(trapezoidal.value, 12)}</div>
                <div class="result-detail">n = ${trapezoidal.n}</div>
            </div>
        `;
    }

    if (exact !== null) {
        html += `
            <div class="integral-result exact">
                <div class="result-label">Exact Value</div>
                <div class="result-value">${formatNumber(exact, 12)}</div>
                <div class="result-detail">F(x) = ${integralString}</div>
            </div>
        `;
    }

    html += `</div>`;

    // Error comparison
    if (exact !== null) {
        html += `<h4>Error Analysis</h4><div class="stat-grid">`;

        if (simpson13) {
            const error = Math.abs(simpson13.value - exact);
            html += `
                <div class="stat-item simpson13-stat">
                    <span class="stat-label">Simpson 1/3 Error</span>
                    <span class="stat-value">${error.toExponential(3)}</span>
                </div>
            `;
        }

        if (simpson38) {
            const error = Math.abs(simpson38.value - exact);
            html += `
                <div class="stat-item simpson38-stat">
                    <span class="stat-label">Simpson 3/8 Error</span>
                    <span class="stat-value">${error.toExponential(3)}</span>
                </div>
            `;
        }

        if (trapezoidal) {
            const error = Math.abs(trapezoidal.value - exact);
            html += `
                <div class="stat-item trap-stat">
                    <span class="stat-label">Trapezoidal Error</span>
                    <span class="stat-value">${error.toExponential(3)}</span>
                </div>
            `;
        }

        // Error ratio if we have both
        if (simpson13 && trapezoidal) {
            const s13Error = Math.abs(simpson13.value - exact);
            const trapError = Math.abs(trapezoidal.value - exact);
            const ratio = trapError / s13Error;
            html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Trap/Simpson Ratio</span>
                    <span class="stat-value">${ratio.toFixed(1)}×</span>
                </div>
            `;
        }

        html += `</div>`;
    }

    // Convergence table
    if (convergence && convergence.length > 0) {
        html += `
            <h4>Convergence Comparison</h4>
            <div class="table-container">
                <table class="iteration-table">
                    <tr>
                        <th>n</th>
                        <th>Simpson's 1/3</th>
                        <th>Trapezoidal</th>
                        <th>Difference</th>
                    </tr>
        `;

        for (const row of convergence) {
            html += `
                <tr>
                    <td>${row.n}</td>
                    <td>${formatNumber(row.simpson13, 10)}</td>
                    <td>${formatNumber(row.trapezoidal, 10)}</td>
                    <td>${row.diff.toExponential(2)}</td>
                </tr>
            `;
        }

        html += `
                </table>
            </div>
            <div class="convergence-note">
                Simpson's method converges faster (O(h⁴)) compared to Trapezoidal (O(h²))
            </div>
        `;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-14) return '0';
    if (Math.abs(val) < 0.0001 || Math.abs(val) > 100000) {
        return val.toExponential(Math.min(decimals, 6));
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
