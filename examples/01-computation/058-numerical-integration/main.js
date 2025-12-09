/**
 * Main Thread: Numerical Integration
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
    const variantGroup = document.getElementById('variantGroup');
    const maxLevelGroup = document.getElementById('maxLevelGroup');
    const toleranceGroup = document.getElementById('toleranceGroup');

    variantGroup.style.display = 'none';
    maxLevelGroup.style.display = 'none';
    toleranceGroup.style.display = 'none';

    if (calcType === 'rectangle') {
        variantGroup.style.display = 'block';
    } else if (calcType === 'romberg') {
        maxLevelGroup.style.display = 'block';
    } else if (calcType === 'adaptive') {
        toleranceGroup.style.display = 'block';
    }
}

// Load sample functions
function loadSample(type) {
    const a = parseFloat(document.getElementById('lowerBound').value) || 0;
    const b = parseFloat(document.getElementById('upperBound').value) || 10;
    const n = 100;
    const h = (b - a) / n;
    const values = [];

    for (let i = 0; i <= n; i++) {
        const x = a + i * h;
        let y;

        switch (type) {
            case 'sine':
                y = Math.sin(x);
                break;
            case 'polynomial':
                y = x * x * x - 2 * x * x + x; // x³ - 2x² + x
                break;
            case 'exponential':
                y = Math.exp(-x / 5);
                break;
            case 'gaussian':
                y = Math.exp(-x * x / 2);
                break;
            case 'sqrt':
                y = Math.sqrt(Math.abs(x) + 0.1);
                break;
            default:
                y = x;
        }
        values.push(y.toFixed(6));
    }

    document.getElementById('dataValues').value = values.join(', ');
}

// Perform calculation
function calculate() {
    const calcType = document.getElementById('calcType').value;
    const dataStr = document.getElementById('dataValues').value.trim();
    const a = parseFloat(document.getElementById('lowerBound').value);
    const b = parseFloat(document.getElementById('upperBound').value);

    if (!dataStr) {
        displayError('Please enter data values or load a sample function');
        return;
    }

    const values = dataStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

    if (values.length < 3) {
        displayError('Need at least 3 data points for integration');
        return;
    }

    if (isNaN(a) || isNaN(b) || a >= b) {
        displayError('Please enter valid integration bounds (a < b)');
        return;
    }

    showProgress();

    const data = { values, a, b };

    if (calcType === 'rectangle') {
        data.variant = document.getElementById('variant').value;
    } else if (calcType === 'romberg') {
        data.maxLevel = parseInt(document.getElementById('maxLevel').value) || 5;
    } else if (calcType === 'adaptive') {
        data.tolerance = parseFloat(document.getElementById('tolerance').value) || 1e-6;
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
            <h3>Integration Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.method}</div>
                <div class="method-info">Accuracy: ${result.accuracy || 'N/A'}</div>
            </div>
    `;

    if (result.formula) {
        html += `<div class="formula-box">${result.formula}</div>`;
    }

    if (calcType === 'compare') {
        html += displayComparison(result);
    } else if (calcType === 'romberg') {
        html += displayRomberg(result);
    } else {
        html += displayStandard(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw visualization
    if (result.values) {
        drawIntegrationChart(result);
    }
}

function displayStandard(result) {
    let html = `
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Integral Value</span>
                <span class="stat-value">${formatNumber(result.integral)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Lower Bound (a)</span>
                <span class="stat-value">${result.a}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Upper Bound (b)</span>
                <span class="stat-value">${result.b}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Intervals (n)</span>
                <span class="stat-value">${result.n}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Step Size (h)</span>
                <span class="stat-value">${formatNumber(result.h)}</span>
            </div>
    `;

    if (result.errorEstimate) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Error Estimate</span>
                <span class="stat-value">${result.errorEstimate}</span>
            </div>
        `;
    }

    if (result.tolerance) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Tolerance</span>
                <span class="stat-value">${result.tolerance}</span>
            </div>
        `;
    }

    html += '</div>';

    html += '<div class="chart-container"><canvas id="integrationChart" width="800" height="300"></canvas></div>';

    return html;
}

function displayRomberg(result) {
    let html = `
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Best Estimate</span>
                <span class="stat-value">${formatNumber(result.integral)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Extrapolation Levels</span>
                <span class="stat-value">${result.levels}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Lower Bound (a)</span>
                <span class="stat-value">${result.a}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Upper Bound (b)</span>
                <span class="stat-value">${result.b}</span>
            </div>
        </div>
    `;

    // Romberg table
    if (result.table && result.table.length > 0) {
        html += '<h4>Romberg Table</h4>';
        html += '<div class="table-container"><table class="method-table">';
        html += '<tr><th>Level</th>';
        for (let j = 0; j < result.table.length; j++) {
            html += `<th>R[i,${j}]</th>`;
        }
        html += '</tr>';

        for (let i = 0; i < result.table.length; i++) {
            html += `<tr><td>${i}</td>`;
            for (let j = 0; j < result.table.length; j++) {
                if (j <= i && result.table[i][j] !== undefined) {
                    const isLast = (i === result.table.length - 1 && j === i);
                    html += `<td ${isLast ? 'class="highlight-cell"' : ''}>${formatNumber(result.table[i][j])}</td>`;
                } else {
                    html += '<td>-</td>';
                }
            }
            html += '</tr>';
        }
        html += '</table></div>';
    }

    return html;
}

function displayComparison(result) {
    let html = `
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Consensus Value</span>
                <span class="stat-value">${formatNumber(result.consensus)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Interval [a, b]</span>
                <span class="stat-value">[${result.a}, ${result.b}]</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Intervals</span>
                <span class="stat-value">${result.n}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Step Size</span>
                <span class="stat-value">${formatNumber(result.h)}</span>
            </div>
        </div>
    `;

    html += '<h4>Method Comparison</h4>';
    html += '<table class="method-table">';
    html += '<tr><th>Method</th><th>Value</th><th>Accuracy</th><th>Deviation</th></tr>';

    const methods = [
        { key: 'leftRectangle', name: 'Left Rectangle' },
        { key: 'midpoint', name: 'Midpoint' },
        { key: 'trapezoidal', name: 'Trapezoidal' },
        { key: 'simpson', name: "Simpson's 1/3" },
        { key: 'simpson38', name: "Simpson's 3/8" },
        { key: 'boole', name: "Boole's Rule" }
    ];

    for (const method of methods) {
        const data = result.results[method.key];
        const deviation = Math.abs(data.value - result.consensus);
        html += `<tr>
            <td>${method.name}</td>
            <td>${formatNumber(data.value)}</td>
            <td>${data.accuracy}</td>
            <td>${formatNumber(deviation)}</td>
        </tr>`;
    }

    html += '</table>';

    html += '<div class="chart-container"><canvas id="comparisonChart" width="800" height="300"></canvas></div>';

    // Draw comparison chart
    setTimeout(() => drawComparisonChart(result), 100);

    return html;
}

// Draw integration visualization
function drawIntegrationChart(result) {
    setTimeout(() => {
        const canvas = document.getElementById('integrationChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 50;

        ctx.clearRect(0, 0, width, height);

        const values = result.values;
        const n = values.length;
        const a = result.a;
        const b = result.b;

        // Find data range
        let minY = Math.min(...values);
        let maxY = Math.max(...values);
        const rangeY = maxY - minY || 1;
        minY -= rangeY * 0.1;
        maxY += rangeY * 0.1;

        // Scale functions
        const scaleX = (i) => padding + (i / (n - 1)) * (width - 2 * padding);
        const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

        // Draw grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (i / 5) * (height - 2 * padding);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw filled area under curve
        ctx.fillStyle = 'rgba(39, 174, 96, 0.3)';
        ctx.beginPath();
        ctx.moveTo(scaleX(0), scaleY(0));
        for (let i = 0; i < n; i++) {
            ctx.lineTo(scaleX(i), scaleY(values[i]));
        }
        ctx.lineTo(scaleX(n - 1), scaleY(0));
        ctx.closePath();
        ctx.fill();

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw function curve
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(scaleX(0), scaleY(values[0]));
        for (let i = 1; i < n; i++) {
            ctx.lineTo(scaleX(i), scaleY(values[i]));
        }
        ctx.stroke();

        // Draw x=0 line if in range
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

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        // X-axis labels
        for (let i = 0; i <= 4; i++) {
            const x = a + (i / 4) * (b - a);
            ctx.fillText(x.toFixed(2), scaleX(i * (n - 1) / 4), height - padding + 20);
        }

        // Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const y = minY + (i / 4) * (maxY - minY);
            ctx.fillText(y.toFixed(2), padding - 10, scaleY(y) + 4);
        }

        // Title
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Integral ≈ ${formatNumber(result.integral)}`, width / 2, 25);
    }, 100);
}

// Draw comparison bar chart
function drawComparisonChart(result) {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.clearRect(0, 0, width, height);

    const methods = [
        { key: 'leftRectangle', name: 'Left Rect', color: '#e74c3c' },
        { key: 'midpoint', name: 'Midpoint', color: '#f39c12' },
        { key: 'trapezoidal', name: 'Trapez.', color: '#3498db' },
        { key: 'simpson', name: 'Simpson', color: '#27ae60' },
        { key: 'simpson38', name: 'Simp 3/8', color: '#9b59b6' },
        { key: 'boole', name: 'Boole', color: '#1abc9c' }
    ];

    const values = methods.map(m => result.results[m.key].value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const barWidth = (width - 2 * padding) / methods.length - 10;

    // Draw bars
    methods.forEach((method, i) => {
        const value = result.results[method.key].value;
        const barHeight = ((value - minVal + range * 0.1) / (range * 1.2)) * (height - 2 * padding);
        const x = padding + i * (barWidth + 10) + 5;
        const y = height - padding - barHeight;

        ctx.fillStyle = method.color;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Label
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(method.name, x + barWidth / 2, height - padding + 15);

        // Value
        ctx.font = '9px Arial';
        ctx.fillText(value.toFixed(4), x + barWidth / 2, y - 5);
    });

    // Consensus line
    const consensusY = height - padding - ((result.consensus - minVal + range * 0.1) / (range * 1.2)) * (height - 2 * padding);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, consensusY);
    ctx.lineTo(width - padding, consensusY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Consensus: ${result.consensus.toFixed(6)}`, padding + 5, consensusY - 5);
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
    if (Math.abs(num) < 0.0001 || Math.abs(num) >= 10000) {
        return num.toExponential(6);
    }
    return num.toFixed(6);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('sine');
    updateOptions();
});
