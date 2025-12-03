/**
 * Main Thread: Boundary Value Problem Solver
 * Handles UI and communicates with Web Worker
 */

const worker = new Worker('worker.js');

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

function loadSample(type) {
    const equations = {
        'harmonic': { eq: 'linear', a: 0, b: Math.PI, ya: 0, yb: 0, desc: 'y\'\' = -y (Harmonic)' },
        'exponential': { eq: 'exponential', a: 0, b: 1, ya: 1, yb: Math.E, desc: 'y\'\' = y (Exponential)' },
        'damped': { eq: 'damped', a: 0, b: 5, ya: 1, yb: 0, desc: 'y\'\' = -0.5y\' - y (Damped)' },
        'forced': { eq: 'forced', a: 0, b: 2*Math.PI, ya: 0, yb: 0, desc: 'y\'\' = -y + sin(x) (Forced)' },
        'nonhomogeneous': { eq: 'nonhomogeneous', a: 0, b: 1, ya: 0, yb: 0, desc: 'y\'\' = -y + x' }
    };

    const sample = equations[type];
    if (sample) {
        document.getElementById('equation').value = sample.eq;
        document.getElementById('a').value = sample.a.toFixed(4);
        document.getElementById('b').value = sample.b.toFixed(4);
        document.getElementById('ya').value = sample.ya.toFixed(4);
        document.getElementById('yb').value = sample.yb.toFixed(4);
    }
}

function calculate() {
    const method = document.getElementById('method').value;
    const equation = document.getElementById('equation').value;
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    const ya = parseFloat(document.getElementById('ya').value);
    const yb = parseFloat(document.getElementById('yb').value);
    const n = parseInt(document.getElementById('n').value) || 50;
    const tolerance = parseFloat(document.getElementById('tolerance').value) || 1e-6;

    if (isNaN(a) || isNaN(b) || a >= b) {
        displayError('Please enter valid interval [a, b] with a < b');
        return;
    }

    if (isNaN(ya) || isNaN(yb)) {
        displayError('Please enter valid boundary values');
        return;
    }

    showProgress();

    worker.postMessage({
        type: method,
        data: { equation, a, b, ya, yb, n, tolerance }
    });
}

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

function displayResult(methodType, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card">
            <h3>BVP Solution</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.method}</div>
                <div class="method-info">${result.description || ''}</div>
            </div>
    `;

    // Stats
    html += '<div class="stat-grid">';
    html += `<div class="stat-item"><span class="stat-label">Interval</span><span class="stat-value">[${result.boundaryA.x.toFixed(2)}, ${result.boundaryB.x.toFixed(2)}]</span></div>`;
    html += `<div class="stat-item"><span class="stat-label">y(a)</span><span class="stat-value">${result.boundaryA.y.toFixed(4)}</span></div>`;
    html += `<div class="stat-item"><span class="stat-label">y(b)</span><span class="stat-value">${result.boundaryB.y.toFixed(4)}</span></div>`;
    html += `<div class="stat-item"><span class="stat-label">Grid Points</span><span class="stat-value">${result.n}</span></div>`;

    if (result.iterations) {
        html += `<div class="stat-item"><span class="stat-label">Iterations</span><span class="stat-value">${result.iterations}</span></div>`;
    }
    if (result.initialSlope !== undefined) {
        html += `<div class="stat-item"><span class="stat-label">Initial Slope</span><span class="stat-value">${result.initialSlope.toFixed(6)}</span></div>`;
    }
    if (result.converged !== undefined) {
        html += `<div class="stat-item ${result.converged ? 'highlight' : 'warning'}"><span class="stat-label">Converged</span><span class="stat-value">${result.converged ? 'Yes' : 'No'}</span></div>`;
    }

    html += '</div>';

    // Chart
    html += '<div class="chart-container"><canvas id="solutionChart" width="800" height="350"></canvas></div>';

    // Data table
    if (methodType !== 'compare') {
        html += '<h4>Sample Solution Points</h4>';
        html += '<div class="table-container"><table class="method-table">';
        html += '<tr><th>x</th><th>y(x)</th><th>y\'(x)</th></tr>';

        const step = Math.max(1, Math.floor(result.x.length / 10));
        for (let i = 0; i < result.x.length; i += step) {
            html += `<tr>
                <td>${result.x[i].toFixed(4)}</td>
                <td>${result.y[i].toFixed(6)}</td>
                <td>${result.yp[i].toFixed(6)}</td>
            </tr>`;
        }
        html += '</table></div>';
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw chart
    setTimeout(() => {
        if (methodType === 'compare') {
            drawComparisonChart(result);
        } else {
            drawSolutionChart(result);
        }
    }, 100);
}

function drawSolutionChart(result) {
    const canvas = document.getElementById('solutionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    const x = result.x;
    const y = result.y;

    // Find ranges
    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    let minY = Math.min(...y);
    let maxY = Math.max(...y);
    const rangeY = maxY - minY || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    const scaleX = (xi) => padding + ((xi - minX) / (maxX - minX)) * (width - 2 * padding);
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

    // Draw y=0 line
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
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(scaleX(x[0]), scaleY(y[0]));
    for (let i = 1; i < x.length; i++) {
        ctx.lineTo(scaleX(x[i]), scaleY(y[i]));
    }
    ctx.stroke();

    // Draw boundary points
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(scaleX(x[0]), scaleY(y[0]), 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(scaleX(x[x.length-1]), scaleY(y[y.length-1]), 8, 0, 2 * Math.PI);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    for (let i = 0; i <= 4; i++) {
        const xi = minX + (i / 4) * (maxX - minX);
        ctx.fillText(xi.toFixed(2), scaleX(xi), height - padding + 20);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const yi = minY + (i / 4) * (maxY - minY);
        ctx.fillText(yi.toFixed(2), padding - 10, scaleY(yi) + 4);
    }

    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Solution y(x)', width / 2, 20);
}

function drawComparisonChart(result) {
    const canvas = document.getElementById('solutionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    const methods = Object.keys(result.results);
    const colors = {
        shooting: '#e74c3c',
        finiteDifference: '#3498db',
        collocation: '#2ecc71',
        relaxation: '#f39c12'
    };

    // Find global ranges
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const m of methods) {
        const data = result.results[m];
        minX = Math.min(minX, ...data.x);
        maxX = Math.max(maxX, ...data.x);
        minY = Math.min(minY, ...data.y);
        maxY = Math.max(maxY, ...data.y);
    }
    const rangeY = maxY - minY || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    const scaleX = (xi) => padding + ((xi - minX) / (maxX - minX)) * (width - 2 * padding);
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
        ctx.moveTo(scaleX(data.x[0]), scaleY(data.y[0]));
        for (let i = 1; i < data.x.length; i++) {
            ctx.lineTo(scaleX(data.x[i]), scaleY(data.y[i]));
        }
        ctx.stroke();
    }

    // Legend
    ctx.font = '11px Arial';
    let legendY = padding;
    for (const m of methods) {
        ctx.fillStyle = colors[m];
        ctx.fillRect(width - padding - 100, legendY, 15, 10);
        ctx.fillStyle = '#333';
        ctx.fillText(result.results[m].name, width - padding - 80, legendY + 9);
        legendY += 18;
    }

    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Method Comparison', width / 2, 20);
}

function displayError(message) {
    document.getElementById('results').innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    loadSample('harmonic');
});
