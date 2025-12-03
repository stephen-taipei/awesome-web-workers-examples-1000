/**
 * Main Thread: Numerical Differentiation
 */

const worker = new Worker('worker.js');
const resultsDiv = document.getElementById('results');
const progressDiv = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const calculateBtn = document.getElementById('calculateBtn');

worker.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'progress') {
        progressDiv.style.display = 'block';
        progressBar.style.width = e.data.percentage + '%';
        progressText.textContent = `Processing: ${e.data.percentage}%`;
    } else if (type === 'result') {
        displayResult(e.data);
        calculateBtn.disabled = false;
        progressDiv.style.display = 'none';
    } else if (type === 'error') {
        resultsDiv.innerHTML = `<div class="error">Error: ${e.data.message}</div>`;
        calculateBtn.disabled = false;
        progressDiv.style.display = 'none';
    }
};

function calculate() {
    const calcType = document.getElementById('calcType').value;
    const values = parseValues();

    if (!values) return;

    const h = parseFloat(document.getElementById('stepSize').value) || 0.1;
    const order = parseInt(document.getElementById('maxOrder').value) || 4;

    calculateBtn.disabled = true;
    resultsDiv.innerHTML = '<p>Calculating...</p>';

    worker.postMessage({ type: calcType, data: { values, h, order } });
}

function parseValues() {
    const input = document.getElementById('dataValues').value.trim();
    const values = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (values.length < 5) {
        resultsDiv.innerHTML = '<div class="error">Need at least 5 data points</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return values;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Differentiation Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'forward':
        case 'backward':
        case 'central':
            html += displaySingleMethod(result);
            break;
        case 'higherorder':
            html += displayHigherOrder(result);
            break;
        case 'richardson':
            html += displayRichardson(result);
            break;
        case 'compare':
            html += displayComparison(result);
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    setTimeout(() => {
        switch (calculationType) {
            case 'forward':
            case 'backward':
            case 'central':
                drawDerivativeChart(result);
                break;
            case 'higherorder':
                drawHigherOrderChart(result);
                break;
            case 'richardson':
                drawRichardsonChart(result);
                break;
            case 'compare':
                drawComparisonChart(result);
                break;
        }
    }, 100);
}

function displaySingleMethod(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Accuracy: ${result.accuracy}</div>
        </div>

        <h4>Formula</h4>
        <div class="formula-box">${result.formula}</div>

        <h4>Original vs Derivative</h4>
        <div class="chart-container"><canvas id="derivChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Step Size (h)</span>
                <span class="stat-value">${result.h}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Min</span>
                <span class="stat-value">${result.stats.min}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Max</span>
                <span class="stat-value">${result.stats.max}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Mean</span>
                <span class="stat-value">${result.stats.mean}</span>
            </div>
        </div>`;
}

function displayHigherOrder(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Up to order ${result.maxOrder}</div>
        </div>

        <h4>Derivatives</h4>
        <div class="chart-container"><canvas id="derivChart"></canvas></div>

        <h4>Statistics by Order</h4>
        <div class="order-stats">
            ${result.stats.map(s => `
                <div class="order-stat-item">
                    <span class="order-label">${result.labels[s.order]}</span>
                    <span class="order-range">Range: [${s.min}, ${s.max}]</span>
                    <span class="order-rms">RMS: ${s.rms}</span>
                </div>
            `).join('')}
        </div>`;
}

function displayRichardson(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">${result.accuracy}</div>
        </div>

        <h4>Formula</h4>
        <div class="formula-box">${result.formula}</div>

        <h4>Comparison: Standard vs Richardson</h4>
        <div class="chart-container"><canvas id="derivChart"></canvas></div>

        <h4>Accuracy Comparison</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Central (h)</span>
                <span class="stat-value">O(h²)</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Richardson</span>
                <span class="stat-value">O(h⁴)</span>
            </div>
        </div>

        <div class="dual-stats">
            <div class="stats-column">
                <h5>Central Difference</h5>
                <p>Min: ${result.stats.h.min}</p>
                <p>Max: ${result.stats.h.max}</p>
                <p>RMS: ${result.stats.h.rms}</p>
            </div>
            <div class="stats-column">
                <h5>Richardson</h5>
                <p>Min: ${result.stats.richardson.min}</p>
                <p>Max: ${result.stats.richardson.max}</p>
                <p>RMS: ${result.stats.richardson.rms}</p>
            </div>
        </div>`;
}

function displayComparison(result) {
    const methods = result.methods;

    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Step size h = ${result.h}</div>
        </div>

        <h4>All Methods</h4>
        <div class="chart-container"><canvas id="derivChart"></canvas></div>

        <h4>Method Details</h4>
        <table class="method-table">
            <tr>
                <th>Method</th>
                <th>Accuracy</th>
                <th>Min</th>
                <th>Max</th>
                <th>RMS</th>
            </tr>
            ${Object.entries(methods).map(([key, m]) => `
                <tr>
                    <td>${m.name}</td>
                    <td>${m.accuracy}</td>
                    <td>${result.comparison[key].min}</td>
                    <td>${result.comparison[key].max}</td>
                    <td>${result.comparison[key].rms}</td>
                </tr>
            `).join('')}
        </table>`;
}

function drawDerivativeChart(result) {
    const canvas = document.getElementById('derivChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const original = result.original;
    const derivative = result.derivative;
    const n = original.length;

    // Draw original
    const origMin = Math.min(...original);
    const origMax = Math.max(...original);
    const origRange = origMax - origMin || 1;

    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = padding.left + (i / (n - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((original[i] - origMin) / origRange) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw derivative
    const derivValid = derivative.filter(v => isFinite(v));
    const derivMin = Math.min(...derivValid);
    const derivMax = Math.max(...derivValid);
    const derivRange = derivMax - derivMin || 1;

    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
        if (!isFinite(derivative[i])) continue;
        const x = padding.left + (i / (n - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((derivative[i] - derivMin) / derivRange) * chartHeight;
        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Legend
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('f(x)', padding.left + 10, 15);
    ctx.fillStyle = '#c0392b';
    ctx.fillText("f'(x)", padding.left + 50, 15);
}

function drawHigherOrderChart(result) {
    const canvas = document.getElementById('derivChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 300;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const colors = ['#95a5a6', '#c0392b', '#2980b9', '#27ae60', '#8e44ad'];
    const derivatives = result.derivatives;
    const n = derivatives[0].length;

    derivatives.forEach((deriv, order) => {
        const valid = deriv.filter(v => isFinite(v));
        if (valid.length === 0) return;

        const min = Math.min(...valid);
        const max = Math.max(...valid);
        const range = max - min || 1;

        ctx.strokeStyle = colors[order % colors.length];
        ctx.lineWidth = order === 0 ? 1.5 : 2;
        ctx.beginPath();

        let started = false;
        for (let i = 0; i < n; i++) {
            if (!isFinite(deriv[i])) continue;
            const x = padding.left + (i / (n - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((deriv[i] - min) / range) * chartHeight;
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    });

    // Legend
    ctx.font = '10px sans-serif';
    result.labels.forEach((label, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillText(label, padding.left + 10 + i * 50, 15);
    });
}

function drawRichardsonChart(result) {
    const canvas = document.getElementById('derivChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const dh = result.derivativeH;
    const dr = result.derivativeRichardson;
    const n = dh.length;

    const allValid = [...dh, ...dr].filter(v => isFinite(v));
    const min = Math.min(...allValid);
    const max = Math.max(...allValid);
    const range = max - min || 1;

    // Draw central difference
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
        if (!isFinite(dh[i])) continue;
        const x = padding.left + (i / (n - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((dh[i] - min) / range) * chartHeight;
        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw Richardson
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    started = false;
    for (let i = 0; i < n; i++) {
        if (!isFinite(dr[i])) continue;
        const x = padding.left + (i / (n - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((dr[i] - min) / range) * chartHeight;
        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('Central O(h²)', padding.left + 10, 15);
    ctx.fillStyle = '#c0392b';
    ctx.fillText('Richardson O(h⁴)', padding.left + 100, 15);
}

function drawComparisonChart(result) {
    const canvas = document.getElementById('derivChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 280;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const methods = result.methods;
    const colors = {
        forward: '#e74c3c',
        backward: '#3498db',
        central: '#27ae60',
        fivePoint: '#9b59b6'
    };

    const n = result.original.length;

    // Find global range
    const allValues = Object.values(methods).flatMap(m => m.values.filter(v => isFinite(v)));
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min || 1;

    Object.entries(methods).forEach(([key, method]) => {
        ctx.strokeStyle = colors[key];
        ctx.lineWidth = key === 'fivePoint' ? 2.5 : 1.5;

        ctx.beginPath();
        let started = false;
        for (let i = 0; i < n; i++) {
            if (!isFinite(method.values[i])) continue;
            const x = padding.left + (i / (n - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((method.values[i] - min) / range) * chartHeight;
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    });

    // Legend
    ctx.font = '10px sans-serif';
    let xPos = padding.left + 10;
    Object.entries(methods).forEach(([key, method]) => {
        ctx.fillStyle = colors[key];
        ctx.fillText(method.name.split(' ')[0], xPos, 15);
        xPos += 60;
    });
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('orderGroup').style.display =
        calcType === 'higherorder' ? 'block' : 'none';
}

function loadSample(type) {
    const n = 100;
    let values;

    if (type === 'sine') {
        values = Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * i / n));
    } else if (type === 'polynomial') {
        values = Array.from({ length: n }, (_, i) => {
            const x = (i - n / 2) / 10;
            return x * x * x - 2 * x * x + x;
        });
    } else if (type === 'exponential') {
        values = Array.from({ length: n }, (_, i) => Math.exp(-i / 20));
    } else if (type === 'gaussian') {
        values = Array.from({ length: n }, (_, i) => {
            const x = (i - n / 2) / 10;
            return Math.exp(-x * x / 2);
        });
    }

    document.getElementById('dataValues').value = values.map(v => v.toFixed(6)).join(', ');
}

// Initialize
updateOptions();
