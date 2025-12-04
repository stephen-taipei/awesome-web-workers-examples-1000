/**
 * Main script for Hessian Matrix
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
    const dimSelect = document.getElementById('dimensions');

    customInput.style.display = select.value === 'custom' ? 'block' : 'none';

    // Most test functions are 2D
    if (!['quadratic', 'custom'].includes(select.value)) {
        dimSelect.value = '2';
        dimSelect.disabled = true;
    } else {
        dimSelect.disabled = false;
    }
    updateDimensions();
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
        'quadratic': { func: 'quadratic', dims: 2, point: [0, 0] },
        'rosenbrock': { func: 'rosenbrock', dims: 2, point: [1, 1] },
        'himmelblau': { func: 'himmelblau', dims: 2, point: [3, 2] },
        'saddle': { func: 'matyas', dims: 2, point: [0, 0] }
    };

    const sample = samples[type];
    document.getElementById('functionSelect').value = sample.func;
    document.getElementById('dimensions').value = sample.dims.toString();
    updateFunction();

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
    const { fValue, gradient, hessian, exact, eigenAnalysis, determinant, trace,
            isSymmetric, classification, conditionNumber, functionString, point, h, method } = result;

    const n = point.length;

    let html = `
        <div class="result-card">
            <h3>Hessian Matrix Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x) = ${functionString}</div>
                <div class="method-info">${n}-dimensional, ${method} difference, h = ${h}</div>
            </div>

            <div class="point-display">
                <span class="pd-label">Point x =</span>
                <span class="pd-value">(${point.map(p => formatNumber(p, 4)).join(', ')})</span>
            </div>

            <div class="values-row">
                <div class="value-box">
                    <span class="vb-label">f(x)</span>
                    <span class="vb-value">${formatNumber(fValue, 8)}</span>
                </div>
                <div class="value-box">
                    <span class="vb-label">∇f(x)</span>
                    <span class="vb-value">(${gradient.map(g => formatNumber(g, 6)).join(', ')})</span>
                </div>
            </div>

            <h4>Hessian Matrix H(f)</h4>
            <div class="matrix-container">
                <div class="matrix-bracket left"></div>
                <div class="matrix-content">
    `;

    // Display Hessian matrix
    for (let i = 0; i < n; i++) {
        html += `<div class="matrix-row">`;
        for (let j = 0; j < n; j++) {
            html += `<span class="matrix-cell">${formatNumber(hessian[i][j], 6)}</span>`;
        }
        html += `</div>`;
    }

    html += `
                </div>
                <div class="matrix-bracket right"></div>
            </div>
    `;

    // Exact Hessian comparison if available
    if (exact) {
        html += `
            <h4>Exact Hessian (for comparison)</h4>
            <div class="matrix-container exact">
                <div class="matrix-bracket left"></div>
                <div class="matrix-content">
        `;
        for (let i = 0; i < n; i++) {
            html += `<div class="matrix-row">`;
            for (let j = 0; j < n; j++) {
                html += `<span class="matrix-cell">${formatNumber(exact[i][j], 6)}</span>`;
            }
            html += `</div>`;
        }
        html += `
                </div>
                <div class="matrix-bracket right"></div>
            </div>
        `;

        // Error analysis
        let maxError = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                maxError = Math.max(maxError, Math.abs(hessian[i][j] - exact[i][j]));
            }
        }
        html += `<div class="error-note">Maximum error: ${maxError.toExponential(3)}</div>`;
    }

    // Matrix properties
    html += `
        <h4>Matrix Properties</h4>
        <div class="properties-grid">
            <div class="prop-card">
                <div class="prop-label">Determinant</div>
                <div class="prop-value">${formatNumber(determinant, 8)}</div>
            </div>
            <div class="prop-card">
                <div class="prop-label">Trace</div>
                <div class="prop-value">${formatNumber(trace, 8)}</div>
            </div>
            <div class="prop-card">
                <div class="prop-label">Symmetric</div>
                <div class="prop-value ${isSymmetric ? 'yes' : 'no'}">${isSymmetric ? 'Yes' : 'No'}</div>
            </div>
            ${conditionNumber !== null && isFinite(conditionNumber) ? `
            <div class="prop-card">
                <div class="prop-label">Condition Number</div>
                <div class="prop-value">${formatNumber(conditionNumber, 4)}</div>
            </div>
            ` : ''}
        </div>
    `;

    // Eigenvalue analysis
    if (eigenAnalysis.eigenvalues.length > 0) {
        html += `
            <h4>Eigenvalue Analysis</h4>
            <div class="eigen-display">
                <div class="eigen-values">
        `;

        eigenAnalysis.eigenvalues.forEach((lambda, i) => {
            const sign = lambda > 0 ? 'positive' : (lambda < 0 ? 'negative' : 'zero');
            html += `
                <div class="eigen-item ${sign}">
                    <span class="eigen-label">λ${subscript(i + 1)}</span>
                    <span class="eigen-value">${formatNumber(lambda, 8)}</span>
                </div>
            `;
        });

        html += `</div>`;

        // Eigenvectors
        if (eigenAnalysis.eigenvectors.length > 0) {
            html += `<div class="eigen-vectors">`;
            eigenAnalysis.eigenvectors.forEach((v, i) => {
                html += `
                    <div class="evec-item">
                        <span class="evec-label">v${subscript(i + 1)}</span>
                        <span class="evec-value">(${v.map(x => formatNumber(x, 4)).join(', ')})</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        html += `</div>`;
    }

    // Critical point classification
    html += `
        <h4>Critical Point Classification</h4>
        <div class="classification ${classification.type}">
            <div class="class-type">${classification.type.replace('_', ' ').toUpperCase()}</div>
            <div class="class-desc">${classification.description}</div>
        </div>
    `;

    // Definiteness summary
    html += `
        <h4>Definiteness</h4>
        <div class="definiteness">
    `;

    if (eigenAnalysis.eigenvalues.length > 0) {
        const allPos = eigenAnalysis.eigenvalues.every(e => e > 0);
        const allNeg = eigenAnalysis.eigenvalues.every(e => e < 0);
        const allNonNeg = eigenAnalysis.eigenvalues.every(e => e >= 0);
        const allNonPos = eigenAnalysis.eigenvalues.every(e => e <= 0);

        if (allPos) {
            html += `<span class="def-badge positive">Positive Definite</span>`;
        } else if (allNeg) {
            html += `<span class="def-badge negative">Negative Definite</span>`;
        } else if (allNonNeg) {
            html += `<span class="def-badge semi-positive">Positive Semi-definite</span>`;
        } else if (allNonPos) {
            html += `<span class="def-badge semi-negative">Negative Semi-definite</span>`;
        } else {
            html += `<span class="def-badge indefinite">Indefinite</span>`;
        }
    }

    html += `</div></div>`;
    resultsDiv.innerHTML = html;
}

function subscript(n) {
    const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(n).split('').map(d => subs[parseInt(d)]).join('');
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-14) return '0';
    if (Math.abs(val) < 0.00001 || Math.abs(val) > 100000) {
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
    updateDimensions();
    loadSample('rosenbrock');
});
