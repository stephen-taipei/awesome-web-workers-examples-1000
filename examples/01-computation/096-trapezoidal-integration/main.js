/**
 * Main script for Trapezoidal Integration
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
        'gaussian': { a: 0, b: 1 },
        'sqrt': { a: 0, b: 1 },
        'rational': { a: 0, b: 1 }
    };

    if (defaults[select.value]) {
        document.getElementById('a').value = defaults[select.value].a;
        document.getElementById('b').value = defaults[select.value].b;
    }
}

function loadSample(type) {
    if (type === 'pi') {
        document.getElementById('functionSelect').value = 'rational';
        document.getElementById('a').value = 0;
        document.getElementById('b').value = 1;
        document.getElementById('n').value = 1000;
        document.getElementById('compareN').value = 10000;
        return;
    }
    document.getElementById('functionSelect').value = type;
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    const n = parseInt(document.getElementById('n').value);
    const compareN = parseInt(document.getElementById('compareN').value);

    if (isNaN(a) || isNaN(b) || isNaN(n) || isNaN(compareN)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (n < 1 || compareN < 1) {
        displayError('Number of subintervals must be at least 1');
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
        data: { functionType, customFunction, a, b, n, compareN }
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
    const { primary, comparison, exact, convergence, functionString, integralString, a, b, n, compareN } = result;

    let html = `
        <div class="result-card">
            <h3>Trapezoidal Integration Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">∫ ${functionString} dx</div>
                <div class="method-info">from ${a} to ${b}</div>
            </div>

            <div class="integral-results">
                <div class="integral-result primary">
                    <div class="result-label">n = ${n}</div>
                    <div class="result-value">${formatNumber(primary.value, 12)}</div>
                    <div class="result-detail">h = ${formatNumber(primary.h, 6)}</div>
                </div>
                <div class="integral-result secondary">
                    <div class="result-label">n = ${compareN}</div>
                    <div class="result-value">${formatNumber(comparison.value, 12)}</div>
                    <div class="result-detail">h = ${formatNumber(comparison.h, 6)}</div>
                </div>
    `;

    if (exact !== null) {
        const error1 = Math.abs(primary.value - exact);
        const error2 = Math.abs(comparison.value - exact);

        html += `
                <div class="integral-result exact">
                    <div class="result-label">Exact Value</div>
                    <div class="result-value">${formatNumber(exact, 12)}</div>
                    <div class="result-detail">F(x) = ${integralString}</div>
                </div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Error (n=${n})</span>
                    <span class="stat-value">${error1.toExponential(3)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Error (n=${compareN})</span>
                    <span class="stat-value">${error2.toExponential(3)}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Error Ratio</span>
                    <span class="stat-value">${(error1/error2).toFixed(2)}×</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">n Ratio</span>
                    <span class="stat-value">${(compareN/n).toFixed(1)}×</span>
                </div>
            </div>
        `;
    } else {
        html += `</div>`;

        // No exact value, show Richardson extrapolation
        const richardson = (4 * comparison.value - primary.value) / 3;
        html += `
            <div class="richardson-box">
                <strong>Richardson Extrapolation Estimate:</strong>
                <div class="richardson-value">${formatNumber(richardson, 12)}</div>
                <small>Based on O(h²) error, this provides a more accurate estimate</small>
            </div>
        `;
    }

    // Convergence table
    if (convergence && convergence.length > 0) {
        html += `
            <h4>Convergence Analysis</h4>
            <div class="table-container">
                <table class="iteration-table">
                    <tr>
                        <th>n</th>
                        <th>h</th>
                        <th>Integral</th>
                        <th>Error Ratio</th>
                    </tr>
        `;

        for (const row of convergence) {
            const ratioStr = row.errorRatio ? row.errorRatio.toFixed(2) : '-';
            const ratioClass = row.errorRatio && Math.abs(row.errorRatio - 4) < 0.5 ? 'good-ratio' : '';

            html += `
                <tr>
                    <td>${row.n.toLocaleString()}</td>
                    <td>${row.h.toExponential(3)}</td>
                    <td>${formatNumber(row.value, 10)}</td>
                    <td class="${ratioClass}">${ratioStr}</td>
                </tr>
            `;
        }

        html += `
                </table>
            </div>
            <div class="convergence-note">
                Error Ratio ≈ 4 confirms O(h²) convergence (doubling n reduces error by ~4×)
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
