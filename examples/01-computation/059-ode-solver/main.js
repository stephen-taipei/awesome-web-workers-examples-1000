/**
 * Main Thread: ODE Solver
 * Handles UI and communicates with Web Worker
 */

const worker = new Worker('worker.js');

// Handle worker messages
worker.onmessage = function(e) {
    const { type, calculationType, result, executionTime, message, percentage } = e.data;

    if (type === 'progress') {
        updateProgress(percentage);
    } else if (type === 'result') {
        hideProgress();
        displayResult(calculationType, result, executionTime);
    } else if (type === 'error') {
        hideProgress();
        displayError(message);
    }
};

// Update UI based on calculation type
function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    const toleranceGroup = document.getElementById('toleranceGroup');
    const stepSizeGroup = document.getElementById('stepSizeGroup');
    const systemGroup = document.getElementById('systemGroup');
    const singleGroup = document.getElementById('singleGroup');

    toleranceGroup.style.display = 'none';
    stepSizeGroup.style.display = 'block';
    systemGroup.style.display = 'none';
    singleGroup.style.display = 'block';

    if (calcType === 'rk45') {
        toleranceGroup.style.display = 'block';
        stepSizeGroup.style.display = 'none';
    } else if (calcType === 'system') {
        systemGroup.style.display = 'block';
        singleGroup.style.display = 'none';
    }
}

// Load sample problems
function loadSample(type) {
    const equation = document.getElementById('equation');
    const y0Input = document.getElementById('y0');
    const t0Input = document.getElementById('t0');
    const tEndInput = document.getElementById('tEnd');

    switch (type) {
        case 'exponential':
            equation.value = 'y';  // dy/dt = y -> y = e^t
            y0Input.value = '1';
            t0Input.value = '0';
            tEndInput.value = '3';
            break;
        case 'decay':
            equation.value = '-0.5 * y';  // dy/dt = -0.5y -> y = e^(-0.5t)
            y0Input.value = '10';
            t0Input.value = '0';
            tEndInput.value = '10';
            break;
        case 'sine':
            equation.value = 'cos(t)';  // dy/dt = cos(t) -> y = sin(t)
            y0Input.value = '0';
            t0Input.value = '0';
            tEndInput.value = '10';
            break;
        case 'logistic':
            equation.value = 'y * (1 - y)';  // Logistic growth
            y0Input.value = '0.1';
            t0Input.value = '0';
            tEndInput.value = '10';
            break;
        case 'stiff':
            equation.value = '-15 * y';  // Stiff equation
            y0Input.value = '1';
            t0Input.value = '0';
            tEndInput.value = '2';
            break;
        case 'oscillator':
            // For system: simple harmonic oscillator
            document.getElementById('calcType').value = 'system';
            updateOptions();
            document.getElementById('equations').value = 'y[1]\n-y[0]';
            document.getElementById('y0System').value = '1, 0';
            t0Input.value = '0';
            tEndInput.value = '20';
            return;
        case 'vanderpol':
            // Van der Pol oscillator
            document.getElementById('calcType').value = 'system';
            updateOptions();
            document.getElementById('equations').value = 'y[1]\n(1 - y[0]*y[0]) * y[1] - y[0]';
            document.getElementById('y0System').value = '2, 0';
            t0Input.value = '0';
            tEndInput.value = '30';
            return;
        case 'lorenz':
            // Simplified Lorenz (2D projection)
            document.getElementById('calcType').value = 'system';
            updateOptions();
            document.getElementById('equations').value = '10 * (y[1] - y[0])\n28 * y[0] - y[1] - y[0] * y[2]\n-2.667 * y[2] + y[0] * y[1]';
            document.getElementById('y0System').value = '1, 1, 1';
            t0Input.value = '0';
            tEndInput.value = '50';
            return;
    }
}

// Perform calculation
function calculate() {
    const calcType = document.getElementById('calcType').value;
    const t0 = parseFloat(document.getElementById('t0').value);
    const tEnd = parseFloat(document.getElementById('tEnd').value);

    if (isNaN(t0) || isNaN(tEnd) || t0 >= tEnd) {
        displayError('Please enter valid time bounds (t0 < tEnd)');
        return;
    }

    showProgress();

    let data = { t0, tEnd };

    if (calcType === 'system') {
        const equationsStr = document.getElementById('equations').value.trim();
        const y0Str = document.getElementById('y0System').value.trim();

        if (!equationsStr) {
            hideProgress();
            displayError('Please enter system equations');
            return;
        }

        data.equations = equationsStr.split('\n').map(s => s.trim()).filter(s => s);
        data.y0 = y0Str.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        data.h = parseFloat(document.getElementById('stepSize').value) || 0.01;

        if (data.equations.length !== data.y0.length) {
            hideProgress();
            displayError('Number of equations must match number of initial values');
            return;
        }
    } else {
        const equation = document.getElementById('equation').value.trim();
        const y0 = parseFloat(document.getElementById('y0').value);

        if (!equation) {
            hideProgress();
            displayError('Please enter the differential equation dy/dt = f(t, y)');
            return;
        }

        if (isNaN(y0)) {
            hideProgress();
            displayError('Please enter a valid initial value y0');
            return;
        }

        data.f = equation;
        data.y0 = y0;

        if (calcType === 'rk45') {
            data.tolerance = parseFloat(document.getElementById('tolerance').value) || 1e-6;
        } else {
            data.h = parseFloat(document.getElementById('stepSize').value) || 0.01;
        }
    }

    worker.postMessage({ type: calcType, data });
}

// Progress UI
function showProgress() {
    document.getElementById('progress').style.display = 'block';
    document.getElementById('calculateBtn').disabled = true;
    updateProgress(0);
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
    document.getElementById('calculateBtn').disabled = false;
}

function updateProgress(percentage) {
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Processing... ${percentage}%`;
}

// Display results
function displayResult(calcType, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card">
            <h3>ODE Solution</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.method}</div>
                <div class="method-info">${result.accuracy}</div>
            </div>
    `;

    if (result.formula) {
        html += `<div class="formula-box">${result.formula}</div>`;
    }

    if (calcType === 'compare') {
        html += displayComparison(result);
    } else if (calcType === 'system') {
        html += displaySystem(result);
    } else {
        html += displayStandard(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw charts
    if (calcType === 'compare') {
        setTimeout(() => drawComparisonChart(result), 100);
    } else if (calcType === 'system') {
        setTimeout(() => drawSystemChart(result), 100);
    } else {
        setTimeout(() => drawSolutionChart(result), 100);
    }
}

function displayStandard(result) {
    let html = `
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Equation</span>
                <span class="stat-value">dy/dt = ${result.equation}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Initial Value</span>
                <span class="stat-value">y(${result.t0}) = ${result.y0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Time Interval</span>
                <span class="stat-value">[${result.t0}, ${result.tEnd}]</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Steps</span>
                <span class="stat-value">${result.steps}</span>
            </div>
    `;

    if (result.h) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Step Size</span>
                <span class="stat-value">${result.h}</span>
            </div>
        `;
    }

    if (result.avgStepSize) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Avg Step Size</span>
                <span class="stat-value">${result.avgStepSize.toFixed(6)}</span>
            </div>
        `;
    }

    // Final value
    const finalY = result.y[result.y.length - 1];
    html += `
            <div class="stat-item highlight">
                <span class="stat-label">Final Value</span>
                <span class="stat-value">y(${result.tEnd}) = ${formatNumber(finalY)}</span>
            </div>
        </div>
    `;

    html += '<div class="chart-container"><canvas id="solutionChart" width="800" height="350"></canvas></div>';

    // Show sample data points
    html += '<h4>Sample Solution Points</h4>';
    html += '<div class="table-container"><table class="method-table">';
    html += '<tr><th>t</th><th>y(t)</th></tr>';

    const step = Math.max(1, Math.floor(result.t.length / 10));
    for (let i = 0; i < result.t.length; i += step) {
        html += `<tr><td>${result.t[i].toFixed(4)}</td><td>${formatNumber(result.y[i])}</td></tr>`;
    }
    html += '</table></div>';

    return html;
}

function displaySystem(result) {
    let html = `
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Equations</span>
                <span class="stat-value">${result.numEquations} ODEs</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Time Interval</span>
                <span class="stat-value">[${result.t0}, ${result.tEnd}]</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Steps</span>
                <span class="stat-value">${result.steps}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Step Size</span>
                <span class="stat-value">${result.h}</span>
            </div>
        </div>
    `;

    html += '<h4>System of Equations</h4>';
    html += '<div class="equations-list">';
    for (let i = 0; i < result.equations.length; i++) {
        html += `<div class="equation-item">dy${i}/dt = ${result.equations[i]}</div>`;
    }
    html += '</div>';

    html += '<div class="chart-container"><canvas id="systemChart" width="800" height="350"></canvas></div>';

    // Phase portrait for 2D systems
    if (result.numEquations >= 2) {
        html += '<h4>Phase Portrait</h4>';
        html += '<div class="chart-container"><canvas id="phaseChart" width="400" height="400"></canvas></div>';
    }

    return html;
}

function displayComparison(result) {
    let html = `
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Equation</span>
                <span class="stat-value">dy/dt = ${result.equation}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Initial Value</span>
                <span class="stat-value">y(${result.t0}) = ${result.y0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Time Interval</span>
                <span class="stat-value">[${result.t0}, ${result.tEnd}]</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Step Size</span>
                <span class="stat-value">${result.h}</span>
            </div>
        </div>
    `;

    html += '<h4>Method Comparison</h4>';
    html += '<table class="method-table">';
    html += '<tr><th>Method</th><th>Accuracy</th><th>Final Value</th></tr>';

    const methods = [
        { key: 'euler', name: "Euler's Method" },
        { key: 'midpoint', name: 'Midpoint Method' },
        { key: 'heun', name: "Heun's Method" },
        { key: 'rk4', name: 'Runge-Kutta 4' }
    ];

    for (const m of methods) {
        const data = result.results[m.key];
        const finalY = data.y[data.y.length - 1];
        html += `<tr>
            <td>${m.name}</td>
            <td>${data.accuracy}</td>
            <td>${formatNumber(finalY)}</td>
        </tr>`;
    }
    html += '</table>';

    html += '<div class="chart-container"><canvas id="comparisonChart" width="800" height="350"></canvas></div>';

    return html;
}

// Draw solution chart
function drawSolutionChart(result) {
    const canvas = document.getElementById('solutionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    const t = result.t;
    const y = result.y;

    // Find ranges
    const minT = Math.min(...t);
    const maxT = Math.max(...t);
    let minY = Math.min(...y);
    let maxY = Math.max(...y);
    const rangeY = maxY - minY || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    // Scale functions
    const scaleX = (ti) => padding + ((ti - minT) / (maxT - minT)) * (width - 2 * padding);
    const scaleY = (yi) => height - padding - ((yi - minY) / (maxY - minY)) * (height - 2 * padding);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const yPos = padding + (i / 5) * (height - 2 * padding);
        ctx.beginPath();
        ctx.moveTo(padding, yPos);
        ctx.lineTo(width - padding, yPos);
        ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw y=0 line if in range
    if (minY < 0 && maxY > 0) {
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, scaleY(0));
        ctx.lineTo(width - padding, scaleY(0));
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw solution curve
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(scaleX(t[0]), scaleY(y[0]));
    for (let i = 1; i < t.length; i++) {
        ctx.lineTo(scaleX(t[i]), scaleY(y[i]));
    }
    ctx.stroke();

    // Draw initial point
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(scaleX(t[0]), scaleY(y[0]), 6, 0, 2 * Math.PI);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // X-axis labels
    for (let i = 0; i <= 4; i++) {
        const ti = minT + (i / 4) * (maxT - minT);
        ctx.fillText(ti.toFixed(2), scaleX(ti), height - padding + 20);
    }
    ctx.fillText('t', width / 2, height - 10);

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const yi = minY + (i / 4) * (maxY - minY);
        ctx.fillText(yi.toFixed(2), padding - 10, scaleY(yi) + 4);
    }

    // Title
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Solution y(t)', width / 2, 20);
}

// Draw system chart
function drawSystemChart(result) {
    const canvas = document.getElementById('systemChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    const t = result.t;
    const y = result.y;
    const n = result.numEquations;

    // Find ranges
    const minT = Math.min(...t);
    const maxT = Math.max(...t);
    let minY = Infinity, maxY = -Infinity;
    for (const yi of y) {
        for (const val of yi) {
            minY = Math.min(minY, val);
            maxY = Math.max(maxY, val);
        }
    }
    const rangeY = maxY - minY || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    // Scale functions
    const scaleX = (ti) => padding + ((ti - minT) / (maxT - minT)) * (width - 2 * padding);
    const scaleY = (yi) => height - padding - ((yi - minY) / (maxY - minY)) * (height - 2 * padding);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Colors for each variable
    const colors = ['#e74c3c', '#3498db', '#27ae60', '#f39c12', '#9b59b6'];

    // Draw each variable
    for (let j = 0; j < n; j++) {
        ctx.strokeStyle = colors[j % colors.length];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scaleX(t[0]), scaleY(y[0][j]));
        for (let i = 1; i < t.length; i++) {
            ctx.lineTo(scaleX(t[i]), scaleY(y[i][j]));
        }
        ctx.stroke();
    }

    // Legend
    ctx.font = '12px Arial';
    for (let j = 0; j < n; j++) {
        ctx.fillStyle = colors[j % colors.length];
        ctx.fillRect(width - padding - 60, padding + j * 20, 15, 10);
        ctx.fillStyle = '#333';
        ctx.fillText(`y${j}`, width - padding - 40, padding + j * 20 + 9);
    }

    // Draw phase portrait for 2D+ systems
    if (n >= 2) {
        drawPhasePortrait(result);
    }
}

// Draw phase portrait
function drawPhasePortrait(result) {
    const canvas = document.getElementById('phaseChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const padding = 50;

    ctx.clearRect(0, 0, size, size);

    const y = result.y;

    // Get y0 and y1 values
    const y0 = y.map(yi => yi[0]);
    const y1 = y.map(yi => yi[1]);

    let minY0 = Math.min(...y0), maxY0 = Math.max(...y0);
    let minY1 = Math.min(...y1), maxY1 = Math.max(...y1);

    const range0 = maxY0 - minY0 || 1;
    const range1 = maxY1 - minY1 || 1;
    minY0 -= range0 * 0.1; maxY0 += range0 * 0.1;
    minY1 -= range1 * 0.1; maxY1 += range1 * 0.1;

    const scaleX = (v) => padding + ((v - minY0) / (maxY0 - minY0)) * (size - 2 * padding);
    const scaleY = (v) => size - padding - ((v - minY1) / (maxY1 - minY1)) * (size - 2 * padding);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, size - padding);
    ctx.lineTo(size - padding, size - padding);
    ctx.stroke();

    // Draw trajectory
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX(y0[0]), scaleY(y1[0]));
    for (let i = 1; i < y0.length; i++) {
        ctx.lineTo(scaleX(y0[i]), scaleY(y1[i]));
    }
    ctx.stroke();

    // Initial point
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(scaleX(y0[0]), scaleY(y1[0]), 6, 0, 2 * Math.PI);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('y₀', size / 2, size - 10);
    ctx.save();
    ctx.translate(15, size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('y₁', 0, 0);
    ctx.restore();
}

// Draw comparison chart
function drawComparisonChart(result) {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    const methods = ['euler', 'midpoint', 'heun', 'rk4'];
    const colors = { euler: '#e74c3c', midpoint: '#3498db', heun: '#f39c12', rk4: '#27ae60' };
    const names = { euler: 'Euler', midpoint: 'Midpoint', heun: 'Heun', rk4: 'RK4' };

    // Find global ranges
    let minT = Infinity, maxT = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const m of methods) {
        const data = result.results[m];
        minT = Math.min(minT, ...data.t);
        maxT = Math.max(maxT, ...data.t);
        minY = Math.min(minY, ...data.y);
        maxY = Math.max(maxY, ...data.y);
    }
    const rangeY = maxY - minY || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    const scaleX = (ti) => padding + ((ti - minT) / (maxT - minT)) * (width - 2 * padding);
    const scaleY = (yi) => height - padding - ((yi - minY) / (maxY - minY)) * (height - 2 * padding);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw each method
    for (const m of methods) {
        const data = result.results[m];
        ctx.strokeStyle = colors[m];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scaleX(data.t[0]), scaleY(data.y[0]));
        for (let i = 1; i < data.t.length; i++) {
            ctx.lineTo(scaleX(data.t[i]), scaleY(data.y[i]));
        }
        ctx.stroke();
    }

    // Legend
    ctx.font = '12px Arial';
    let legendY = padding;
    for (const m of methods) {
        ctx.fillStyle = colors[m];
        ctx.fillRect(width - padding - 80, legendY, 15, 10);
        ctx.fillStyle = '#333';
        ctx.fillText(names[m], width - padding - 60, legendY + 9);
        legendY += 20;
    }

    // Title
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Method Comparison', width / 2, 20);
}

// Display error
function displayError(message) {
    document.getElementById('results').innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

// Format number
function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (!isFinite(num)) return num > 0 ? '∞' : '-∞';
    if (Math.abs(num) < 0.0001 || Math.abs(num) >= 10000) {
        return num.toExponential(6);
    }
    return num.toFixed(6);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('exponential');
    updateOptions();
});
