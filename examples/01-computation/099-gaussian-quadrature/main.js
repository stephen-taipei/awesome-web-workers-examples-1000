/**
 * Main script for Gaussian Quadrature
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
        'polynomial': { a: -1, b: 1 },
        'sin': { a: 0, b: Math.PI },
        'exp': { a: 0, b: 1 },
        'gaussian': { a: -2, b: 2 },
        'sqrt': { a: -1, b: 1 },
        'rational': { a: 0, b: 1 },
        'oscillatory': { a: 0, b: Math.PI }
    };

    if (defaults[select.value]) {
        document.getElementById('a').value = defaults[select.value].a;
        document.getElementById('b').value = defaults[select.value].b;
    }
}

function loadSample(type) {
    document.getElementById('functionSelect').value = type;
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    const n = parseInt(document.getElementById('n').value);
    const compareWith = parseInt(document.getElementById('compareWith').value);

    if (isNaN(a) || isNaN(b) || isNaN(n) || isNaN(compareWith)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (n < 2 || n > 64 || compareWith < 2 || compareWith > 64) {
        displayError('Number of points must be between 2 and 64');
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
        data: { functionType, customFunction, a, b, n, compareWith }
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
    const { primary, comparison, exact, convergence, functionString, integralString, a, b, n, compareWith } = result;

    let html = `
        <div class="result-card">
            <h3>Gaussian Quadrature Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">∫ ${functionString} dx</div>
                <div class="method-info">from ${a} to ${b}</div>
            </div>

            <div class="integral-results">
                <div class="integral-result primary">
                    <div class="result-label">Gauss-Legendre (n=${n})</div>
                    <div class="result-value">${formatNumber(primary.value, 14)}</div>
                    <div class="result-detail">${n} function evaluations</div>
                </div>
                <div class="integral-result secondary">
                    <div class="result-label">Gauss-Legendre (n=${compareWith})</div>
                    <div class="result-value">${formatNumber(comparison.value, 14)}</div>
                    <div class="result-detail">${compareWith} function evaluations</div>
                </div>
    `;

    if (exact !== null) {
        html += `
                <div class="integral-result exact">
                    <div class="result-label">Exact Value</div>
                    <div class="result-value">${formatNumber(exact, 14)}</div>
                    <div class="result-detail">F(x) = ${integralString}</div>
                </div>
        `;
    }

    html += `</div>`;

    // Error analysis
    if (exact !== null) {
        const error1 = Math.abs(primary.value - exact);
        const error2 = Math.abs(comparison.value - exact);

        html += `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Error (n=${n})</span>
                    <span class="stat-value">${error1.toExponential(3)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Error (n=${compareWith})</span>
                    <span class="stat-value">${error2.toExponential(3)}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Exact for poly deg ≤</span>
                    <span class="stat-value">${2 * n - 1}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Error Improvement</span>
                    <span class="stat-value">${(error1 / error2).toFixed(1)}×</span>
                </div>
            </div>
        `;
    }

    // Nodes and weights table
    if (primary.evaluations && primary.evaluations.length > 0) {
        html += `
            <h4>Quadrature Points (n=${n})</h4>
            <div class="table-container">
                <table class="nodes-table">
                    <tr>
                        <th>i</th>
                        <th>Node (ξᵢ)</th>
                        <th>x (transformed)</th>
                        <th>f(x)</th>
                        <th>Weight (wᵢ)</th>
                        <th>wᵢ·f(xᵢ)</th>
                    </tr>
        `;

        for (const ev of primary.evaluations) {
            html += `
                <tr>
                    <td>${ev.i}</td>
                    <td>${formatNumber(ev.node, 8)}</td>
                    <td>${formatNumber(ev.x, 8)}</td>
                    <td>${formatNumber(ev.fx, 8)}</td>
                    <td>${formatNumber(ev.weight, 8)}</td>
                    <td>${formatNumber(ev.contribution, 8)}</td>
                </tr>
            `;
        }

        html += `</table></div>`;
    }

    // Convergence table
    if (convergence && convergence.length > 0) {
        html += `
            <h4>Convergence with Increasing n</h4>
            <div class="table-container">
                <table class="convergence-table">
                    <tr>
                        <th>n</th>
                        <th>Exact for deg ≤</th>
                        <th>Integral Value</th>
                        <th>Change from prev</th>
                    </tr>
        `;

        for (const row of convergence) {
            const diffStr = row.diff !== undefined ? row.diff.toExponential(3) : '-';
            html += `
                <tr>
                    <td>${row.n}</td>
                    <td>${2 * row.n - 1}</td>
                    <td>${formatNumber(row.value, 12)}</td>
                    <td>${diffStr}</td>
                </tr>
            `;
        }

        html += `
                </table>
            </div>
            <div class="convergence-note">
                Gaussian quadrature with n points exactly integrates polynomials of degree ≤ 2n-1
            </div>
        `;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-16) return '0';
    if (Math.abs(val) < 0.00001 || Math.abs(val) > 100000) {
        return val.toExponential(Math.min(decimals, 8));
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
