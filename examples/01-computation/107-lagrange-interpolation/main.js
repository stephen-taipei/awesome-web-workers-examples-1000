/**
 * Main script for Lagrange Interpolation
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

function updateDataSource() {
    const source = document.getElementById('dataSource').value;
    const manualInput = document.getElementById('manualInput');
    const sampleInput = document.getElementById('sampleInput');

    if (source === 'manual') {
        manualInput.style.display = 'block';
        sampleInput.style.display = 'none';
    } else {
        manualInput.style.display = 'none';
        sampleInput.style.display = 'block';
    }
}

function addPoint() {
    const container = document.getElementById('dataPoints');
    const row = document.createElement('div');
    row.className = 'point-row';
    row.innerHTML = `
        <input type="number" class="x-input" value="0" step="0.5">
        <span class="comma">,</span>
        <input type="number" class="y-input" value="0" step="0.5">
        <button class="btn-remove" onclick="removePoint(this)">×</button>
    `;
    container.appendChild(row);
}

function removePoint(btn) {
    const container = document.getElementById('dataPoints');
    if (container.children.length > 2) {
        btn.parentElement.remove();
    }
}

function loadSample(type) {
    document.getElementById('dataSource').value = 'manual';
    updateDataSource();

    const samples = {
        'linear': [{ x: 0, y: 1 }, { x: 2, y: 5 }],
        'quadratic': [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 3 }],
        'sin5': [
            { x: 0, y: 0 },
            { x: Math.PI / 4, y: Math.sin(Math.PI / 4) },
            { x: Math.PI / 2, y: 1 },
            { x: 3 * Math.PI / 4, y: Math.sin(3 * Math.PI / 4) },
            { x: Math.PI, y: 0 }
        ],
        'runge': (() => {
            const pts = [];
            for (let i = -5; i <= 5; i++) {
                const x = i * 0.2;
                pts.push({ x, y: 1 / (1 + 25 * x * x) });
            }
            return pts;
        })()
    };

    const points = samples[type];
    const container = document.getElementById('dataPoints');
    container.innerHTML = '';

    points.forEach(p => {
        const row = document.createElement('div');
        row.className = 'point-row';
        row.innerHTML = `
            <input type="number" class="x-input" value="${p.x.toFixed(4)}" step="0.5">
            <span class="comma">,</span>
            <input type="number" class="y-input" value="${p.y.toFixed(4)}" step="0.5">
            <button class="btn-remove" onclick="removePoint(this)">×</button>
        `;
        container.appendChild(row);
    });

    // Update range based on points
    const xMin = Math.min(...points.map(p => p.x));
    const xMax = Math.max(...points.map(p => p.x));
    const margin = (xMax - xMin) * 0.2;
    document.getElementById('rangeStart').value = (xMin - margin).toFixed(2);
    document.getElementById('rangeEnd').value = (xMax + margin).toFixed(2);
    document.getElementById('evalPoint').value = ((xMin + xMax) / 2).toFixed(2);
}

function getDataPoints() {
    const source = document.getElementById('dataSource').value;

    if (source === 'manual') {
        const rows = document.querySelectorAll('.point-row');
        const points = [];
        rows.forEach(row => {
            const x = parseFloat(row.querySelector('.x-input').value);
            const y = parseFloat(row.querySelector('.y-input').value);
            if (!isNaN(x) && !isNaN(y)) {
                points.push({ x, y });
            }
        });
        return { points, originalFunction: null };
    } else {
        const n = parseInt(document.getElementById('numPoints').value);
        const points = [];
        let func;

        switch (source) {
            case 'sin':
                func = x => Math.sin(x);
                for (let i = 0; i < n; i++) {
                    const x = i * Math.PI / (n - 1);
                    points.push({ x, y: func(x) });
                }
                break;
            case 'exp':
                func = x => Math.exp(x);
                for (let i = 0; i < n; i++) {
                    const x = -1 + i * 2 / (n - 1);
                    points.push({ x, y: func(x) });
                }
                break;
            case 'runge':
                func = x => 1 / (1 + 25 * x * x);
                for (let i = 0; i < n; i++) {
                    const x = -1 + i * 2 / (n - 1);
                    points.push({ x, y: func(x) });
                }
                break;
            case 'polynomial':
                func = x => x * x * x - 2 * x + 1;
                for (let i = 0; i < n; i++) {
                    const x = -2 + i * 4 / (n - 1);
                    points.push({ x, y: func(x) });
                }
                break;
            case 'step':
                for (let i = 0; i < n; i++) {
                    const x = -1 + i * 2 / (n - 1);
                    points.push({ x, y: x < 0 ? 0 : 1 });
                }
                break;
        }

        return { points, originalFunction: source };
    }
}

function calculate() {
    const { points, originalFunction } = getDataPoints();
    const evalPoint = parseFloat(document.getElementById('evalPoint').value);
    const rangeStart = parseFloat(document.getElementById('rangeStart').value);
    const rangeEnd = parseFloat(document.getElementById('rangeEnd').value);
    const rangeSteps = parseInt(document.getElementById('rangeSteps').value);

    if (points.length < 2) {
        displayError('Need at least 2 data points');
        return;
    }

    if (isNaN(evalPoint) || isNaN(rangeStart) || isNaN(rangeEnd)) {
        displayError('Please enter valid numeric values');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { points, evalPoint, rangeStart, rangeEnd, rangeSteps, originalFunction }
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
    const { points, interpolatedValue, evalPoint, coefficients, curvePoints,
            basisPolynomials, errorAnalysis, degree } = result;

    let html = `
        <div class="result-card">
            <h3>Lagrange Interpolation Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">Polynomial of Degree ${degree}</div>
                <div class="method-info">${points.length} data points</div>
            </div>

            <div class="interpolation-result">
                <div class="ir-label">P(${formatNumber(evalPoint, 4)}) =</div>
                <div class="ir-value">${formatNumber(interpolatedValue, 10)}</div>
            </div>

            <h4>Data Points</h4>
            <div class="data-points-display">
    `;

    points.forEach((p, i) => {
        html += `
            <div class="dp-item">
                <span class="dp-index">${i + 1}</span>
                <span class="dp-coord">(${formatNumber(p.x, 4)}, ${formatNumber(p.y, 4)})</span>
            </div>
        `;
    });

    html += `</div>`;

    // Polynomial expression
    html += `
        <h4>Polynomial Expression</h4>
        <div class="polynomial-display">
            <div class="poly-expr">P(x) = ${formatPolynomial(coefficients)}</div>
        </div>
    `;

    // Lagrange basis contribution
    html += `
        <h4>Lagrange Basis Contributions at x = ${formatNumber(evalPoint, 4)}</h4>
        <div class="basis-contributions">
    `;

    let total = 0;
    basisPolynomials.forEach((bp, i) => {
        const contribution = bp.point.y * bp.atEval;
        total += contribution;
        html += `
            <div class="basis-row">
                <span class="br-term">y${subscript(i)}·L${subscript(i)}(x)</span>
                <span class="br-calc">${formatNumber(bp.point.y, 4)} × ${formatNumber(bp.atEval, 6)}</span>
                <span class="br-value">= ${formatNumber(contribution, 8)}</span>
            </div>
        `;
    });

    html += `
            <div class="basis-row total">
                <span class="br-term">Sum</span>
                <span class="br-calc"></span>
                <span class="br-value">= ${formatNumber(total, 10)}</span>
            </div>
        </div>
    `;

    // Error analysis if available
    if (errorAnalysis) {
        html += `
            <h4>Error Analysis</h4>
            <div class="error-analysis">
                <div class="ea-item">
                    <span class="ea-label">Maximum Error:</span>
                    <span class="ea-value">${errorAnalysis.maxError.toExponential(4)}</span>
                    <span class="ea-note">at x = ${formatNumber(errorAnalysis.maxErrorX, 4)}</span>
                </div>
                <div class="ea-item">
                    <span class="ea-label">RMSE:</span>
                    <span class="ea-value">${errorAnalysis.rmse.toExponential(4)}</span>
                </div>
            </div>
        `;
    }

    // Simple text-based curve visualization
    html += `
        <h4>Interpolation Curve</h4>
        <div class="curve-visualization">
            <div class="curve-info">
                Range: [${formatNumber(curvePoints[0].x, 2)}, ${formatNumber(curvePoints[curvePoints.length - 1].x, 2)}]
            </div>
            <div class="curve-samples">
    `;

    // Show a few sample points from the curve
    const sampleIndices = [0, Math.floor(curvePoints.length / 4), Math.floor(curvePoints.length / 2),
                          Math.floor(3 * curvePoints.length / 4), curvePoints.length - 1];
    sampleIndices.forEach(idx => {
        const cp = curvePoints[idx];
        html += `
            <div class="curve-sample">
                <span class="cs-x">x = ${formatNumber(cp.x, 3)}</span>
                <span class="cs-y">P(x) = ${formatNumber(cp.y, 6)}</span>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function formatPolynomial(coeffs) {
    const terms = [];
    const n = coeffs.length;

    for (let i = n - 1; i >= 0; i--) {
        const c = coeffs[i];
        if (Math.abs(c) < 1e-10) continue;

        let term = '';
        const absC = Math.abs(c);

        if (i === 0) {
            term = formatNumber(c, 4);
        } else if (i === 1) {
            if (Math.abs(absC - 1) < 1e-10) {
                term = (c > 0 ? '' : '-') + 'x';
            } else {
                term = formatNumber(c, 4) + 'x';
            }
        } else {
            if (Math.abs(absC - 1) < 1e-10) {
                term = (c > 0 ? '' : '-') + 'x' + superscript(i);
            } else {
                term = formatNumber(c, 4) + 'x' + superscript(i);
            }
        }

        if (terms.length > 0 && c > 0) {
            term = '+ ' + term;
        }

        terms.push(term);
    }

    return terms.length > 0 ? terms.join(' ') : '0';
}

function subscript(n) {
    const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(n).split('').map(d => subs[parseInt(d)] || d).join('');
}

function superscript(n) {
    const sups = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    return String(n).split('').map(d => sups[parseInt(d)] || d).join('');
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-14) return '0';
    if (Math.abs(val) < 0.0001 || Math.abs(val) > 10000) {
        return val.toExponential(Math.min(decimals, 4));
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
