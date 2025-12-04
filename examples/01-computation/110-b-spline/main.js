/**
 * Main script for B-Spline Curves
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

function updateKnotInput() {
    const type = document.getElementById('knotType').value;
    document.getElementById('customKnots').style.display = type === 'custom' ? 'block' : 'none';
}

function addPoint() {
    const container = document.getElementById('controlPoints');
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
    const container = document.getElementById('controlPoints');
    if (container.children.length > 2) {
        btn.parentElement.remove();
    }
}

function loadSample(type) {
    const samples = {
        'line': [
            { x: 0, y: 0 }, { x: 4, y: 3 }
        ],
        'curve': [
            { x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 3 },
            { x: 3, y: 1 }, { x: 4, y: 2 }
        ],
        'circle': [
            { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
            { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
            { x: 0, y: -1 }, { x: 1, y: -1 }
        ],
        'wave': [
            { x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 0 },
            { x: 3, y: -2 }, { x: 4, y: 0 }, { x: 5, y: 2 }, { x: 6, y: 0 }
        ]
    };

    const points = samples[type];
    setControlPoints(points);

    // Adjust degree if needed
    const degree = parseInt(document.getElementById('degree').value);
    if (points.length < degree + 1) {
        document.getElementById('degree').value = Math.max(1, points.length - 1);
    }
}

function setControlPoints(points) {
    const container = document.getElementById('controlPoints');
    container.innerHTML = '';

    points.forEach(p => {
        const row = document.createElement('div');
        row.className = 'point-row';
        row.innerHTML = `
            <input type="number" class="x-input" value="${p.x}" step="0.5">
            <span class="comma">,</span>
            <input type="number" class="y-input" value="${p.y}" step="0.5">
            <button class="btn-remove" onclick="removePoint(this)">×</button>
        `;
        container.appendChild(row);
    });
}

function getControlPoints() {
    const rows = document.querySelectorAll('.point-row');
    const points = [];
    rows.forEach(row => {
        const x = parseFloat(row.querySelector('.x-input').value);
        const y = parseFloat(row.querySelector('.y-input').value);
        if (!isNaN(x) && !isNaN(y)) {
            points.push({ x, y });
        }
    });
    return points;
}

function getCustomKnots() {
    const input = document.getElementById('knotVector').value;
    if (!input.trim()) return null;
    return input.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
}

function calculate() {
    const controlPoints = getControlPoints();
    const degree = parseInt(document.getElementById('degree').value);
    const knotType = document.getElementById('knotType').value;
    const customKnots = knotType === 'custom' ? getCustomKnots() : null;
    const evalParam = parseFloat(document.getElementById('evalParam').value);
    const numSamples = parseInt(document.getElementById('numSamples').value);

    if (controlPoints.length < degree + 1) {
        displayError(`Need at least ${degree + 1} control points for degree ${degree}`);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { controlPoints, degree, knotType, customKnots, evalParam, numSamples }
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
    const { controlPoints, degree, knots, knotType, evalParam, evalT,
            evalPoint, basisValues, curvePoints, basisSamples, tMin, tMax, numControlPoints } = result;

    const knotTypeNames = {
        'uniform': 'Uniform',
        'clamped': 'Clamped (Open)',
        'custom': 'Custom'
    };

    let html = `
        <div class="result-card">
            <h3>B-Spline Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">Degree ${degree} B-Spline</div>
                <div class="method-info">${numControlPoints} control points, ${knotTypeNames[knotType]} knots</div>
            </div>

            <div class="interpolation-result">
                <div class="ir-label">C(t=${formatNumber(evalParam, 3)}) = C(${formatNumber(evalT, 4)})</div>
                <div class="ir-value">(${formatNumber(evalPoint.x, 6)}, ${formatNumber(evalPoint.y, 6)})</div>
            </div>

            <h4>Control Points</h4>
            <div class="control-points-display">
    `;

    controlPoints.forEach((p, i) => {
        html += `
            <div class="cp-item">
                <span class="cp-index">P${subscript(i)}</span>
                <span class="cp-coord">(${formatNumber(p.x, 3)}, ${formatNumber(p.y, 3)})</span>
            </div>
        `;
    });

    html += `</div>`;

    // Knot vector
    html += `
        <h4>Knot Vector</h4>
        <div class="knot-vector">
            <div class="knot-values">[${knots.map(k => formatNumber(k, 4)).join(', ')}]</div>
            <div class="knot-info">Length: ${knots.length} = n + k + 1 = ${numControlPoints} + ${degree} + 1</div>
            <div class="knot-info">Parameter domain: [${formatNumber(tMin, 4)}, ${formatNumber(tMax, 4)}]</div>
        </div>
    `;

    // Basis function values at evaluation point
    html += `
        <h4>Basis Functions at t = ${formatNumber(evalT, 4)}</h4>
        <div class="basis-values">
    `;

    let sumBasis = 0;
    basisValues.forEach((b, i) => {
        sumBasis += b;
        if (Math.abs(b) > 1e-10) {
            html += `
                <div class="bv-item ${b > 0.1 ? 'highlight' : ''}">
                    <span class="bv-label">N${subscript(i)},${subscript(degree)}(t)</span>
                    <span class="bv-bar" style="width: ${Math.round(b * 100)}%"></span>
                    <span class="bv-value">${formatNumber(b, 6)}</span>
                </div>
            `;
        }
    });

    html += `
            <div class="bv-sum">
                <span>Σ Nᵢ,ₖ(t) = ${formatNumber(sumBasis, 8)}</span>
                <span class="bv-note">(partition of unity)</span>
            </div>
        </div>
    `;

    // Evaluation breakdown
    html += `
        <h4>Point Calculation</h4>
        <div class="eval-breakdown">
            <div class="eb-formula">C(t) = Σᵢ Pᵢ · Nᵢ,ₖ(t)</div>
            <div class="eb-terms">
    `;

    let xSum = 0, ySum = 0;
    basisValues.forEach((b, i) => {
        if (Math.abs(b) > 1e-10) {
            const contribution = {
                x: controlPoints[i].x * b,
                y: controlPoints[i].y * b
            };
            xSum += contribution.x;
            ySum += contribution.y;
            html += `
                <div class="eb-term">
                    <span>P${subscript(i)} × N${subscript(i)},${subscript(degree)}</span>
                    <span>= (${formatNumber(controlPoints[i].x, 3)}, ${formatNumber(controlPoints[i].y, 3)}) × ${formatNumber(b, 4)}</span>
                    <span>= (${formatNumber(contribution.x, 4)}, ${formatNumber(contribution.y, 4)})</span>
                </div>
            `;
        }
    });

    html += `
                <div class="eb-term total">
                    <span>Total</span>
                    <span></span>
                    <span>= (${formatNumber(xSum, 6)}, ${formatNumber(ySum, 6)})</span>
                </div>
            </div>
        </div>
    `;

    // Curve samples
    html += `
        <h4>Curve Samples</h4>
        <div class="curve-samples">
    `;

    const sampleIndices = [0, Math.floor(curvePoints.length * 0.25),
                          Math.floor(curvePoints.length * 0.5),
                          Math.floor(curvePoints.length * 0.75),
                          curvePoints.length - 1];

    sampleIndices.forEach(idx => {
        const pt = curvePoints[idx];
        html += `
            <div class="cs-item">
                <span class="cs-t">t = ${formatNumber((pt.t - tMin) / (tMax - tMin), 2)}</span>
                <span class="cs-point">(${formatNumber(pt.x, 4)}, ${formatNumber(pt.y, 4)})</span>
            </div>
        `;
    });

    html += `
        </div>
    `;

    // Properties
    html += `
        <h4>Spline Properties</h4>
        <div class="properties">
            <div class="prop-item">
                <span class="prop-label">Order:</span>
                <span class="prop-value">${degree + 1} (degree + 1)</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Continuity:</span>
                <span class="prop-value">C${superscript(degree - 1)} at simple knots</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Local Support:</span>
                <span class="prop-value">Each Nᵢ,ₖ is non-zero on at most k+1 intervals</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Endpoint Behavior:</span>
                <span class="prop-value">${knotType === 'clamped' ? 'Passes through P₀ and P_{n-1}' : 'Does not necessarily interpolate endpoints'}</span>
            </div>
        </div>
    `;

    html += `</div>`;
    resultsDiv.innerHTML = html;
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
    if (Math.abs(val) < 1e-12) return '0';
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
    loadSample('curve');
});
