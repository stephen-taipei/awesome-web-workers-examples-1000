/**
 * Main script for Brent's Method
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
        'sqrt': { a: 1, b: 2 },
        'log': { a: 2, b: 3 },
        'difficult': { a: 0, b: 2 }
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
    const tolerance = parseFloat(document.getElementById('tolerance').value);
    const maxIterations = parseInt(document.getElementById('maxIterations').value);

    if (isNaN(a) || isNaN(b) || isNaN(tolerance) || isNaN(maxIterations)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (a === b) {
        displayError('Bounds a and b must be different');
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

    let statusClass = result.converged ? 'success' : 'warning';
    let statusText = result.converged ? 'Converged' : 'Max iterations';

    const stats = result.methodStats;
    const total = stats.total || 1;

    let html = `
        <div class="result-card">
            <h3>Brent's Method Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${result.functionString}</div>
                <div class="method-info">Hybrid: Bisection + Secant + IQI</div>
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
                    <span class="stat-label">Initial [a,b]</span>
                    <span class="stat-value">[${result.bracket.a}, ${result.bracket.b}]</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tolerance</span>
                    <span class="stat-value">${result.tolerance.toExponential(0)}</span>
                </div>
            </div>

            <h4>Method Usage Statistics</h4>
            <div class="method-stats">
                <div class="method-stat bisection">
                    <div class="method-stat-label">Bisection</div>
                    <div class="method-stat-bar">
                        <div class="method-stat-fill" style="width: ${(stats.bisection / total * 100).toFixed(1)}%"></div>
                    </div>
                    <div class="method-stat-value">${stats.bisection} (${(stats.bisection / total * 100).toFixed(0)}%)</div>
                </div>
                <div class="method-stat secant">
                    <div class="method-stat-label">Secant</div>
                    <div class="method-stat-bar">
                        <div class="method-stat-fill" style="width: ${(stats.secant / total * 100).toFixed(1)}%"></div>
                    </div>
                    <div class="method-stat-value">${stats.secant} (${(stats.secant / total * 100).toFixed(0)}%)</div>
                </div>
                <div class="method-stat iqi">
                    <div class="method-stat-label">IQI</div>
                    <div class="method-stat-bar">
                        <div class="method-stat-fill" style="width: ${(stats.iqi / total * 100).toFixed(1)}%"></div>
                    </div>
                    <div class="method-stat-value">${stats.iqi} (${(stats.iqi / total * 100).toFixed(0)}%)</div>
                </div>
            </div>
    `;

    // Efficiency indicator
    const efficiency = result.efficiency * 100;
    let efficiencyClass = efficiency > 70 ? 'success' : (efficiency > 40 ? 'warning' : 'info');
    html += `
        <div class="efficiency-info ${efficiencyClass}">
            <strong>Interpolation Efficiency: ${efficiency.toFixed(0)}%</strong>
            <p>${getEfficiencyMessage(efficiency)}</p>
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
                        <th>Method</th>
                        <th>Root Est.</th>
                        <th>f(x)</th>
                        <th>Error</th>
                    </tr>
        `;

        for (const iter of result.iterationHistory) {
            const methodClass = iter.method.toLowerCase().includes('bisection') ? 'method-bisection' :
                               (iter.method === 'Secant' ? 'method-secant' :
                               (iter.method === 'IQI' ? 'method-iqi' : ''));

            html += `
                <tr>
                    <td>${iter.iteration}</td>
                    <td class="${methodClass}">${iter.method}</td>
                    <td>${formatNumber(iter.root)}</td>
                    <td>${formatNumber(iter.fb)}</td>
                    <td>${iter.error !== null ? formatNumber(iter.error) : '-'}</td>
                </tr>
            `;
        }

        html += `</table></div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function getEfficiencyMessage(efficiency) {
    if (efficiency > 80) {
        return 'Excellent! The function is well-behaved and interpolation methods dominated.';
    } else if (efficiency > 60) {
        return 'Good performance with a healthy mix of interpolation and bisection.';
    } else if (efficiency > 40) {
        return 'Moderate performance. Some challenging regions required bisection fallback.';
    } else if (efficiency > 20) {
        return 'The function required significant bisection steps due to difficult behavior.';
    } else {
        return 'This function is challenging - bisection provided the needed robustness.';
    }
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
