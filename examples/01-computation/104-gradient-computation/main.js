/**
 * Main script for Gradient Computation
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

    // Some functions are 2D only
    const dimSelect = document.getElementById('dimensions');
    if (['beale', 'booth'].includes(select.value)) {
        dimSelect.value = '2';
        dimSelect.disabled = true;
        updateDimensions();
    } else {
        dimSelect.disabled = false;
    }
}

function updateDimensions() {
    const n = parseInt(document.getElementById('dimensions').value);
    const container = document.getElementById('pointInputs');
    container.innerHTML = '';

    for (let i = 0; i < n; i++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'point-input';
        input.value = i < 2 ? '1' : '0';
        input.step = '0.1';
        input.placeholder = `x${i + 1}`;
        container.appendChild(input);
    }
}

function loadSample(type) {
    const samples = {
        'sphere': { func: 'sphere', dims: 2, point: [0.5, 0.5] },
        'rosenbrock': { func: 'rosenbrock', dims: 2, point: [1, 1] },
        'rastrigin': { func: 'rastrigin', dims: 2, point: [0.5, 0.5] },
        'high-dim': { func: 'sphere', dims: 5, point: [1, 1, 1, 1, 1] }
    };

    const sample = samples[type];
    document.getElementById('functionSelect').value = sample.func;
    document.getElementById('dimensions').value = sample.dims.toString();
    document.getElementById('dimensions').disabled = false;
    updateFunction();
    updateDimensions();

    const inputs = document.querySelectorAll('.point-input');
    sample.point.forEach((val, i) => {
        if (inputs[i]) inputs[i].value = val;
    });
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const h = parseFloat(document.getElementById('h').value);
    const method = document.getElementById('method').value;

    const inputs = document.querySelectorAll('.point-input');
    const point = Array.from(inputs).map(input => parseFloat(input.value));

    if (point.some(isNaN) || isNaN(h)) {
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
        data: { functionType, customFunction, point, h, method }
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
    const { fValue, gradient, exact, errors, magnitude, unitVector,
            steepestDescentValue, convergence, stepSuggestion,
            functionString, point, h, method } = result;

    const n = point.length;

    let html = `
        <div class="result-card">
            <h3>Gradient Computation Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${functionString}</div>
                <div class="method-info">${n}-dimensional, ${method} difference</div>
            </div>

            <div class="point-display">
                <span class="pd-label">Point x =</span>
                <span class="pd-value">(${point.map(p => formatNumber(p, 4)).join(', ')})</span>
            </div>

            <div class="function-value">
                <span class="fv-label">f(x) =</span>
                <span class="fv-value">${formatNumber(fValue, 10)}</span>
            </div>

            <h4>Gradient Vector ∇f(x)</h4>
            <div class="gradient-display">
                <div class="gradient-components">
    `;

    // Display gradient components
    for (let i = 0; i < n; i++) {
        const error = errors ? errors[i] : null;
        html += `
            <div class="grad-component">
                <div class="gc-label">∂f/∂x${subscript(i + 1)}</div>
                <div class="gc-value">${formatNumber(gradient[i], 10)}</div>
                ${exact ? `<div class="gc-exact">Exact: ${formatNumber(exact[i], 10)}</div>` : ''}
                ${error !== null ? `<div class="gc-error">Error: ${error.toExponential(3)}</div>` : ''}
            </div>
        `;
    }

    html += `
                </div>
                <div class="gradient-notation">
                    ∇f = (${gradient.map(g => formatNumber(g, 4)).join(', ')})
                </div>
            </div>
    `;

    // Gradient properties
    html += `
        <h4>Gradient Properties</h4>
        <div class="properties-grid">
            <div class="prop-card">
                <div class="prop-label">Magnitude |∇f|</div>
                <div class="prop-value">${formatNumber(magnitude, 10)}</div>
            </div>
            <div class="prop-card">
                <div class="prop-label">Steepest Descent Rate</div>
                <div class="prop-value">${formatNumber(steepestDescentValue, 10)}</div>
            </div>
        </div>
    `;

    // Unit vector
    html += `
        <h4>Unit Gradient Vector</h4>
        <div class="unit-vector">
            <span class="uv-notation">∇f / |∇f| = </span>
            <span class="uv-value">(${unitVector.map(u => formatNumber(u, 6)).join(', ')})</span>
        </div>
    `;

    // Gradient descent suggestion
    if (stepSuggestion) {
        html += `
            <h4>Gradient Descent Step Suggestion</h4>
            <div class="step-suggestion">
                <div class="ss-row">
                    <span class="ss-label">Suggested step size α:</span>
                    <span class="ss-value">${stepSuggestion.suggestedAlpha}</span>
                </div>
                <div class="ss-row">
                    <span class="ss-label">Expected f reduction:</span>
                    <span class="ss-value">${formatNumber(stepSuggestion.expectedReduction, 8)}</span>
                </div>
                <div class="ss-row">
                    <span class="ss-label">New point x - α∇f:</span>
                    <span class="ss-value">(${stepSuggestion.newPoint.map(p => formatNumber(p, 4)).join(', ')})</span>
                </div>
            </div>
        `;
    }

    // Convergence analysis
    if (convergence && convergence.length > 0) {
        html += `
            <h4>Convergence Analysis</h4>
            <div class="table-container">
                <table class="convergence-table">
                    <tr>
                        <th>Step h</th>
                        <th>Central Error</th>
                        <th>Forward Error</th>
                    </tr>
        `;

        for (const row of convergence) {
            html += `
                <tr>
                    <td>${row.h.toExponential(1)}</td>
                    <td class="good">${row.centralError.toExponential(2)}</td>
                    <td>${row.forwardError.toExponential(2)}</td>
                </tr>
            `;
        }

        html += `
                </table>
            </div>
            <div class="convergence-note">
                Central difference has O(h²) error; Forward has O(h) error
            </div>
        `;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function subscript(n) {
    const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(n).split('').map(d => subs[parseInt(d)]).join('');
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
    updateDimensions();
    loadSample('sphere');
});
