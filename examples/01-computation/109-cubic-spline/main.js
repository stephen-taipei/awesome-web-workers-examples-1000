/**
 * Main script for Cubic Spline Interpolation
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
    document.getElementById('manualInput').style.display = source === 'manual' ? 'block' : 'none';
    document.getElementById('sampleInput').style.display = source === 'manual' ? 'none' : 'block';
}

document.getElementById('boundaryType').addEventListener('change', function() {
    document.getElementById('clampedInputs').style.display =
        this.value === 'clamped' ? 'block' : 'none';
});

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
    if (container.children.length > 3) {
        btn.parentElement.remove();
    }
}

function loadSample(type) {
    document.getElementById('dataSource').value = 'manual';
    updateDataSource();

    const samples = {
        'simple': [
            { x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 3 }
        ],
        'wave': [
            { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 },
            { x: 3, y: -1 }, { x: 4, y: 0 }, { x: 5, y: 1 }
        ],
        'runge5': [
            { x: -2, y: 1/5 }, { x: -1, y: 0.5 }, { x: 0, y: 1 },
            { x: 1, y: 0.5 }, { x: 2, y: 1/5 }
        ],
        'runge9': [
            { x: -4, y: 1/17 }, { x: -3, y: 0.1 }, { x: -2, y: 0.2 },
            { x: -1, y: 0.5 }, { x: 0, y: 1 }, { x: 1, y: 0.5 },
            { x: 2, y: 0.2 }, { x: 3, y: 0.1 }, { x: 4, y: 1/17 }
        ]
    };

    const points = samples[type];
    setDataPoints(points);

    const xMin = Math.min(...points.map(p => p.x));
    const xMax = Math.max(...points.map(p => p.x));
    const margin = (xMax - xMin) * 0.15;
    document.getElementById('rangeStart').value = (xMin - margin).toFixed(2);
    document.getElementById('rangeEnd').value = (xMax + margin).toFixed(2);
    document.getElementById('evalPoint').value = ((xMin + xMax) / 2).toFixed(2);
}

function setDataPoints(points) {
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

        switch (source) {
            case 'sin':
                for (let i = 0; i < n; i++) {
                    const x = i * 2 * Math.PI / (n - 1);
                    points.push({ x, y: Math.sin(x) });
                }
                break;
            case 'exp':
                for (let i = 0; i < n; i++) {
                    const x = -1 + i * 2 / (n - 1);
                    points.push({ x, y: Math.exp(x) });
                }
                break;
            case 'polynomial':
                for (let i = 0; i < n; i++) {
                    const x = -2 + i * 4 / (n - 1);
                    points.push({ x, y: x * x * x - 2 * x + 1 });
                }
                break;
            case 'runge':
                for (let i = 0; i < n; i++) {
                    const x = -5 + i * 10 / (n - 1);
                    points.push({ x, y: 1 / (1 + x * x) });
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
    const boundaryType = document.getElementById('boundaryType').value;
    const leftDerivative = parseFloat(document.getElementById('leftDerivative').value) || 0;
    const rightDerivative = parseFloat(document.getElementById('rightDerivative').value) || 0;

    if (points.length < 3) {
        displayError('Need at least 3 data points');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { points, evalPoint, rangeStart, rangeEnd, boundaryType,
                leftDerivative, rightDerivative, originalFunction }
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
    const { points, splineCoeffs, secondDerivatives, intervals, interpolatedValue,
            evalPoint, errorAnalysis, boundaryType, numIntervals } = result;

    const boundaryNames = {
        'natural': 'Natural (S\'\'=0 at endpoints)',
        'clamped': 'Clamped (specified derivatives)',
        'notaknot': 'Not-a-Knot'
    };

    let html = `
        <div class="result-card">
            <h3>Cubic Spline Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${numIntervals} Cubic Segments</div>
                <div class="method-info">${boundaryNames[boundaryType]}</div>
            </div>

            <div class="interpolation-result">
                <div class="ir-label">S(${formatNumber(evalPoint, 4)}) =</div>
                <div class="ir-value">${formatNumber(interpolatedValue, 10)}</div>
            </div>

            <h4>Data Points</h4>
            <div class="data-points-display">
    `;

    points.forEach((p, i) => {
        html += `
            <div class="dp-item">
                <span class="dp-index">${i}</span>
                <span class="dp-coord">(${formatNumber(p.x, 4)}, ${formatNumber(p.y, 4)})</span>
            </div>
        `;
    });

    html += `</div>`;

    // Second derivatives table
    html += `
        <h4>Second Derivatives (M = S'')</h4>
        <div class="derivatives-table">
            <table class="coeff-table">
                <tr>
                    <th>i</th>
                    <th>xᵢ</th>
                    <th>Mᵢ = S''(xᵢ)</th>
                </tr>
    `;

    for (let i = 0; i < points.length; i++) {
        html += `
            <tr>
                <td>${i}</td>
                <td>${formatNumber(points[i].x, 4)}</td>
                <td>${formatNumber(secondDerivatives[i], 8)}</td>
            </tr>
        `;
    }

    html += `</table></div>`;

    // Spline coefficients
    html += `
        <h4>Spline Coefficients</h4>
        <div class="spline-coeffs">
    `;

    splineCoeffs.forEach((coeff, i) => {
        html += `
            <div class="spline-segment">
                <div class="segment-header">
                    <span class="segment-label">S${subscript(i)}(x)</span>
                    <span class="segment-range">[${formatNumber(coeff.x0, 3)}, ${formatNumber(coeff.x1, 3)}]</span>
                </div>
                <div class="segment-formula">
                    ${formatNumber(coeff.a, 6)} ${formatCoeff(coeff.b, 'x-' + formatNumber(coeff.x0, 3))}
                    ${formatCoeff(coeff.c, '(x-' + formatNumber(coeff.x0, 3) + ')²')}
                    ${formatCoeff(coeff.d, '(x-' + formatNumber(coeff.x0, 3) + ')³')}
                </div>
            </div>
        `;
    });

    html += `</div>`;

    // Evaluation breakdown
    const segmentIndex = findSegmentIndex(points, evalPoint);
    const coeff = splineCoeffs[segmentIndex];
    const dx = evalPoint - coeff.x0;

    html += `
        <h4>Evaluation at x = ${formatNumber(evalPoint, 4)}</h4>
        <div class="eval-breakdown">
            <div class="eb-row">
                <span class="eb-label">Segment:</span>
                <span class="eb-value">S${subscript(segmentIndex)} for [${formatNumber(coeff.x0, 3)}, ${formatNumber(coeff.x1, 3)}]</span>
            </div>
            <div class="eb-row">
                <span class="eb-label">dx = x - x${subscript(segmentIndex)}:</span>
                <span class="eb-value">${formatNumber(dx, 6)}</span>
            </div>
            <div class="eb-row">
                <span class="eb-label">a${subscript(segmentIndex)}:</span>
                <span class="eb-value">${formatNumber(coeff.a, 8)}</span>
            </div>
            <div class="eb-row">
                <span class="eb-label">b${subscript(segmentIndex)} × dx:</span>
                <span class="eb-value">${formatNumber(coeff.b * dx, 8)}</span>
            </div>
            <div class="eb-row">
                <span class="eb-label">c${subscript(segmentIndex)} × dx²:</span>
                <span class="eb-value">${formatNumber(coeff.c * dx * dx, 8)}</span>
            </div>
            <div class="eb-row">
                <span class="eb-label">d${subscript(segmentIndex)} × dx³:</span>
                <span class="eb-value">${formatNumber(coeff.d * dx * dx * dx, 8)}</span>
            </div>
            <div class="eb-row total">
                <span class="eb-label">S(${formatNumber(evalPoint, 4)}):</span>
                <span class="eb-value">${formatNumber(interpolatedValue, 10)}</span>
            </div>
        </div>
    `;

    // Error analysis
    if (errorAnalysis) {
        html += `
            <h4>Error Analysis</h4>
            <div class="error-analysis">
                <div class="ea-item">
                    <span class="ea-label">Max Error:</span>
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

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function findSegmentIndex(points, x) {
    const n = points.length;
    if (x <= points[0].x) return 0;
    if (x >= points[n - 1].x) return n - 2;
    for (let i = 0; i < n - 1; i++) {
        if (x >= points[i].x && x < points[i + 1].x) return i;
    }
    return n - 2;
}

function formatCoeff(coeff, term) {
    if (Math.abs(coeff) < 1e-10) return '';
    const sign = coeff >= 0 ? '+' : '-';
    return `${sign} ${formatNumber(Math.abs(coeff), 6)}${term}`;
}

function subscript(n) {
    const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(n).split('').map(d => subs[parseInt(d)] || d).join('');
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
    loadSample('simple');
});
