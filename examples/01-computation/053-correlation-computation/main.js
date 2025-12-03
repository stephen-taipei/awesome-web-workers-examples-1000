/**
 * Main Thread: Correlation Computation
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

    if (calcType === 'autocorrelation') {
        const signal = parseSignal('signal1Data');
        if (!signal) return;
        const maxLag = parseInt(document.getElementById('maxLag').value) || signal.length - 1;
        worker.postMessage({ type: 'autocorrelation', data: { signal, maxLag } });
    } else if (calcType === 'crosscorrelation') {
        const signal1 = parseSignal('signal1Data');
        const signal2 = parseSignal('signal2Data');
        if (!signal1 || !signal2) return;
        const mode = document.getElementById('corrMode').value;
        worker.postMessage({ type: 'crosscorrelation', data: { signal1, signal2, mode } });
    } else if (calcType === 'pearson') {
        const x = parseSignal('signal1Data');
        const y = parseSignal('signal2Data');
        if (!x || !y) return;
        worker.postMessage({ type: 'pearson', data: { x, y } });
    } else if (calcType === 'timedelay') {
        const signal1 = parseSignal('signal1Data');
        const signal2 = parseSignal('signal2Data');
        if (!signal1 || !signal2) return;
        worker.postMessage({ type: 'timedelay', data: { signal1, signal2 } });
    } else if (calcType === 'correlogram') {
        const signal = parseSignal('signal1Data');
        if (!signal) return;
        const maxLag = parseInt(document.getElementById('maxLag').value) || Math.floor(signal.length / 4);
        worker.postMessage({ type: 'correlogram', data: { signal, maxLag } });
    }
}

function parseSignal(inputId) {
    const input = document.getElementById(inputId).value.trim();
    const signal = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (signal.length < 5) {
        resultsDiv.innerHTML = '<div class="error">Need at least 5 data points</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return signal;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Correlation Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'autocorrelation':
            html += displayAutocorrelation(result);
            break;
        case 'crosscorrelation':
            html += displayCrossCorrelation(result);
            break;
        case 'pearson':
            html += displayPearson(result);
            break;
        case 'timedelay':
            html += displayTimeDelay(result);
            break;
        case 'correlogram':
            html += displayCorrelogram(result);
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw charts
    setTimeout(() => {
        switch (calculationType) {
            case 'autocorrelation':
                drawAutocorrelationChart(result);
                break;
            case 'crosscorrelation':
                drawCrossCorrelationChart(result);
                break;
            case 'pearson':
                drawScatterPlot(result);
                break;
            case 'timedelay':
                drawTimeDelayChart(result);
                break;
            case 'correlogram':
                drawCorrelogramChart(result);
                break;
        }
    }, 100);
}

function displayAutocorrelation(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">${result.interpretation}</div>
        </div>

        <h4>Autocorrelation Function</h4>
        <div class="chart-container"><canvas id="acfChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Max Lag</span>
                <span class="stat-value">${result.maxLag}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Variance</span>
                <span class="stat-value">${result.variance}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Est. Period</span>
                <span class="stat-value">${result.estimatedPeriod || 'N/A'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Peaks Found</span>
                <span class="stat-value">${result.peaks.length}</span>
            </div>
        </div>

        ${result.peaks.length > 0 ? `
        <h4>Significant Peaks</h4>
        <div class="peaks-list">
            ${result.peaks.slice(0, 5).map(p => `
                <span class="peak-item">Lag ${p.lag}: ${p.value.toFixed(4)}</span>
            `).join('')}
        </div>
        ` : ''}`;
}

function displayCrossCorrelation(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">${result.interpretation}</div>
        </div>

        <h4>Cross-Correlation Function</h4>
        <div class="chart-container"><canvas id="xcorrChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Mode</span>
                <span class="stat-value">${result.mode}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Max Correlation</span>
                <span class="stat-value">${result.maxCorrelation}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Lag at Max</span>
                <span class="stat-value">${result.lagAtMax}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Signal Lengths</span>
                <span class="stat-value">${result.signal1Length}, ${result.signal2Length}</span>
            </div>
        </div>`;
}

function displayPearson(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">${result.interpretation}</div>
        </div>

        <h4>Scatter Plot with Regression</h4>
        <div class="chart-container"><canvas id="scatterChart"></canvas></div>

        <h4>Correlation Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Correlation (r)</span>
                <span class="stat-value">${result.correlation}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">R-squared</span>
                <span class="stat-value">${result.rSquared}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Covariance</span>
                <span class="stat-value">${result.covariance}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">t-Statistic</span>
                <span class="stat-value">${result.tStatistic}</span>
            </div>
        </div>

        <h4>Linear Regression</h4>
        <div class="regression-info">
            <p><strong>Equation:</strong> ${result.regression.equation}</p>
            <p><strong>RMSE:</strong> ${result.regression.rmse}</p>
        </div>

        <h4>Descriptive Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Mean X</span>
                <span class="stat-value">${result.stats.meanX}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Mean Y</span>
                <span class="stat-value">${result.stats.meanY}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Std X</span>
                <span class="stat-value">${result.stats.stdX}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Std Y</span>
                <span class="stat-value">${result.stats.stdY}</span>
            </div>
        </div>`;
}

function displayTimeDelay(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">${result.interpretation}</div>
        </div>

        <h4>Cross-Correlation for Delay</h4>
        <div class="chart-container"><canvas id="delayChart"></canvas></div>

        <h4>Time Delay Analysis</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Delay (samples)</span>
                <span class="stat-value">${result.delay}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Refined Delay</span>
                <span class="stat-value">${result.refinedDelay}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Correlation</span>
                <span class="stat-value">${result.correlation}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Confidence</span>
                <span class="stat-value">${result.confidence}</span>
            </div>
        </div>`;
}

function displayCorrelogram(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">${result.interpretation}</div>
        </div>

        <h4>ACF & PACF</h4>
        <div class="dual-chart-container">
            <div class="chart-box">
                <h5>Autocorrelation (ACF)</h5>
                <canvas id="acfChart"></canvas>
            </div>
            <div class="chart-box">
                <h5>Partial ACF (PACF)</h5>
                <canvas id="pacfChart"></canvas>
            </div>
        </div>

        <h4>Analysis</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Max Lag</span>
                <span class="stat-value">${result.maxLag}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">95% Bound</span>
                <span class="stat-value">±${result.confidenceBound}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Outside Bounds</span>
                <span class="stat-value">${result.outsideBounds}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">White Noise?</span>
                <span class="stat-value">${result.isWhiteNoise ? 'Yes' : 'No'}</span>
            </div>
        </div>`;
}

function drawAutocorrelationChart(result) {
    const canvas = document.getElementById('acfChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 200;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const values = result.values;
    const lags = result.lags;

    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight / 2);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight / 2);
    ctx.stroke();

    // Draw bars
    const barWidth = Math.max(2, chartWidth / values.length - 1);

    values.forEach((val, i) => {
        const x = padding.left + (i / values.length) * chartWidth;
        const barHeight = (val * chartHeight) / 2;
        const y = padding.top + chartHeight / 2;

        ctx.fillStyle = val >= 0 ? '#16a085' : '#c0392b';
        if (val >= 0) {
            ctx.fillRect(x, y - barHeight, barWidth, barHeight);
        } else {
            ctx.fillRect(x, y, barWidth, -barHeight);
        }
    });

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lag', padding.left + chartWidth / 2, height - 5);
    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ACF', 0, 0);
    ctx.restore();
}

function drawCrossCorrelationChart(result) {
    const canvas = document.getElementById('xcorrChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 200;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const values = result.values;
    const lags = result.lags;
    const maxIdx = lags.indexOf(result.lagAtMax);

    // Draw zero line
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight / 2);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight / 2);
    ctx.stroke();

    // Draw curve
    ctx.strokeStyle = '#16a085';
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((val, i) => {
        const x = padding.left + (i / (values.length - 1)) * chartWidth;
        const y = padding.top + chartHeight / 2 - (val * chartHeight / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Mark peak
    if (maxIdx >= 0) {
        const px = padding.left + (maxIdx / (values.length - 1)) * chartWidth;
        const py = padding.top + chartHeight / 2 - (values[maxIdx] * chartHeight / 2);
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lag (${lags[0]} to ${lags[lags.length - 1]})`, padding.left + chartWidth / 2, height - 5);
}

function drawScatterPlot(result) {
    const canvas = document.getElementById('scatterChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const x = result.data.x;
    const y = result.data.y;

    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const minY = Math.min(...y);
    const maxY = Math.max(...y);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Draw points
    ctx.fillStyle = 'rgba(22, 160, 133, 0.6)';
    for (let i = 0; i < x.length; i++) {
        const px = padding.left + ((x[i] - minX) / rangeX) * chartWidth;
        const py = padding.top + chartHeight - ((y[i] - minY) / rangeY) * chartHeight;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw regression line
    const slope = parseFloat(result.regression.slope);
    const intercept = parseFloat(result.regression.intercept);

    const y1 = slope * minX + intercept;
    const y2 = slope * maxX + intercept;

    const px1 = padding.left;
    const py1 = padding.top + chartHeight - ((y1 - minY) / rangeY) * chartHeight;
    const px2 = padding.left + chartWidth;
    const py2 = padding.top + chartHeight - ((y2 - minY) / rangeY) * chartHeight;

    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px1, Math.max(padding.top, Math.min(padding.top + chartHeight, py1)));
    ctx.lineTo(px2, Math.max(padding.top, Math.min(padding.top + chartHeight, py2)));
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X', padding.left + chartWidth / 2, height - 5);
    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y', 0, 0);
    ctx.restore();
}

function drawTimeDelayChart(result) {
    const canvas = document.getElementById('delayChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 200;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const xcorr = result.crossCorrelation;
    const values = xcorr.values;
    const lags = xcorr.lags;

    // Zero line
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight / 2);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight / 2);
    ctx.stroke();

    // Fill area
    ctx.fillStyle = 'rgba(22, 160, 133, 0.3)';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight / 2);

    values.forEach((val, i) => {
        const x = padding.left + (i / (values.length - 1)) * chartWidth;
        const y = padding.top + chartHeight / 2 - (val * chartHeight / 2);
        ctx.lineTo(x, y);
    });

    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight / 2);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = '#16a085';
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((val, i) => {
        const x = padding.left + (i / (values.length - 1)) * chartWidth;
        const y = padding.top + chartHeight / 2 - (val * chartHeight / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Mark delay
    const delayIdx = lags.indexOf(result.delay);
    if (delayIdx >= 0) {
        const px = padding.left + (delayIdx / (values.length - 1)) * chartWidth;
        ctx.strokeStyle = '#e74c3c';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(px, padding.top);
        ctx.lineTo(px, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#e74c3c';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Delay: ${result.delay}`, px, padding.top - 5);
    }
}

function drawCorrelogramChart(result) {
    drawBarChart('acfChart', result.acf, result.lags, result.confidenceBound, '#16a085');
    drawBarChart('pacfChart', result.pacf, result.lags, result.confidenceBound, '#2980b9');
}

function drawBarChart(canvasId, values, lags, bound, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth - 30;
    const height = 150;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 15, right: 10, bottom: 25, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    const centerY = padding.top + chartHeight / 2;

    // Confidence bounds
    const boundY1 = centerY - (parseFloat(bound) * chartHeight / 2);
    const boundY2 = centerY + (parseFloat(bound) * chartHeight / 2);

    ctx.fillStyle = 'rgba(22, 160, 133, 0.1)';
    ctx.fillRect(padding.left, boundY1, chartWidth, boundY2 - boundY1);

    // Zero line
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding.left, centerY);
    ctx.lineTo(padding.left + chartWidth, centerY);
    ctx.stroke();

    // Bound lines
    ctx.strokeStyle = '#16a085';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, boundY1);
    ctx.lineTo(padding.left + chartWidth, boundY1);
    ctx.moveTo(padding.left, boundY2);
    ctx.lineTo(padding.left + chartWidth, boundY2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bars
    const barWidth = Math.max(2, chartWidth / values.length - 1);

    values.forEach((val, i) => {
        const x = padding.left + (i / values.length) * chartWidth;
        const barHeight = (val * chartHeight) / 2;

        ctx.fillStyle = Math.abs(val) > parseFloat(bound) ? '#e74c3c' : color;
        if (val >= 0) {
            ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
        } else {
            ctx.fillRect(x, centerY, barWidth, -barHeight);
        }
    });
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('signal2Group').style.display =
        ['crosscorrelation', 'pearson', 'timedelay'].includes(calcType) ? 'block' : 'none';
    document.getElementById('maxLagGroup').style.display =
        ['autocorrelation', 'correlogram'].includes(calcType) ? 'block' : 'none';
    document.getElementById('modeGroup').style.display =
        calcType === 'crosscorrelation' ? 'block' : 'none';

    // Update labels
    const signal1Label = document.querySelector('label[for="signal1Data"]');
    if (['crosscorrelation', 'timedelay'].includes(calcType)) {
        signal1Label.textContent = 'Signal 1:';
    } else if (calcType === 'pearson') {
        signal1Label.textContent = 'X Values:';
    } else {
        signal1Label.textContent = 'Signal Data:';
    }

    const signal2Label = document.querySelector('label[for="signal2Data"]');
    if (calcType === 'pearson') {
        signal2Label.textContent = 'Y Values:';
    } else {
        signal2Label.textContent = 'Signal 2:';
    }
}

function loadSample(type) {
    const n = 100;

    if (type === 'periodic') {
        const signal = Array.from({ length: n }, (_, i) =>
            Math.sin(2 * Math.PI * 5 * i / n) + 0.5 * Math.sin(2 * Math.PI * 12 * i / n)
        );
        document.getElementById('signal1Data').value = signal.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'noisy') {
        const signal = Array.from({ length: n }, (_, i) =>
            Math.sin(2 * Math.PI * 3 * i / n) + (Math.random() - 0.5) * 0.8
        );
        document.getElementById('signal1Data').value = signal.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'delayed') {
        const delay = 15;
        const signal1 = Array.from({ length: n }, (_, i) =>
            Math.sin(2 * Math.PI * 4 * i / n) + (Math.random() - 0.5) * 0.3
        );
        const signal2 = Array.from({ length: n }, (_, i) =>
            Math.sin(2 * Math.PI * 4 * (i - delay) / n) + (Math.random() - 0.5) * 0.3
        );
        document.getElementById('signal1Data').value = signal1.map(v => v.toFixed(4)).join(', ');
        document.getElementById('signal2Data').value = signal2.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'correlated') {
        const x = Array.from({ length: 50 }, () => Math.random() * 10);
        const y = x.map(v => 2 * v + 3 + (Math.random() - 0.5) * 2);
        document.getElementById('signal1Data').value = x.map(v => v.toFixed(3)).join(', ');
        document.getElementById('signal2Data').value = y.map(v => v.toFixed(3)).join(', ');
    } else if (type === 'whitenoise') {
        const signal = Array.from({ length: n }, () => (Math.random() - 0.5) * 2);
        document.getElementById('signal1Data').value = signal.map(v => v.toFixed(4)).join(', ');
    }
}

// Initialize
updateOptions();
