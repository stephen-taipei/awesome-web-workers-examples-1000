/**
 * Main script for Romberg Integration
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
        'oscillatory': { a: 0, b: Math.PI },
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
        document.getElementById('maxLevel').value = 10;
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
    const maxLevel = parseInt(document.getElementById('maxLevel').value);
    const tolerance = parseFloat(document.getElementById('tolerance').value);

    if (isNaN(a) || isNaN(b) || isNaN(maxLevel) || isNaN(tolerance)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (maxLevel < 2 || maxLevel > 20) {
        displayError('Maximum level must be between 2 and 20');
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
        data: { functionType, customFunction, a, b, maxLevel, tolerance }
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
    const { value, exact, finalLevel, converged, tolerance, functionEvaluations,
            table, trapezoidalValue, simpsonValue, functionString, integralString, a, b } = result;

    let html = `
        <div class="result-card">
            <h3>Romberg Integration Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">∫ ${functionString} dx</div>
                <div class="method-info">from ${a} to ${b}</div>
            </div>

            <div class="main-result ${converged ? 'converged' : 'not-converged'}">
                <div class="result-label">Romberg Result R(${finalLevel},${finalLevel})</div>
                <div class="result-value">${formatNumber(value, 14)}</div>
                <div class="result-status">${converged ? '✓ Converged' : '⚠ Max level reached'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item ${converged ? 'success' : 'warning'}">
                    <span class="stat-label">Status</span>
                    <span class="stat-value">${converged ? 'Converged' : 'Max Level'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Final Level</span>
                    <span class="stat-value">${finalLevel}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Subintervals</span>
                    <span class="stat-value">2^${finalLevel} = ${Math.pow(2, finalLevel)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">f(x) Evaluations</span>
                    <span class="stat-value">${functionEvaluations}</span>
                </div>
    `;

    if (exact !== null) {
        const error = Math.abs(value - exact);
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Actual Error</span>
                    <span class="stat-value">${error.toExponential(3)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tolerance</span>
                    <span class="stat-value">${tolerance.toExponential(0)}</span>
                </div>
            </div>

            <div class="comparison-box">
                <h4>Comparison with Exact Value</h4>
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <span class="comp-label">Romberg</span>
                        <span class="comp-value">${formatNumber(value, 12)}</span>
                    </div>
                    <div class="comparison-item exact">
                        <span class="comp-label">Exact</span>
                        <span class="comp-value">${formatNumber(exact, 12)}</span>
                    </div>
                    <div class="comparison-item">
                        <span class="comp-label">Trapezoidal</span>
                        <span class="comp-value">${formatNumber(trapezoidalValue, 12)}</span>
                        <span class="comp-error">Error: ${Math.abs(trapezoidalValue - exact).toExponential(3)}</span>
                    </div>
        `;

        if (simpsonValue !== null) {
            html += `
                    <div class="comparison-item">
                        <span class="comp-label">Simpson-like</span>
                        <span class="comp-value">${formatNumber(simpsonValue, 12)}</span>
                        <span class="comp-error">Error: ${Math.abs(simpsonValue - exact).toExponential(3)}</span>
                    </div>
            `;
        }

        html += `</div></div>`;
    } else {
        html += `</div>`;
    }

    // Romberg table
    if (table && table.length > 0) {
        html += `
            <h4>Romberg Table</h4>
            <div class="table-container">
                <table class="romberg-table">
                    <tr>
                        <th>k</th>
                        <th>n</th>
                        <th>R(k,0)<br><small>O(h²)</small></th>
        `;

        const maxCols = Math.min(finalLevel + 1, 6);
        for (let j = 1; j < maxCols; j++) {
            html += `<th>R(k,${j})<br><small>O(h^${2*(j+1)})</small></th>`;
        }
        html += `</tr>`;

        for (const row of table) {
            html += `<tr>
                <td>${row.level}</td>
                <td>${row.n}</td>
            `;

            for (let j = 0; j < maxCols; j++) {
                if (j < row.values.length) {
                    const isLast = (row.level === finalLevel && j === row.values.length - 1);
                    const cellClass = isLast ? 'best-value' : '';
                    html += `<td class="${cellClass}">${formatNumber(row.values[j], 10)}</td>`;
                } else {
                    html += `<td class="empty"></td>`;
                }
            }

            html += `</tr>`;
        }

        html += `
                </table>
            </div>
            <div class="table-note">
                Each column represents a higher order of accuracy through Richardson extrapolation.
                The diagonal (highlighted) gives the best estimates at each level.
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
