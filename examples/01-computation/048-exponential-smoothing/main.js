/**
 * Main Thread: Exponential Smoothing Calculator
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

    calculateBtn.disabled = true;
    resultsDiv.innerHTML = '<p>Calculating...</p>';

    const values = parseValues();
    if (!values) return;

    const alpha = parseFloat(document.getElementById('alpha').value) || 0.3;
    const beta = parseFloat(document.getElementById('beta').value) || 0.1;
    const gamma = parseFloat(document.getElementById('gamma').value) || 0.1;
    const seasonLength = parseInt(document.getElementById('seasonLength').value) || 4;
    const forecastPeriods = parseInt(document.getElementById('forecastPeriods').value) || 5;

    if (calcType === 'single') {
        worker.postMessage({ type: 'single', data: { values, alpha } });
    } else if (calcType === 'double') {
        worker.postMessage({ type: 'double', data: { values, alpha, beta } });
    } else if (calcType === 'triple') {
        worker.postMessage({ type: 'triple', data: { values, alpha, beta, gamma, seasonLength } });
    } else if (calcType === 'optimize') {
        const method = document.getElementById('optimizeMethod').value;
        worker.postMessage({ type: 'optimize', data: { values, method, seasonLength } });
    } else if (calcType === 'forecast') {
        worker.postMessage({ type: 'forecast', data: { values, periods: forecastPeriods, seasonLength } });
    }
}

function parseValues() {
    const input = document.getElementById('dataValues').value.trim();
    const values = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (values.length < 4) {
        resultsDiv.innerHTML = '<div class="error">Need at least 4 values</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return values;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Exponential Smoothing Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'optimize') {
        html += displayOptimization(result);
    } else if (calculationType === 'forecast') {
        html += displayForecast(result);
    } else {
        html += displaySmoothing(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw chart
    if (result.smoothed) {
        setTimeout(() => drawChart(result), 100);
    }
}

function displaySmoothing(result) {
    let html = `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-desc">${result.description}</div>
        </div>

        <div class="formula-display">
            <code>${result.formula}</code>
        </div>

        <h4>Parameters</h4>
        <div class="param-grid">
            <div class="param-item">
                <span class="param-label">α (Level)</span>
                <span class="param-value">${result.alpha}</span>
            </div>`;

    if (result.beta !== undefined) {
        html += `
            <div class="param-item">
                <span class="param-label">β (Trend)</span>
                <span class="param-value">${result.beta}</span>
            </div>`;
    }

    if (result.gamma !== undefined) {
        html += `
            <div class="param-item">
                <span class="param-label">γ (Seasonal)</span>
                <span class="param-value">${result.gamma}</span>
            </div>
            <div class="param-item">
                <span class="param-label">Season Length</span>
                <span class="param-value">${result.seasonLength}</span>
            </div>`;
    }

    html += `</div>`;

    // Chart
    html += `<h4>Smoothed Values</h4>
        <div class="chart-container"><canvas id="smoothChart"></canvas></div>`;

    // Metrics
    html += `
        <h4>Accuracy Metrics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">MSE</span>
                <span class="stat-value">${result.metrics.mse}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">RMSE</span>
                <span class="stat-value">${result.metrics.rmse}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">MAE</span>
                <span class="stat-value">${result.metrics.mae}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">MAPE</span>
                <span class="stat-value">${result.metrics.mape}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Bias</span>
                <span class="stat-value">${result.metrics.bias}</span>
            </div>
        </div>`;

    return html;
}

function displayOptimization(result) {
    const r = result.optimizedResult;

    let html = `
        <div class="optimization-header">
            <span class="badge">Optimized</span>
            <span class="method-badge">${result.method.toUpperCase()}</span>
        </div>

        <div class="best-params-box">
            <h4>Best Parameters</h4>
            <div class="param-grid">`;

    if (result.bestParams.alpha !== undefined) {
        html += `<div class="param-item highlight">
            <span class="param-label">α</span>
            <span class="param-value">${result.bestParams.alpha.toFixed(2)}</span>
        </div>`;
    }
    if (result.bestParams.beta !== undefined) {
        html += `<div class="param-item highlight">
            <span class="param-label">β</span>
            <span class="param-value">${result.bestParams.beta.toFixed(2)}</span>
        </div>`;
    }
    if (result.bestParams.gamma !== undefined) {
        html += `<div class="param-item highlight">
            <span class="param-label">γ</span>
            <span class="param-value">${result.bestParams.gamma.toFixed(2)}</span>
        </div>`;
    }

    html += `</div>
            <p class="best-mse">Best MSE: ${result.bestMSE}</p>
        </div>`;

    // Chart
    html += `<h4>Optimized Fit</h4>
        <div class="chart-container"><canvas id="smoothChart"></canvas></div>`;

    // Metrics
    html += `
        <h4>Accuracy Metrics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">RMSE</span>
                <span class="stat-value">${r.metrics.rmse}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">MAE</span>
                <span class="stat-value">${r.metrics.mae}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">MAPE</span>
                <span class="stat-value">${r.metrics.mape}</span>
            </div>
        </div>`;

    // Store smoothed for chart
    result.smoothed = r.smoothed;

    return html;
}

function displayForecast(result) {
    let html = `
        <div class="forecast-header">
            <span class="badge">Forecast</span>
            <span class="method-badge">${result.bestMethod}</span>
        </div>

        <h4>Method Comparison</h4>
        <div class="table-container">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>MSE</th>
                        <th>Selected</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.methodComparison.map(m => `
                        <tr class="${m.name === result.bestMethod ? 'selected' : ''}">
                            <td>${m.name}</td>
                            <td>${m.mse}</td>
                            <td>${m.name === result.bestMethod ? '✓' : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    // Chart
    html += `<h4>Forecast</h4>
        <div class="chart-container"><canvas id="smoothChart"></canvas></div>`;

    // Forecast table
    html += `
        <h4>Forecasted Values</h4>
        <div class="forecast-grid">
            ${result.forecasts.map(f => `
                <div class="forecast-item">
                    <span class="forecast-period">Period ${f.period}</span>
                    <span class="forecast-value">${formatNumber(f.forecast)}</span>
                </div>
            `).join('')}
        </div>`;

    // Metrics
    html += `
        <h4>Model Accuracy</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">RMSE</span>
                <span class="stat-value">${result.metrics.rmse}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">MAPE</span>
                <span class="stat-value">${result.metrics.mape}</span>
            </div>
        </div>`;

    // Add forecasts to smoothed for chart
    result.forecastValues = result.forecasts.map(f => f.forecast);

    return html;
}

function drawChart(result) {
    const canvas = document.getElementById('smoothChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 280;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get data
    const values = parseValues();
    const smoothed = result.smoothed || (result.optimizedResult && result.optimizedResult.smoothed);
    const forecasts = result.forecastValues || [];

    if (!smoothed) return;

    const allData = [...smoothed, ...forecasts];
    const n = allData.length;

    // Calculate bounds
    let minVal = Math.min(...values, ...allData.filter(v => v !== null && !isNaN(v)));
    let maxVal = Math.max(...values, ...allData.filter(v => v !== null && !isNaN(v)));
    const range = maxVal - minVal || 1;
    minVal -= range * 0.05;
    maxVal += range * 0.05;

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Draw forecast region
    if (forecasts.length > 0) {
        const forecastStart = padding.left + ((values.length - 1) / (n - 1)) * chartWidth;
        ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        ctx.fillRect(forecastStart, padding.top, width - padding.right - forecastStart, chartHeight);
    }

    // Scale functions
    const xScale = (i) => padding.left + (i / (n - 1)) * chartWidth;
    const yScale = (v) => padding.top + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;

    // Draw actual values
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
        const x = xScale(i);
        const y = yScale(values[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw smoothed values
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < smoothed.length; i++) {
        if (smoothed[i] !== null && !isNaN(smoothed[i])) {
            const x = xScale(i);
            const y = yScale(smoothed[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw forecasts
    if (forecasts.length > 0) {
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const startIdx = smoothed.length - 1;
        ctx.moveTo(xScale(startIdx), yScale(smoothed[startIdx]));
        for (let i = 0; i < forecasts.length; i++) {
            const x = xScale(smoothed.length + i);
            const y = yScale(forecasts[i]);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Legend
    ctx.font = '12px sans-serif';
    const legendItems = [
        { color: '#999', label: 'Actual' },
        { color: '#e53935', label: 'Smoothed' }
    ];
    if (forecasts.length > 0) {
        legendItems.push({ color: '#4caf50', label: 'Forecast' });
    }

    let legendX = padding.left;
    for (const item of legendItems) {
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, 12, 20, 3);
        ctx.fillStyle = '#333';
        ctx.fillText(item.label, legendX + 25, 16);
        legendX += 80;
    }

    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (i / 5) * chartHeight;
        const value = maxVal - (i / 5) * (maxVal - minVal);
        ctx.fillText(formatNumber(value), padding.left - 5, y + 3);
    }
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 1000) return num.toFixed(0);
    if (Math.abs(num) >= 10) return num.toFixed(1);
    return num.toFixed(2);
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('betaGroup').style.display =
        (calcType === 'double' || calcType === 'triple') ? 'block' : 'none';
    document.getElementById('gammaGroup').style.display =
        calcType === 'triple' ? 'block' : 'none';
    document.getElementById('seasonGroup').style.display =
        (calcType === 'triple' || calcType === 'optimize' || calcType === 'forecast') ? 'block' : 'none';
    document.getElementById('optimizeGroup').style.display =
        calcType === 'optimize' ? 'block' : 'none';
    document.getElementById('forecastGroup').style.display =
        calcType === 'forecast' ? 'block' : 'none';
    document.getElementById('alphaGroup').style.display =
        calcType !== 'optimize' && calcType !== 'forecast' ? 'block' : 'none';
}

function loadSample(type) {
    let values;
    switch (type) {
        case 'trend':
            values = '100, 105, 112, 118, 125, 133, 140, 148, 157, 165, 174, 183';
            break;
        case 'seasonal':
            values = '120, 90, 100, 150, 125, 95, 105, 160, 130, 100, 110, 165, 135, 105, 115, 170';
            break;
        case 'random':
            values = '50, 52, 48, 55, 53, 51, 54, 49, 52, 50, 53, 51, 48, 54, 52, 50';
            break;
        default:
            values = '10, 12, 15, 13, 18, 20, 22, 25, 28, 30';
    }
    document.getElementById('dataValues').value = values;
}

// Initialize
updateOptions();
