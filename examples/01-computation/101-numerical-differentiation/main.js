/**
 * Main script for Numerical Differentiation
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
        'sin': { x: Math.PI / 4 },
        'exp': { x: 1 },
        'polynomial': { x: 2 },
        'log': { x: Math.E },
        'sqrt': { x: 4 },
        'trig': { x: Math.PI / 6 }
    };

    if (defaults[select.value]) {
        document.getElementById('x').value = defaults[select.value].x;
    }
}

function loadSample(type) {
    if (type === 'convergence') {
        document.getElementById('functionSelect').value = 'sin';
        document.getElementById('x').value = 1;
        document.getElementById('h').value = 0.01;
        document.getElementById('method').value = 'all';
        return;
    }
    document.getElementById('functionSelect').value = type;
    document.getElementById('method').value = 'all';
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const x = parseFloat(document.getElementById('x').value);
    const h = parseFloat(document.getElementById('h').value);
    const method = document.getElementById('method').value;

    if (isNaN(x) || isNaN(h)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (h <= 0) {
        displayError('Step size h must be positive');
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
        data: { functionType, customFunction, x, h, method }
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
    const { results, exact, convergence, functionString, derivativeString, x, h, method } = result;

    let html = `
        <div class="result-card">
            <h3>Numerical Differentiation Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${functionString}</div>
                <div class="method-info">f'(x) = ${derivativeString}</div>
            </div>

            <div class="point-info">
                <span>Point: x = ${formatNumber(x, 6)}</span>
                <span>Step size: h = ${h}</span>
            </div>
    `;

    // Show exact value if available
    if (exact !== null) {
        html += `
            <div class="exact-result">
                <div class="exact-label">Exact f'(${formatNumber(x, 4)}) =</div>
                <div class="exact-value">${formatNumber(exact, 14)}</div>
            </div>
        `;
    }

    // Show approximations
    html += `<h4>Approximations</h4><div class="approx-grid">`;

    const methodNames = {
        forward: { name: 'Forward Difference', color: '#e74c3c' },
        backward: { name: 'Backward Difference', color: '#3498db' },
        central: { name: 'Central Difference', color: '#27ae60' },
        fivePoint: { name: 'Five-Point Formula', color: '#9b59b6' }
    };

    for (const [key, res] of Object.entries(results)) {
        const info = methodNames[key];
        const error = exact !== null ? Math.abs(res.value - exact) : null;

        html += `
            <div class="approx-card" style="border-top: 4px solid ${info.color}">
                <div class="approx-name">${info.name}</div>
                <div class="approx-value">${formatNumber(res.value, 12)}</div>
                <div class="approx-formula">${res.formula}</div>
                <div class="approx-meta">
                    <span class="approx-order">${res.order}</span>
                    <span class="approx-evals">${res.evaluations} evals</span>
                </div>
                ${error !== null ? `<div class="approx-error">Error: ${error.toExponential(3)}</div>` : ''}
            </div>
        `;
    }

    html += `</div>`;

    // Error comparison
    if (exact !== null && Object.keys(results).length > 1) {
        html += `<h4>Error Comparison</h4><div class="error-bars">`;

        for (const [key, res] of Object.entries(results)) {
            const info = methodNames[key];
            const error = Math.abs(res.value - exact);
            const logError = error > 0 ? -Math.log10(error) : 16;
            const barWidth = Math.min(logError / 16 * 100, 100);

            html += `
                <div class="error-bar-row">
                    <div class="error-bar-label">${info.name}</div>
                    <div class="error-bar-container">
                        <div class="error-bar-fill" style="width: ${barWidth}%; background: ${info.color}"></div>
                    </div>
                    <div class="error-bar-value">${error.toExponential(2)}</div>
                </div>
            `;
        }

        html += `</div>`;
    }

    // Convergence table
    if (convergence && convergence.length > 0) {
        html += `
            <h4>Convergence Analysis (as h → 0)</h4>
            <div class="table-container">
                <table class="convergence-table">
                    <tr>
                        <th>h</th>
                        <th>Forward Error</th>
                        <th>Rate</th>
                        <th>Central Error</th>
                        <th>Rate</th>
                        <th>5-Point Error</th>
                        <th>Rate</th>
                    </tr>
        `;

        for (const row of convergence) {
            const fwdRate = row.forwardRate !== undefined ? row.forwardRate.toFixed(2) : '-';
            const cenRate = row.centralRate !== undefined ? row.centralRate.toFixed(2) : '-';
            const fpRate = row.fivePointRate !== undefined ? row.fivePointRate.toFixed(2) : '-';

            html += `
                <tr>
                    <td>${row.h.toExponential(1)}</td>
                    <td>${row.forwardError.toExponential(2)}</td>
                    <td class="rate ${isGoodRate(fwdRate, 1) ? 'good' : ''}">${fwdRate}</td>
                    <td>${row.centralError.toExponential(2)}</td>
                    <td class="rate ${isGoodRate(cenRate, 2) ? 'good' : ''}">${cenRate}</td>
                    <td>${row.fivePointError.toExponential(2)}</td>
                    <td class="rate ${isGoodRate(fpRate, 4) ? 'good' : ''}">${fpRate}</td>
                </tr>
            `;
        }

        html += `
                </table>
            </div>
            <div class="convergence-note">
                Rate ≈ 1 for O(h), ≈ 2 for O(h²), ≈ 4 for O(h⁴).
                Note: Very small h leads to round-off error domination.
            </div>
        `;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function isGoodRate(rate, expected) {
    if (rate === '-') return false;
    const val = parseFloat(rate);
    return Math.abs(val - expected) < 0.5;
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
    loadSample('sin');
});
