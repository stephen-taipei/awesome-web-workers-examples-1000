/**
 * Main script for Jacobian Matrix
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

    // Update input dimensions based on function
    const dims = {
        'polar': 2, 'spherical': 3, 'rotation': 3,
        'nonlinear': 2, 'trig': 2, 'newton': 2, 'lorentz': 3
    };

    const n = dims[select.value] || 2;
    updateDimensions(n);
}

function updateDimensions(n) {
    const container = document.getElementById('pointInputs');
    const currentInputs = container.querySelectorAll('.point-input');

    while (currentInputs.length > n) {
        container.removeChild(container.lastChild);
    }

    while (container.querySelectorAll('.point-input').length < n) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'point-input';
        input.value = '1';
        input.step = '0.1';
        container.appendChild(input);
    }
}

function loadSample(type) {
    const samples = {
        'polar': { func: 'polar', point: [2, Math.PI / 4] },
        'rotation': { func: 'rotation', point: [1, 0, Math.PI / 4] },
        'newton': { func: 'newton', point: [2, 0.5] },
        'spherical': { func: 'spherical', point: [2, Math.PI / 4, Math.PI / 3] }
    };

    const sample = samples[type];
    document.getElementById('functionSelect').value = sample.func;
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
    const { fValue, jacobian, exact, determinant, rank, singularValues,
            conditionNumber, frobeniusNorm, dimensions, functionStrings, point, h, method } = result;

    const { m, n } = dimensions;

    let html = `
        <div class="result-card">
            <h3>Jacobian Matrix Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${functionStrings.name}</div>
                <div class="method-info">F: ℝ${superscript(n)} → ℝ${superscript(m)}, ${method} difference</div>
            </div>

            <div class="function-display">
                <div class="fd-label">F(x) =</div>
                <div class="fd-components">
    `;

    functionStrings.components.forEach((comp, i) => {
        html += `<div class="fd-component">f${subscript(i + 1)} = ${comp}</div>`;
    });

    html += `
                </div>
            </div>

            <div class="point-display">
                <span class="pd-label">Input x =</span>
                <span class="pd-value">(${point.map(p => formatNumber(p, 4)).join(', ')})</span>
            </div>

            <div class="output-display">
                <span class="od-label">F(x) =</span>
                <span class="od-value">(${fValue.map(f => formatNumber(f, 6)).join(', ')})</span>
            </div>

            <h4>Jacobian Matrix J(F)</h4>
            <div class="matrix-info">${m} × ${n} matrix</div>
            <div class="matrix-container">
                <div class="matrix-bracket left"></div>
                <div class="matrix-content">
    `;

    // Display Jacobian matrix with row/column labels
    html += `<div class="matrix-header"><span class="header-cell"></span>`;
    for (let j = 0; j < n; j++) {
        html += `<span class="header-cell">∂/∂x${subscript(j + 1)}</span>`;
    }
    html += `</div>`;

    for (let i = 0; i < m; i++) {
        html += `<div class="matrix-row">`;
        html += `<span class="row-label">f${subscript(i + 1)}</span>`;
        for (let j = 0; j < n; j++) {
            html += `<span class="matrix-cell">${formatNumber(jacobian[i][j], 6)}</span>`;
        }
        html += `</div>`;
    }

    html += `
                </div>
                <div class="matrix-bracket right"></div>
            </div>
    `;

    // Exact Jacobian comparison if available
    if (exact) {
        html += `
            <h4>Exact Jacobian (for comparison)</h4>
            <div class="matrix-container exact">
                <div class="matrix-bracket left"></div>
                <div class="matrix-content">
        `;
        for (let i = 0; i < m; i++) {
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
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                maxError = Math.max(maxError, Math.abs(jacobian[i][j] - exact[i][j]));
            }
        }
        html += `<div class="error-note">Maximum error: ${maxError.toExponential(3)}</div>`;
    }

    // Matrix properties
    html += `
        <h4>Matrix Properties</h4>
        <div class="properties-grid">
            <div class="prop-card">
                <div class="prop-label">Dimensions</div>
                <div class="prop-value">${m} × ${n}</div>
            </div>
            <div class="prop-card">
                <div class="prop-label">Rank</div>
                <div class="prop-value">${rank}</div>
            </div>
            ${determinant !== null ? `
            <div class="prop-card">
                <div class="prop-label">Determinant</div>
                <div class="prop-value">${formatNumber(determinant, 8)}</div>
            </div>
            ` : ''}
            <div class="prop-card">
                <div class="prop-label">Frobenius Norm</div>
                <div class="prop-value">${formatNumber(frobeniusNorm, 6)}</div>
            </div>
            ${conditionNumber !== null && isFinite(conditionNumber) ? `
            <div class="prop-card">
                <div class="prop-label">Condition Number</div>
                <div class="prop-value">${formatNumber(conditionNumber, 4)}</div>
            </div>
            ` : ''}
        </div>
    `;

    // Singular values
    if (singularValues && singularValues.length > 0) {
        html += `
            <h4>Singular Values</h4>
            <div class="singular-values">
        `;
        singularValues.forEach((sv, i) => {
            html += `
                <div class="sv-item">
                    <span class="sv-label">σ${subscript(i + 1)}</span>
                    <span class="sv-value">${formatNumber(sv, 8)}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    // Interpretation for square Jacobians
    if (m === n && determinant !== null) {
        html += `
            <h4>Interpretation</h4>
            <div class="interpretation">
        `;

        if (Math.abs(determinant) < 1e-10) {
            html += `
                <div class="interp-item warning">
                    <span class="interp-icon">⚠️</span>
                    <span class="interp-text">Jacobian is singular (det ≈ 0). The mapping is not locally invertible at this point.</span>
                </div>
            `;
        } else {
            html += `
                <div class="interp-item">
                    <span class="interp-icon">✓</span>
                    <span class="interp-text">Jacobian is non-singular. The mapping is locally invertible.</span>
                </div>
                <div class="interp-item">
                    <span class="interp-icon">📐</span>
                    <span class="interp-text">Local volume scaling factor: |det(J)| = ${formatNumber(Math.abs(determinant), 6)}</span>
                </div>
            `;
            if (determinant < 0) {
                html += `
                    <div class="interp-item">
                        <span class="interp-icon">🔄</span>
                        <span class="interp-text">Orientation-reversing (det < 0)</span>
                    </div>
                `;
            }
        }

        html += `</div>`;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function subscript(n) {
    const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(n).split('').map(d => subs[parseInt(d)]).join('');
}

function superscript(n) {
    const sups = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    return String(n).split('').map(d => sups[parseInt(d)]).join('');
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
    updateFunction();
    loadSample('polar');
});
