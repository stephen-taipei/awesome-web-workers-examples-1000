/**
 * Main script for Bezier Curves
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
        'linear': [
            { x: 0, y: 0 }, { x: 4, y: 3 }
        ],
        'quadratic': [
            { x: 0, y: 0 }, { x: 2, y: 4 }, { x: 4, y: 0 }
        ],
        'cubic': [
            { x: 0, y: 0 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 0 }
        ],
        'quartic': [
            { x: 0, y: 0 }, { x: 1, y: 4 }, { x: 2, y: 0 },
            { x: 3, y: 4 }, { x: 4, y: 0 }
        ],
        'scurve': [
            { x: 0, y: 0 }, { x: 0, y: 2 }, { x: 1, y: 3 },
            { x: 3, y: 3 }, { x: 4, y: 2 }, { x: 4, y: 0 }
        ]
    };

    const points = samples[type];
    setControlPoints(points);
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

function calculate() {
    const controlPoints = getControlPoints();
    const evalParam = parseFloat(document.getElementById('evalParam').value);
    const numSamples = parseInt(document.getElementById('numSamples').value);
    const showConstruction = document.getElementById('showConstruction').checked;

    if (controlPoints.length < 2) {
        displayError('Need at least 2 control points');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { controlPoints, evalParam, numSamples, showConstruction }
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
    const { controlPoints, degree, evalParam, evalPoint, constructionLevels,
            bernsteinValues, curvePoints, derivatives, curveLength, boundingBox } = result;

    const degreeNames = ['Constant', 'Linear', 'Quadratic', 'Cubic', 'Quartic', 'Quintic', 'Sextic'];
    const degreeName = degreeNames[degree] || `Degree ${degree}`;

    let html = `
        <div class="result-card">
            <h3>Bezier Curve Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${degreeName} Bezier Curve</div>
                <div class="method-info">${controlPoints.length} control points</div>
            </div>

            <div class="interpolation-result">
                <div class="ir-label">B(${formatNumber(evalParam, 2)}) =</div>
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

    // Bernstein polynomials
    html += `
        <h4>Bernstein Polynomials at t = ${formatNumber(evalParam, 2)}</h4>
        <div class="bernstein-values">
    `;

    let sumBernstein = 0;
    bernsteinValues.forEach(b => {
        sumBernstein += b.value;
        html += `
            <div class="bv-item ${b.value > 0.1 ? 'highlight' : ''}">
                <span class="bv-label">B${subscript(b.i)},${subscript(degree)}(t)</span>
                <span class="bv-formula">C(${degree},${b.i})·t${superscript(b.i)}·(1-t)${superscript(degree - b.i)}</span>
                <span class="bv-bar" style="width: ${Math.round(b.value * 100)}%"></span>
                <span class="bv-value">${formatNumber(b.value, 6)}</span>
            </div>
        `;
    });

    html += `
            <div class="bv-sum">
                <span>Σ Bᵢ,ₙ(t) = ${formatNumber(sumBernstein, 8)}</span>
                <span class="bv-note">(partition of unity)</span>
            </div>
        </div>
    `;

    // de Casteljau construction
    if (constructionLevels) {
        html += `
            <h4>de Casteljau Construction at t = ${formatNumber(evalParam, 2)}</h4>
            <div class="construction">
        `;

        constructionLevels.forEach((level, levelIdx) => {
            html += `<div class="construction-level">`;
            html += `<span class="level-label">Level ${levelIdx}:</span>`;
            html += `<div class="level-points">`;
            level.forEach((p, i) => {
                html += `<span class="construction-point">P${superscript(levelIdx)}${subscript(i)} = (${formatNumber(p.x, 4)}, ${formatNumber(p.y, 4)})</span>`;
            });
            html += `</div></div>`;
        });

        html += `</div>`;
    }

    // Point calculation breakdown
    html += `
        <h4>Point Calculation</h4>
        <div class="eval-breakdown">
            <div class="eb-formula">B(t) = Σᵢ Pᵢ · Bᵢ,ₙ(t)</div>
            <div class="eb-terms">
    `;

    let xSum = 0, ySum = 0;
    bernsteinValues.forEach((b, i) => {
        const contribution = {
            x: controlPoints[i].x * b.value,
            y: controlPoints[i].y * b.value
        };
        xSum += contribution.x;
        ySum += contribution.y;
        html += `
            <div class="eb-term">
                <span>P${subscript(i)} × B${subscript(i)},${subscript(degree)}</span>
                <span>= (${formatNumber(controlPoints[i].x, 2)}, ${formatNumber(controlPoints[i].y, 2)}) × ${formatNumber(b.value, 4)}</span>
                <span>= (${formatNumber(contribution.x, 4)}, ${formatNumber(contribution.y, 4)})</span>
            </div>
        `;
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

    // Derivatives
    html += `
        <h4>Tangent Vectors</h4>
        <div class="derivatives">
            <div class="deriv-item">
                <span class="deriv-label">B'(0):</span>
                <span class="deriv-value">(${formatNumber(derivatives.at0.x, 4)}, ${formatNumber(derivatives.at0.y, 4)})</span>
                <span class="deriv-info">|B'(0)| = ${formatNumber(derivatives.magnitudeAt0, 4)}, angle = ${formatNumber(derivatives.angleAt0, 1)}°</span>
            </div>
            <div class="deriv-item">
                <span class="deriv-label">B'(1):</span>
                <span class="deriv-value">(${formatNumber(derivatives.at1.x, 4)}, ${formatNumber(derivatives.at1.y, 4)})</span>
                <span class="deriv-info">|B'(1)| = ${formatNumber(derivatives.magnitudeAt1, 4)}, angle = ${formatNumber(derivatives.angleAt1, 1)}°</span>
            </div>
        </div>
    `;

    // Curve properties
    html += `
        <h4>Curve Properties</h4>
        <div class="properties">
            <div class="prop-item">
                <span class="prop-label">Approximate Length:</span>
                <span class="prop-value">${formatNumber(curveLength, 4)}</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Curve Bounding Box:</span>
                <span class="prop-value">[${formatNumber(boundingBox.curve.minX, 2)}, ${formatNumber(boundingBox.curve.minY, 2)}] to [${formatNumber(boundingBox.curve.maxX, 2)}, ${formatNumber(boundingBox.curve.maxY, 2)}]</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Control Polygon Box:</span>
                <span class="prop-value">[${formatNumber(boundingBox.controlPolygon.minX, 2)}, ${formatNumber(boundingBox.controlPolygon.minY, 2)}] to [${formatNumber(boundingBox.controlPolygon.maxX, 2)}, ${formatNumber(boundingBox.controlPolygon.maxY, 2)}]</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Start Point:</span>
                <span class="prop-value">(${formatNumber(controlPoints[0].x, 3)}, ${formatNumber(controlPoints[0].y, 3)}) = P₀</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">End Point:</span>
                <span class="prop-value">(${formatNumber(controlPoints[degree].x, 3)}, ${formatNumber(controlPoints[degree].y, 3)}) = P${subscript(degree)}</span>
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
                <span class="cs-t">t = ${formatNumber(pt.t, 2)}</span>
                <span class="cs-point">(${formatNumber(pt.x, 4)}, ${formatNumber(pt.y, 4)})</span>
            </div>
        `;
    });

    html += `</div></div>`;
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
    loadSample('cubic');
});
