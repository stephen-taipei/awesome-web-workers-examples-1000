/**
 * Main Thread: Moving Average Calculator
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

    if (calcType === 'generate') {
        const n = parseInt(document.getElementById('generateCount').value) || 500;
        const period = parseInt(document.getElementById('generatePeriod').value) || 10;
        const trend = parseFloat(document.getElementById('trend').value) || 0;
        const volatility = parseFloat(document.getElementById('volatility').value) || 5;

        worker.postMessage({ type: 'generate', data: { n, period, trend, volatility } });
    } else {
        const values = parseValues();
        if (!values) return;

        const period = parseInt(document.getElementById('period').value) || 5;

        if (period >= values.length) {
            resultsDiv.innerHTML = '<div class="error">Period must be less than number of values</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: calcType, data: { values, period } });
    }
}

function parseValues() {
    const input = document.getElementById('dataValues').value.trim();
    const values = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (values.length < 5) {
        resultsDiv.innerHTML = '<div class="error">Need at least 5 values</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return values;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Moving Average Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'compare' || calculationType === 'generate') {
        html += displayComparison(result);
    } else {
        html += displaySingleMA(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw chart if compare or generate
    if (calculationType === 'compare' || calculationType === 'generate') {
        drawChart(result);
    }
}

function displaySingleMA(result) {
    let html = `
        <div class="ma-type-display">
            <div class="ma-type">${result.type}</div>
            <div class="ma-period">Period: ${result.period}</div>
        </div>

        <div class="formula-display">
            <code>${result.formula}</code>
        </div>

        <div class="interpretation-box">
            ${result.description}
        </div>`;

    // Stats
    if (result.stats) {
        html += `
            <h4>Performance Metrics</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">MAE</span>
                    <span class="stat-value">${result.stats.mae}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">RMSE</span>
                    <span class="stat-value">${result.stats.rmse}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Max Error</span>
                    <span class="stat-value">${result.stats.maxError}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Est. Lag</span>
                    <span class="stat-value">${result.stats.estimatedLag}</span>
                </div>
            </div>`;
    }

    // Display values
    const validValues = result.values.filter(v => v !== null);
    html += `
        <h4>Moving Average Values</h4>
        <div class="values-display">
            ${validValues.slice(-20).map(v => `<span class="value-chip">${formatNumber(v)}</span>`).join('')}
            ${validValues.length > 20 ? `<span class="more">... and ${validValues.length - 20} more</span>` : ''}
        </div>`;

    return html;
}

function displayComparison(result) {
    let html = `
        <div class="comparison-header">
            <span class="period-badge">Period: ${result.period}</span>
            <span class="data-badge">${result.original.length} data points</span>
            ${result.generated ? `<span class="generated-badge">Generated Data</span>` : ''}
        </div>`;

    // Chart canvas
    html += `<div class="chart-container"><canvas id="maChart"></canvas></div>`;

    // Stats comparison table
    html += `
        <h4>Performance Comparison</h4>
        <div class="table-container">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th class="sma">SMA</th>
                        <th class="ema">EMA</th>
                        <th class="wma">WMA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>MAE</td>
                        <td>${result.smaStats?.mae || 'N/A'}</td>
                        <td>${result.emaStats?.mae || 'N/A'}</td>
                        <td>${result.wmaStats?.mae || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>RMSE</td>
                        <td>${result.smaStats?.rmse || 'N/A'}</td>
                        <td>${result.emaStats?.rmse || 'N/A'}</td>
                        <td>${result.wmaStats?.rmse || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Estimated Lag</td>
                        <td>${result.smaStats?.estimatedLag || 'N/A'}</td>
                        <td>${result.emaStats?.estimatedLag || 'N/A'}</td>
                        <td>${result.wmaStats?.estimatedLag || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Correlation</td>
                        <td>${result.smaStats?.correlation || 'N/A'}</td>
                        <td>${result.emaStats?.correlation || 'N/A'}</td>
                        <td>${result.wmaStats?.correlation || 'N/A'}</td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    // Analysis
    if (result.analysis) {
        html += `
            <h4>Analysis</h4>
            <div class="analysis-grid">
                <div class="analysis-item">
                    <span class="analysis-label">Crossovers (EMA/SMA)</span>
                    <span class="analysis-value">${result.analysis.totalCrossovers}</span>
                </div>
                <div class="analysis-item">
                    <span class="analysis-label">Avg Divergence</span>
                    <span class="analysis-value">${result.analysis.avgDivergence}</span>
                </div>
            </div>

            <div class="responsiveness-box">
                <strong>Responsiveness:</strong>
                ${result.analysis.responsiveness.join(' > ')}
            </div>

            <div class="recommendation-box">
                <strong>Recommendation:</strong> ${result.analysis.recommendation}
            </div>`;

        // Show recent crossovers
        if (result.analysis.crossovers && result.analysis.crossovers.length > 0) {
            html += `
                <h4>Recent Crossovers</h4>
                <div class="crossover-list">
                    ${result.analysis.crossovers.map(c => `
                        <div class="crossover-item ${c.type}">
                            <span class="crossover-index">Index ${c.index}</span>
                            <span class="crossover-signal">${c.signal}</span>
                        </div>
                    `).join('')}
                </div>`;
        }
    }

    return html;
}

function drawChart(result) {
    const canvas = document.getElementById('maChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 300;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get data
    const original = result.original;
    const sma = result.sma;
    const ema = result.ema;
    const wma = result.wma;

    // Sample if too many points
    const maxPoints = 200;
    const step = Math.ceil(original.length / maxPoints);
    const sampledIndices = [];
    for (let i = 0; i < original.length; i += step) {
        sampledIndices.push(i);
    }

    // Calculate bounds
    let minVal = Infinity, maxVal = -Infinity;
    for (const i of sampledIndices) {
        minVal = Math.min(minVal, original[i]);
        maxVal = Math.max(maxVal, original[i]);
        if (sma[i] !== null) { minVal = Math.min(minVal, sma[i]); maxVal = Math.max(maxVal, sma[i]); }
        if (ema[i] !== null) { minVal = Math.min(minVal, ema[i]); maxVal = Math.max(maxVal, ema[i]); }
        if (wma[i] !== null) { minVal = Math.min(minVal, wma[i]); maxVal = Math.max(maxVal, wma[i]); }
    }

    const yRange = maxVal - minVal || 1;
    minVal -= yRange * 0.05;
    maxVal += yRange * 0.05;

    // Helper functions
    const xScale = (i) => padding.left + (sampledIndices.indexOf(i) / (sampledIndices.length - 1)) * chartWidth;
    const yScale = (v) => padding.top + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;

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

    // Draw original data
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let idx = 0; idx < sampledIndices.length; idx++) {
        const i = sampledIndices[idx];
        const x = padding.left + (idx / (sampledIndices.length - 1)) * chartWidth;
        const y = yScale(original[i]);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw SMA
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let idx = 0; idx < sampledIndices.length; idx++) {
        const i = sampledIndices[idx];
        if (sma[i] !== null) {
            const x = padding.left + (idx / (sampledIndices.length - 1)) * chartWidth;
            const y = yScale(sma[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw EMA
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    started = false;
    for (let idx = 0; idx < sampledIndices.length; idx++) {
        const i = sampledIndices[idx];
        if (ema[i] !== null) {
            const x = padding.left + (idx / (sampledIndices.length - 1)) * chartWidth;
            const y = yScale(ema[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw WMA
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    started = false;
    for (let idx = 0; idx < sampledIndices.length; idx++) {
        const i = sampledIndices[idx];
        if (wma[i] !== null) {
            const x = padding.left + (idx / (sampledIndices.length - 1)) * chartWidth;
            const y = yScale(wma[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Legend
    const legendY = 15;
    const legendItems = [
        { color: '#cccccc', label: 'Original' },
        { color: '#3498db', label: 'SMA' },
        { color: '#e74c3c', label: 'EMA' },
        { color: '#2ecc71', label: 'WMA' }
    ];

    let legendX = padding.left;
    ctx.font = '12px sans-serif';
    for (const item of legendItems) {
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, legendY - 8, 20, 3);
        ctx.fillStyle = '#333';
        ctx.fillText(item.label, legendX + 25, legendY);
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
    if (num === null || num === undefined) return 'N/A';
    if (typeof num === 'number') {
        if (Math.abs(num) >= 10000) return num.toFixed(0);
        if (Math.abs(num) >= 100) return num.toFixed(1);
        return num.toFixed(2);
    }
    return num;
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('dataInputs').style.display = calcType === 'generate' ? 'none' : 'block';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
}

function loadSample(type) {
    let values;
    switch (type) {
        case 'stock':
            values = '100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113, 115, 117, 116, 118, 120';
            break;
        case 'volatile':
            values = '50, 55, 48, 62, 45, 58, 52, 65, 42, 60, 55, 70, 48, 63, 50, 68, 45, 72, 52, 75';
            break;
        case 'trend':
            values = '10, 12, 15, 18, 22, 25, 30, 34, 39, 45, 50, 56, 63, 70, 78, 85, 93, 102, 110, 120';
            break;
        default:
            values = '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15';
    }
    document.getElementById('dataValues').value = values;
}

// Initialize
updateOptions();
