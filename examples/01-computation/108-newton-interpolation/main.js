/**
 * Main script for Newton Interpolation
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
        'cubic': [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 0 }, { x: 3, y: 3 }],
        'sin5': [
            { x: 0, y: 0 },
            { x: Math.PI / 4, y: Math.sin(Math.PI / 4) },
            { x: Math.PI / 2, y: 1 },
            { x: 3 * Math.PI / 4, y: Math.sin(3 * Math.PI / 4) },
            { x: Math.PI, y: 0 }
        ]
    };

    const points = samples[type];
    setDataPoints(points);

    const xMin = Math.min(...points.map(p => p.x));
    const xMax = Math.max(...points.map(p => p.x));
    const margin = (xMax - xMin) * 0.2;
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
                    const x = i * Math.PI / (n - 1);
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
            case 'sqrt':
                for (let i = 0; i < n; i++) {
                    const x = i * 4 / (n - 1);
                    points.push({ x, y: Math.sqrt(x) });
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

    if (points.length < 2) {
        displayError('Need at least 2 data points');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { points, evalPoint, rangeStart, rangeEnd, originalFunction }
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
    const { points, divDiffTable, coefficients, interpolatedValue, evalPoint,
            curvePoints, standardCoeffs, errorAnalysis, degree } = result;

    let html = `
        <div class="result-card">
            <h3>Newton Interpolation Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">Polynomial of Degree ${degree}</div>
                <div class="method-info">${points.length} data points using Newton's divided differences</div>
            </div>

            <div class="interpolation-result">
                <div class="ir-label">P(${formatNumber(evalPoint, 4)}) =</div>
                <div class="ir-value">${formatNumber(interpolatedValue, 10)}</div>
            </div>

            <h4>Divided Difference Table</h4>
            <div class="table-container">
                <table class="dd-table">
                    <tr>
                        <th>xᵢ</th>
                        <th>f[xᵢ]</th>
    `;

    for (let j = 1; j < points.length; j++) {
        html += `<th>f[${j > 1 ? '..,' : ''}${j}${j > 1 ? 'th' : 'st'}]</th>`;
    }
    html += `</tr>`;

    for (let i = 0; i < points.length; i++) {
        html += `<tr><td>${formatNumber(points[i].x, 4)}</td>`;
        for (let j = 0; j < points.length - i; j++) {
            const isCoeff = i === 0;
            html += `<td class="${isCoeff ? 'coeff' : ''}">${formatNumber(divDiffTable[i][j], 6)}</td>`;
        }
        for (let j = 0; j < i; j++) {
            html += `<td></td>`;
        }
        html += `</tr>`;
    }

    html += `
                </table>
            </div>
            <div class="table-note">* First row values (highlighted) are the Newton coefficients</div>
    `;

    // Newton form polynomial
    html += `
        <h4>Newton Form</h4>
        <div class="polynomial-display">
            <div class="poly-expr">P(x) = ${formatNewtonForm(points, coefficients)}</div>
        </div>
    `;

    // Standard form polynomial
    html += `
        <h4>Standard Form</h4>
        <div class="polynomial-display">
            <div class="poly-expr">P(x) = ${formatPolynomial(standardCoeffs)}</div>
        </div>
    `;

    // Evaluation using Horner's method
    html += `
        <h4>Evaluation at x = ${formatNumber(evalPoint, 4)}</h4>
        <div class="horner-display">
            <div class="horner-title">Using Horner's Method (Nested Multiplication):</div>
            <div class="horner-steps">
    `;

    let hornerResult = coefficients[coefficients.length - 1];
    html += `<div class="horner-step">Start: ${formatNumber(hornerResult, 8)}</div>`;

    for (let i = coefficients.length - 2; i >= 0; i--) {
        const prev = hornerResult;
        hornerResult = hornerResult * (evalPoint - points[i].x) + coefficients[i];
        html += `<div class="horner-step">${formatNumber(prev, 6)} × (${formatNumber(evalPoint, 4)} - ${formatNumber(points[i].x, 4)}) + ${formatNumber(coefficients[i], 6)} = ${formatNumber(hornerResult, 8)}</div>`;
    }

    html += `
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

function formatNewtonForm(points, coeffs) {
    const terms = [];
    terms.push(formatNumber(coeffs[0], 4));

    for (let i = 1; i < coeffs.length; i++) {
        if (Math.abs(coeffs[i]) < 1e-10) continue;

        let term = formatNumber(coeffs[i], 4);
        for (let j = 0; j < i; j++) {
            const xj = points[j].x;
            if (xj === 0) {
                term += '·x';
            } else if (xj > 0) {
                term += `·(x - ${formatNumber(xj, 4)})`;
            } else {
                term += `·(x + ${formatNumber(-xj, 4)})`;
            }
        }

        if (coeffs[i] > 0) {
            terms.push('+ ' + term);
        } else {
            terms.push(term);
        }
    }

    return terms.join(' ');
}

function formatPolynomial(coeffs) {
    const terms = [];
    const n = coeffs.length;

    for (let i = n - 1; i >= 0; i--) {
        const c = coeffs[i];
        if (Math.abs(c) < 1e-10) continue;

        let term = '';
        if (i === 0) {
            term = formatNumber(c, 4);
        } else if (i === 1) {
            term = formatNumber(c, 4) + 'x';
        } else {
            term = formatNumber(c, 4) + 'x' + superscript(i);
        }

        if (terms.length > 0 && c > 0) {
            term = '+ ' + term;
        }
        terms.push(term);
    }

    return terms.length > 0 ? terms.join(' ') : '0';
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
