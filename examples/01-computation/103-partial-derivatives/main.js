/**
 * Main script for Partial Derivatives
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
        'quadratic': { x: 1, y: 1 },
        'saddle': { x: 1, y: 1 },
        'product': { x: 2, y: 3 },
        'trig': { x: Math.PI / 4, y: Math.PI / 4 },
        'exp': { x: 0, y: 0 },
        'mixed': { x: 1, y: 1 },
        'rosenbrock': { x: 1, y: 1 }
    };

    if (defaults[select.value]) {
        document.getElementById('x').value = defaults[select.value].x;
        document.getElementById('y').value = defaults[select.value].y;
    }
}

function loadSample(type) {
    const samples = {
        'quadratic': { func: 'quadratic', x: 1, y: 1 },
        'saddle': { func: 'saddle', x: 1, y: 1 },
        'rosenbrock': { func: 'rosenbrock', x: 1, y: 1 },
        'trig': { func: 'trig', x: Math.PI / 4, y: Math.PI / 4 }
    };

    const sample = samples[type];
    document.getElementById('functionSelect').value = sample.func;
    document.getElementById('x').value = sample.x;
    document.getElementById('y').value = sample.y;
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const x = parseFloat(document.getElementById('x').value);
    const y = parseFloat(document.getElementById('y').value);
    const h = parseFloat(document.getElementById('h').value);
    const order = parseInt(document.getElementById('order').value);

    if (isNaN(x) || isNaN(y) || isNaN(h)) {
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
        data: { functionType, customFunction, x, y, h, order }
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
    const { fValue, firstOrder, secondOrder, exact, gradientMag, gradientAngle,
            laplacian, directionalDerivatives, functionString, x, y, h, order } = result;

    let html = `
        <div class="result-card">
            <h3>Partial Derivatives Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">f(x, y) = ${functionString}</div>
                <div class="method-info">Evaluated at (${formatNumber(x, 4)}, ${formatNumber(y, 4)})</div>
            </div>

            <div class="function-value">
                <span class="fv-label">f(${formatNumber(x, 4)}, ${formatNumber(y, 4)}) =</span>
                <span class="fv-value">${formatNumber(fValue, 10)}</span>
            </div>

            <h4>First-Order Partial Derivatives</h4>
            <div class="partial-grid">
    `;

    // ∂f/∂x
    const fxError = exact.fx !== null ? Math.abs(firstOrder.fx.value - exact.fx) : null;
    html += `
        <div class="partial-card">
            <div class="partial-symbol">∂f/∂x</div>
            <div class="partial-value">${formatNumber(firstOrder.fx.value, 10)}</div>
            ${exact.fx !== null ? `<div class="partial-exact">Exact: ${formatNumber(exact.fx, 10)}</div>` : ''}
            ${fxError !== null ? `<div class="partial-error">Error: ${fxError.toExponential(3)}</div>` : ''}
        </div>
    `;

    // ∂f/∂y
    const fyError = exact.fy !== null ? Math.abs(firstOrder.fy.value - exact.fy) : null;
    html += `
        <div class="partial-card">
            <div class="partial-symbol">∂f/∂y</div>
            <div class="partial-value">${formatNumber(firstOrder.fy.value, 10)}</div>
            ${exact.fy !== null ? `<div class="partial-exact">Exact: ${formatNumber(exact.fy, 10)}</div>` : ''}
            ${fyError !== null ? `<div class="partial-error">Error: ${fyError.toExponential(3)}</div>` : ''}
        </div>
    `;

    html += `</div>`;

    // Gradient information
    html += `
        <h4>Gradient Vector</h4>
        <div class="gradient-display">
            <div class="gradient-vector">
                ∇f = (${formatNumber(firstOrder.fx.value, 6)}, ${formatNumber(firstOrder.fy.value, 6)})
            </div>
            <div class="gradient-info">
                <div class="gradient-item">
                    <span class="gi-label">Magnitude |∇f|:</span>
                    <span class="gi-value">${formatNumber(gradientMag, 8)}</span>
                </div>
                <div class="gradient-item">
                    <span class="gi-label">Direction:</span>
                    <span class="gi-value">${formatNumber(gradientAngle, 2)}°</span>
                </div>
            </div>
        </div>
    `;

    // Directional derivatives
    html += `
        <h4>Directional Derivatives</h4>
        <div class="directional-grid">
    `;

    for (const dir of directionalDerivatives) {
        html += `
            <div class="dir-card">
                <div class="dir-name">${dir.name}</div>
                <div class="dir-angle">${dir.angle}°</div>
                <div class="dir-value">${formatNumber(dir.value, 6)}</div>
            </div>
        `;
    }

    html += `</div>`;

    // Second-order partial derivatives
    if (secondOrder) {
        html += `<h4>Second-Order Partial Derivatives</h4><div class="partial-grid second-order">`;

        // ∂²f/∂x²
        const fxxError = exact.fxx !== null ? Math.abs(secondOrder.fxx.value - exact.fxx) : null;
        html += `
            <div class="partial-card">
                <div class="partial-symbol">∂²f/∂x²</div>
                <div class="partial-value">${formatNumber(secondOrder.fxx.value, 10)}</div>
                ${exact.fxx !== null ? `<div class="partial-exact">Exact: ${formatNumber(exact.fxx, 10)}</div>` : ''}
                ${fxxError !== null ? `<div class="partial-error">Error: ${fxxError.toExponential(3)}</div>` : ''}
            </div>
        `;

        // ∂²f/∂y²
        const fyyError = exact.fyy !== null ? Math.abs(secondOrder.fyy.value - exact.fyy) : null;
        html += `
            <div class="partial-card">
                <div class="partial-symbol">∂²f/∂y²</div>
                <div class="partial-value">${formatNumber(secondOrder.fyy.value, 10)}</div>
                ${exact.fyy !== null ? `<div class="partial-exact">Exact: ${formatNumber(exact.fyy, 10)}</div>` : ''}
                ${fyyError !== null ? `<div class="partial-error">Error: ${fyyError.toExponential(3)}</div>` : ''}
            </div>
        `;

        // ∂²f/∂x∂y
        const fxyError = exact.fxy !== null ? Math.abs(secondOrder.fxy.value - exact.fxy) : null;
        html += `
            <div class="partial-card">
                <div class="partial-symbol">∂²f/∂x∂y</div>
                <div class="partial-value">${formatNumber(secondOrder.fxy.value, 10)}</div>
                ${exact.fxy !== null ? `<div class="partial-exact">Exact: ${formatNumber(exact.fxy, 10)}</div>` : ''}
                ${fxyError !== null ? `<div class="partial-error">Error: ${fxyError.toExponential(3)}</div>` : ''}
            </div>
        `;

        html += `</div>`;

        // Laplacian
        html += `
            <h4>Laplacian</h4>
            <div class="laplacian-display">
                <div class="laplacian-formula">∇²f = ∂²f/∂x² + ∂²f/∂y²</div>
                <div class="laplacian-value">${formatNumber(laplacian, 10)}</div>
                <div class="laplacian-interp">
                    ${laplacian > 0 ? 'Positive: Local minimum tendency' :
                      laplacian < 0 ? 'Negative: Local maximum tendency' :
                      'Zero: Saddle point or flat'}
                </div>
            </div>
        `;

        // Hessian matrix
        html += `
            <h4>Hessian Matrix</h4>
            <div class="hessian-display">
                <div class="hessian-matrix">
                    <div class="matrix-row">
                        <span class="matrix-cell">${formatNumber(secondOrder.fxx.value, 6)}</span>
                        <span class="matrix-cell">${formatNumber(secondOrder.fxy.value, 6)}</span>
                    </div>
                    <div class="matrix-row">
                        <span class="matrix-cell">${formatNumber(secondOrder.fxy.value, 6)}</span>
                        <span class="matrix-cell">${formatNumber(secondOrder.fyy.value, 6)}</span>
                    </div>
                </div>
                <div class="hessian-det">
                    det(H) = ${formatNumber(secondOrder.fxx.value * secondOrder.fyy.value -
                                            secondOrder.fxy.value * secondOrder.fxy.value, 6)}
                </div>
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
    loadSample('quadratic');
});
