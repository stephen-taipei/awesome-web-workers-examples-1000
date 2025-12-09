/**
 * Main script for Higher-Order Derivatives
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
        'sin': { x: 0 },
        'exp': { x: 0 },
        'polynomial': { x: 1 },
        'log': { x: 1 },
        'trig': { x: 0 },
        'gaussian': { x: 0 }
    };

    if (defaults[select.value]) {
        document.getElementById('x').value = defaults[select.value].x;
    }
}

function loadSample(type) {
    const samples = {
        'sin': { func: 'sin', x: 0 },
        'exp': { func: 'exp', x: 0 },
        'polynomial': { func: 'polynomial', x: 1 },
        'gaussian': { func: 'gaussian', x: 0 }
    };

    const sample = samples[type];
    document.getElementById('functionSelect').value = sample.func;
    document.getElementById('x').value = sample.x;
    document.getElementById('method').value = 'all';
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const x = parseFloat(document.getElementById('x').value);
    const h = parseFloat(document.getElementById('h').value);
    const maxOrder = parseInt(document.getElementById('maxOrder').value);
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
        data: { functionType, customFunction, x, h, maxOrder, method }
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
    const { results, exact, convergence, functionString, x, h, maxOrder, method } = result;

    const orderSuffixes = {
        1: 'st', 2: 'nd', 3: 'rd', 4: 'th', 5: 'th', 6: 'th'
    };

    let html = `
        <div class="result-card">
            <h3>Higher-Order Derivatives Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${functionString}</div>
                <div class="method-info">Computing derivatives up to order ${maxOrder} at x = ${x}</div>
            </div>

            <div class="point-info">
                <span>Point: x = ${formatNumber(x, 6)}</span>
                <span>Base step: h = ${h}</span>
            </div>
    `;

    // Display derivatives for each order
    for (let order = 1; order <= maxOrder; order++) {
        const suffix = orderSuffixes[order] || 'th';
        html += `<h4>${order}${suffix} Derivative f${'\''.repeat(order)}(x)</h4>`;

        html += `<div class="derivative-grid">`;

        // Exact value if available
        if (exact[order] !== undefined) {
            html += `
                <div class="derivative-card exact">
                    <div class="derivative-label">Exact</div>
                    <div class="derivative-value">${formatNumber(exact[order], 12)}</div>
                </div>
            `;
        }

        // Central difference
        if (results.central && results.central[order]) {
            const cd = results.central[order];
            const error = exact[order] !== undefined ? Math.abs(cd.value - exact[order]) : null;
            html += `
                <div class="derivative-card central">
                    <div class="derivative-label">Central Diff</div>
                    <div class="derivative-value">${formatNumber(cd.value, 12)}</div>
                    <div class="derivative-meta">${cd.order} | ${cd.evaluations} evals</div>
                    ${error !== null ? `<div class="derivative-error">Error: ${error.toExponential(3)}</div>` : ''}
                </div>
            `;
        }

        // Richardson extrapolation
        if (results.richardson && results.richardson[order]) {
            const rich = results.richardson[order];
            const error = exact[order] !== undefined ? Math.abs(rich.value - exact[order]) : null;
            html += `
                <div class="derivative-card richardson">
                    <div class="derivative-label">Richardson</div>
                    <div class="derivative-value">${formatNumber(rich.value, 12)}</div>
                    <div class="derivative-meta">${rich.order}</div>
                    ${error !== null ? `<div class="derivative-error">Error: ${error.toExponential(3)}</div>` : ''}
                </div>
            `;
        }

        html += `</div>`;
    }

    // Richardson extrapolation table for first derivative
    if (results.richardson && results.richardson[1] && results.richardson[1].table) {
        html += `
            <h4>Richardson Extrapolation Table (1st Derivative)</h4>
            <div class="table-container">
                <table class="richardson-table">
                    <tr>
                        <th>h</th>
                        <th>D(h)</th>
                        <th>O(h⁴)</th>
                        <th>O(h⁶)</th>
                        <th>O(h⁸)</th>
                    </tr>
        `;

        for (const row of results.richardson[1].table) {
            html += `<tr><td>${row.h.toExponential(2)}</td>`;
            for (let j = 0; j < row.values.length; j++) {
                const isLast = (row === results.richardson[1].table[results.richardson[1].table.length - 1] &&
                               j === row.values.length - 1);
                html += `<td class="${isLast ? 'best-value' : ''}">${formatNumber(row.values[j], 10)}</td>`;
            }
            for (let j = row.values.length; j < 4; j++) {
                html += `<td>-</td>`;
            }
            html += `</tr>`;
        }

        html += `
                </table>
            </div>
        `;
    }

    // Error comparison
    if (Object.keys(exact).length > 0 && results.central && results.richardson) {
        html += `<h4>Error Comparison</h4><div class="error-comparison">`;

        for (let order = 1; order <= Math.min(maxOrder, 4); order++) {
            if (exact[order] !== undefined && results.central[order] && results.richardson[order]) {
                const centralErr = Math.abs(results.central[order].value - exact[order]);
                const richErr = Math.abs(results.richardson[order].value - exact[order]);
                const improvement = centralErr / richErr;

                html += `
                    <div class="error-row">
                        <div class="error-order">${order}${orderSuffixes[order]} deriv</div>
                        <div class="error-bars">
                            <div class="error-bar-item">
                                <span class="bar-label">Central:</span>
                                <span class="bar-value">${centralErr.toExponential(2)}</span>
                            </div>
                            <div class="error-bar-item">
                                <span class="bar-label">Richardson:</span>
                                <span class="bar-value good">${richErr.toExponential(2)}</span>
                            </div>
                            <div class="improvement">${improvement.toFixed(1)}x better</div>
                        </div>
                    </div>
                `;
            }
        }

        html += `</div>`;
    }

    // Convergence table
    if (convergence && convergence.length > 0) {
        html += `
            <h4>Convergence as h → 0 (1st Derivative)</h4>
            <div class="table-container">
                <table class="convergence-table">
                    <tr>
                        <th>h</th>
                        <th>Central Error</th>
                        <th>Richardson Error</th>
                    </tr>
        `;

        for (const row of convergence) {
            html += `
                <tr>
                    <td>${row.h.toExponential(2)}</td>
                    <td>${row.central_1 !== undefined ? row.central_1.toExponential(2) : '-'}</td>
                    <td class="good">${row.richardson_1 !== undefined ? row.richardson_1.toExponential(2) : '-'}</td>
                </tr>
            `;
        }

        html += `
                </table>
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
    loadSample('sin');
});
