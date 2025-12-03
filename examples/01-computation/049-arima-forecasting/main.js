/**
 * Main Thread: ARIMA Forecasting Calculator
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

    const p = parseInt(document.getElementById('orderP').value) || 1;
    const d = parseInt(document.getElementById('orderD').value) || 0;
    const q = parseInt(document.getElementById('orderQ').value) || 0;
    const periods = parseInt(document.getElementById('forecastPeriods').value) || 5;

    if (calcType === 'ar') {
        worker.postMessage({ type: 'ar', data: { values, p } });
    } else if (calcType === 'ma') {
        worker.postMessage({ type: 'ma', data: { values, q } });
    } else if (calcType === 'arma') {
        worker.postMessage({ type: 'arma', data: { values, p, q } });
    } else if (calcType === 'arima') {
        worker.postMessage({ type: 'arima', data: { values, p, d, q } });
    } else if (calcType === 'forecast') {
        worker.postMessage({ type: 'forecast', data: { values, p, d, q, periods } });
    } else if (calcType === 'auto') {
        const maxP = parseInt(document.getElementById('maxP').value) || 3;
        const maxD = parseInt(document.getElementById('maxD').value) || 2;
        const maxQ = parseInt(document.getElementById('maxQ').value) || 3;
        worker.postMessage({ type: 'auto', data: { values, maxP, maxD, maxQ } });
    }
}

function parseValues() {
    const input = document.getElementById('dataValues').value.trim();
    const values = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (values.length < 10) {
        resultsDiv.innerHTML = '<div class="error">Need at least 10 values for ARIMA</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return values;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>ARIMA Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'auto') {
        html += displayAutoARIMA(result);
    } else if (calculationType === 'forecast') {
        html += displayForecast(result);
    } else {
        html += displayModel(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw chart
    if (result.fitted || (result.bestResult && result.bestResult.fitted)) {
        setTimeout(() => drawChart(result), 100);
    }
}

function displayModel(result) {
    let html = `
        <div class="model-display">
            <div class="model-name">${result.model}</div>
        </div>`;

    // Coefficients
    if (result.coefficients || result.arCoefficients) {
        html += `<h4>Coefficients</h4>
            <div class="coeff-grid">`;

        if (result.coefficients) {
            result.coefficients.forEach((c, i) => {
                html += `<div class="coeff-item">
                    <span class="coeff-label">${result.model.startsWith('AR') ? 'φ' : 'θ'}${i + 1}</span>
                    <span class="coeff-value">${formatNumber(c)}</span>
                </div>`;
            });
        }

        if (result.arCoefficients) {
            result.arCoefficients.forEach((c, i) => {
                html += `<div class="coeff-item">
                    <span class="coeff-label">φ${i + 1}</span>
                    <span class="coeff-value">${formatNumber(c)}</span>
                </div>`;
            });
        }

        if (result.maCoefficients) {
            result.maCoefficients.forEach((c, i) => {
                html += `<div class="coeff-item">
                    <span class="coeff-label">θ${i + 1}</span>
                    <span class="coeff-value">${formatNumber(c)}</span>
                </div>`;
            });
        }

        html += `</div>`;
    }

    // Chart
    html += `<h4>Fitted Values</h4>
        <div class="chart-container"><canvas id="arimaChart"></canvas></div>`;

    // Metrics
    html += `
        <h4>Model Metrics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">AIC</span>
                <span class="stat-value">${formatNumber(result.aic)}</span>
            </div>
            <div class="stat-item">
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
        </div>`;

    // Interpretation
    if (result.interpretation) {
        html += `<div class="interpretation-box">${result.interpretation}</div>`;
    }

    // Stationarity test
    if (result.stationaryTest) {
        html += `<div class="stationarity-box ${result.stationaryTest.stationary ? 'stationary' : 'non-stationary'}">
            <strong>Stationarity:</strong> ${result.stationaryTest.message}
            (Variance ratio: ${result.stationaryTest.varianceRatio})
        </div>`;
    }

    // ACF if available
    if (result.acf && result.acf.length > 0) {
        html += `<h4>Autocorrelation (ACF)</h4>
            <div class="acf-display">
                ${result.acf.map((a, i) => `
                    <div class="acf-bar-container">
                        <span class="acf-lag">Lag ${i + 1}</span>
                        <div class="acf-bar-wrapper">
                            <div class="acf-bar ${a >= 0 ? 'positive' : 'negative'}"
                                 style="width: ${Math.abs(a) * 100}%"></div>
                        </div>
                        <span class="acf-value">${formatNumber(a)}</span>
                    </div>
                `).join('')}
            </div>`;
    }

    return html;
}

function displayAutoARIMA(result) {
    let html = `
        <div class="auto-header">
            <span class="badge">Auto Selection</span>
        </div>

        <div class="best-model-box">
            <h4>Best Model</h4>
            <div class="best-order">ARIMA(${result.bestOrder.p}, ${result.bestOrder.d}, ${result.bestOrder.q})</div>
            <div class="best-aic">AIC: ${result.bestAIC}</div>
        </div>`;

    // Chart
    html += `<h4>Best Model Fit</h4>
        <div class="chart-container"><canvas id="arimaChart"></canvas></div>`;

    // Top models comparison
    html += `
        <h4>Model Comparison (Top 10)</h4>
        <div class="table-container">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>AIC</th>
                        <th>RMSE</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.allResults.map((r, i) => `
                        <tr class="${i === 0 ? 'best' : ''}">
                            <td>ARIMA${r.order}</td>
                            <td>${r.aic}</td>
                            <td>${r.rmse}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    // Best model metrics
    if (result.bestResult && result.bestResult.metrics) {
        html += `
            <h4>Best Model Metrics</h4>
            <div class="stat-grid">
                <div class="stat-item highlight">
                    <span class="stat-label">RMSE</span>
                    <span class="stat-value">${result.bestResult.metrics.rmse}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">MAE</span>
                    <span class="stat-value">${result.bestResult.metrics.mae}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">MAPE</span>
                    <span class="stat-value">${result.bestResult.metrics.mape}</span>
                </div>
            </div>`;
    }

    // Store for chart
    result.fitted = result.bestResult ? result.bestResult.fitted : null;

    return html;
}

function displayForecast(result) {
    let html = `
        <div class="forecast-header">
            <span class="badge">Forecast</span>
            <span class="model-badge">${result.model}</span>
        </div>`;

    // Chart
    html += `<h4>Forecast</h4>
        <div class="chart-container"><canvas id="arimaChart"></canvas></div>`;

    // Forecast table
    html += `
        <h4>Forecasted Values</h4>
        <div class="table-container">
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Forecast</th>
                        <th>95% CI Lower</th>
                        <th>95% CI Upper</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.forecasts.map(f => `
                        <tr>
                            <td>${f.period}</td>
                            <td><strong>${formatNumber(f.forecast)}</strong></td>
                            <td>${formatNumber(f.lower95)}</td>
                            <td>${formatNumber(f.upper95)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    // Metrics
    html += `
        <h4>Model Metrics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">AIC</span>
                <span class="stat-value">${formatNumber(result.aic)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">RMSE</span>
                <span class="stat-value">${result.metrics.rmse}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">MAPE</span>
                <span class="stat-value">${result.metrics.mape}</span>
            </div>
        </div>`;

    return html;
}

function drawChart(result) {
    const canvas = document.getElementById('arimaChart');
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
    const fitted = result.fitted || (result.bestResult && result.bestResult.fitted);
    const forecasts = result.forecasts || [];

    if (!fitted) return;

    const forecastValues = forecasts.map(f => f.forecast);
    const lowerCI = forecasts.map(f => f.lower95);
    const upperCI = forecasts.map(f => f.upper95);

    const allData = [...values, ...forecastValues];
    const n = allData.length;

    // Calculate bounds
    let minVal = Math.min(...values, ...fitted.filter(v => !isNaN(v)));
    let maxVal = Math.max(...values, ...fitted.filter(v => !isNaN(v)));

    if (forecastValues.length > 0) {
        minVal = Math.min(minVal, ...lowerCI);
        maxVal = Math.max(maxVal, ...upperCI);
    }

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
    if (forecastValues.length > 0) {
        const forecastStart = padding.left + ((values.length - 1) / (n - 1)) * chartWidth;
        ctx.fillStyle = 'rgba(0, 150, 136, 0.1)';
        ctx.fillRect(forecastStart, padding.top, width - padding.right - forecastStart, chartHeight);
    }

    // Scale functions
    const xScale = (i) => padding.left + (i / (n - 1)) * chartWidth;
    const yScale = (v) => padding.top + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;

    // Draw confidence interval
    if (forecastValues.length > 0) {
        ctx.fillStyle = 'rgba(0, 150, 136, 0.2)';
        ctx.beginPath();
        const startIdx = values.length;
        ctx.moveTo(xScale(startIdx), yScale(upperCI[0]));
        for (let i = 0; i < forecastValues.length; i++) {
            ctx.lineTo(xScale(startIdx + i), yScale(upperCI[i]));
        }
        for (let i = forecastValues.length - 1; i >= 0; i--) {
            ctx.lineTo(xScale(startIdx + i), yScale(lowerCI[i]));
        }
        ctx.closePath();
        ctx.fill();
    }

    // Draw actual values
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
        const x = xScale(i);
        const y = yScale(values[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw fitted values
    ctx.strokeStyle = '#009688';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < fitted.length; i++) {
        if (!isNaN(fitted[i])) {
            const x = xScale(i);
            const y = yScale(fitted[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw forecasts
    if (forecastValues.length > 0) {
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const lastFitted = fitted[fitted.length - 1];
        ctx.moveTo(xScale(values.length - 1), yScale(lastFitted));
        for (let i = 0; i < forecastValues.length; i++) {
            ctx.lineTo(xScale(values.length + i), yScale(forecastValues[i]));
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Legend
    ctx.font = '12px sans-serif';
    const legendItems = [
        { color: '#666', label: 'Actual' },
        { color: '#009688', label: 'Fitted' }
    ];
    if (forecastValues.length > 0) {
        legendItems.push({ color: '#00bcd4', label: 'Forecast' });
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
    if (typeof num === 'string') return num;
    if (Math.abs(num) >= 1000) return num.toFixed(0);
    if (Math.abs(num) >= 10) return num.toFixed(1);
    return num.toFixed(3);
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('orderP').parentElement.style.display =
        ['ar', 'arma', 'arima', 'forecast'].includes(calcType) ? 'block' : 'none';
    document.getElementById('orderD').parentElement.style.display =
        ['arima', 'forecast'].includes(calcType) ? 'block' : 'none';
    document.getElementById('orderQ').parentElement.style.display =
        ['ma', 'arma', 'arima', 'forecast'].includes(calcType) ? 'block' : 'none';
    document.getElementById('forecastGroup').style.display =
        calcType === 'forecast' ? 'block' : 'none';
    document.getElementById('autoGroup').style.display =
        calcType === 'auto' ? 'block' : 'none';
}

function loadSample(type) {
    let values;
    switch (type) {
        case 'airline':
            values = '112, 118, 132, 129, 121, 135, 148, 148, 136, 119, 104, 118, 115, 126, 141, 135, 125, 149, 170, 170, 158, 133, 114, 140';
            break;
        case 'trend':
            values = '100, 105, 108, 115, 120, 125, 130, 138, 145, 152, 160, 168, 175, 185, 195, 205, 215, 228, 240, 255';
            break;
        case 'stationary':
            values = '50, 52, 48, 51, 49, 53, 50, 52, 49, 51, 50, 48, 52, 51, 49, 50, 52, 48, 51, 50';
            break;
        default:
            values = '10, 12, 15, 14, 18, 20, 22, 25, 24, 28, 30, 33, 35, 38, 40';
    }
    document.getElementById('dataValues').value = values;
}

// Initialize
updateOptions();
