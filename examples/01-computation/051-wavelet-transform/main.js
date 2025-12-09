/**
 * Main Thread: Wavelet Transform Calculator
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

    const signal = parseSignal();
    if (!signal) return;

    const wavelet = document.getElementById('wavelet').value;
    const level = parseInt(document.getElementById('level').value) || 3;

    if (calcType === 'dwt') {
        worker.postMessage({ type: 'dwt', data: { signal, wavelet, level } });
    } else if (calcType === 'decompose') {
        worker.postMessage({ type: 'decompose', data: { signal, wavelet, level } });
    } else if (calcType === 'denoise') {
        const threshold = document.getElementById('thresholdType').value;
        worker.postMessage({ type: 'denoise', data: { signal, wavelet, threshold, level } });
    } else if (calcType === 'cwt') {
        const minScale = parseFloat(document.getElementById('minScale').value) || 1;
        const maxScale = parseFloat(document.getElementById('maxScale').value) || 32;
        const numScales = parseInt(document.getElementById('numScales').value) || 32;
        const scales = [];
        for (let i = 0; i < numScales; i++) {
            scales.push(minScale + (maxScale - minScale) * i / (numScales - 1));
        }
        worker.postMessage({ type: 'cwt', data: { signal, wavelet: 'morlet', scales } });
    }
}

function parseSignal() {
    const input = document.getElementById('signalData').value.trim();
    const signal = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (signal.length < 8) {
        resultsDiv.innerHTML = '<div class="error">Need at least 8 signal values</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return signal;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Wavelet Transform Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'dwt') {
        html += displayDWT(result);
    } else if (calculationType === 'decompose') {
        html += displayDecomposition(result);
    } else if (calculationType === 'denoise') {
        html += displayDenoise(result);
    } else if (calculationType === 'cwt') {
        html += displayCWT(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw charts
    setTimeout(() => {
        if (calculationType === 'dwt' || calculationType === 'decompose') {
            drawCoefficientsChart(result);
        }
        if (calculationType === 'denoise') {
            drawDenoiseChart(result);
        }
        if (calculationType === 'cwt') {
            drawScalogramChart(result);
        }
    }, 100);
}

function displayDWT(result) {
    let html = `
        <div class="method-display">
            <div class="method-name">${result.wavelet} Wavelet</div>
            <div class="method-info">DWT Level ${result.level}</div>
        </div>

        <h4>Coefficients</h4>
        <div class="chart-container"><canvas id="coeffChart"></canvas></div>

        <h4>Energy Distribution</h4>
        <div class="energy-grid">
            <div class="energy-item approx">
                <span class="energy-label">Approximation (A${result.level})</span>
                <span class="energy-value">${result.energyDistribution.approximation}</span>
                <div class="energy-bar">
                    <div class="energy-fill" style="width: ${result.energyDistribution.approximation}"></div>
                </div>
            </div>
            ${result.energyDistribution.details.map((e, i) => `
                <div class="energy-item detail">
                    <span class="energy-label">Detail (D${result.level - i})</span>
                    <span class="energy-value">${e}</span>
                    <div class="energy-bar">
                        <div class="energy-fill detail-fill" style="width: ${e}"></div>
                    </div>
                </div>
            `).join('')}
        </div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Original Length</span>
                <span class="stat-value">${result.originalLength}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Approx. Length</span>
                <span class="stat-value">${result.approximation.length}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Decomposition Level</span>
                <span class="stat-value">${result.level}</span>
            </div>
        </div>`;

    return html;
}

function displayDecomposition(result) {
    let html = `
        <div class="method-display">
            <div class="method-name">${result.wavelet} Wavelet</div>
            <div class="method-info">Multi-Level Decomposition</div>
        </div>

        <h4>Decomposition Levels</h4>
        <div class="chart-container"><canvas id="coeffChart"></canvas></div>

        <h4>Energy per Level</h4>
        <div class="table-container">
            <table class="level-table">
                <thead>
                    <tr>
                        <th>Level</th>
                        <th>Approx. Energy</th>
                        <th>Detail Energy</th>
                        <th>% of Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.levels.map(l => `
                        <tr>
                            <td>${l.level}</td>
                            <td>${formatNumber(l.approxEnergy)}</td>
                            <td>${formatNumber(l.detailEnergy)}</td>
                            <td>${((l.detailEnergy / result.totalEnergy) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    return html;
}

function displayDenoise(result) {
    let html = `
        <div class="method-display">
            <div class="method-name">Wavelet Denoising</div>
            <div class="method-info">${result.wavelet} - ${result.thresholdType} threshold</div>
        </div>

        <h4>Original vs Denoised</h4>
        <div class="chart-container"><canvas id="denoiseChart"></canvas></div>

        <h4>Denoising Parameters</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Threshold</span>
                <span class="stat-value">${result.threshold}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Threshold Type</span>
                <span class="stat-value">${result.thresholdType}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">SNR Improvement</span>
                <span class="stat-value">${result.snrImprovement}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Level</span>
                <span class="stat-value">${result.level}</span>
            </div>
        </div>`;

    return html;
}

function displayCWT(result) {
    let html = `
        <div class="method-display">
            <div class="method-name">Continuous Wavelet Transform</div>
            <div class="method-info">Morlet Wavelet</div>
        </div>

        <h4>Scalogram</h4>
        <div class="chart-container"><canvas id="scalogramChart"></canvas></div>

        <h4>Analysis</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Signal Length</span>
                <span class="stat-value">${result.signalLength}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Scale Range</span>
                <span class="stat-value">${result.scales[0].toFixed(1)} - ${result.scales[result.scales.length - 1].toFixed(1)}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Number of Scales</span>
                <span class="stat-value">${result.scales.length}</span>
            </div>
        </div>`;

    return html;
}

function drawCoefficientsChart(result) {
    const canvas = document.getElementById('coeffChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 300;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Get data
    const approx = result.approximation || (result.levels && result.levels[result.levels.length - 1].approximation);
    const details = result.details || (result.levels && result.levels.map(l => l.detail));

    if (!approx || !details) return;

    const numPlots = 1 + details.length;
    const plotHeight = (height - padding.top - padding.bottom) / numPlots;

    // Draw approximation
    drawSignalLine(ctx, approx, padding.left, padding.top, chartWidth, plotHeight * 0.8, '#8e44ad');
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.fillText('A' + (result.level || details.length), padding.left + 5, padding.top + 12);

    // Draw details
    details.forEach((detail, i) => {
        const y = padding.top + plotHeight * (i + 1);
        drawSignalLine(ctx, detail, padding.left, y, chartWidth, plotHeight * 0.8, '#e74c3c');
        ctx.fillStyle = '#666';
        ctx.fillText('D' + (details.length - i), padding.left + 5, y + 12);
    });
}

function drawSignalLine(ctx, data, x, y, width, height, color) {
    if (!data || data.length === 0) return;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
        const px = x + (i / (data.length - 1)) * width;
        const py = y + height - ((data[i] - minVal) / range) * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }

    ctx.stroke();
}

function drawDenoiseChart(result) {
    const canvas = document.getElementById('denoiseChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const original = result.original;
    const denoised = result.denoised;

    const allValues = [...original, ...denoised];
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.1;
    maxVal += range * 0.1;

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw original (faded)
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < original.length; i++) {
        const x = padding.left + (i / (original.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((original[i] - minVal) / (maxVal - minVal)) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw denoised
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < denoised.length; i++) {
        const x = padding.left + (i / (denoised.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((denoised[i] - minVal) / (maxVal - minVal)) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#999';
    ctx.fillText('Original', padding.left + 10, 15);
    ctx.fillStyle = '#8e44ad';
    ctx.fillText('Denoised', padding.left + 70, 15);
}

function drawScalogramChart(result) {
    const canvas = document.getElementById('scalogramChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 60, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const scalogram = result.scalogram;
    const numScales = scalogram.length;
    const signalLength = scalogram[0].length;

    // Find max value for normalization
    let maxVal = 0;
    for (const row of scalogram) {
        for (const v of row) {
            if (v > maxVal) maxVal = v;
        }
    }

    // Draw heatmap
    const cellWidth = chartWidth / signalLength;
    const cellHeight = chartHeight / numScales;

    for (let s = 0; s < numScales; s++) {
        for (let t = 0; t < signalLength; t++) {
            const value = scalogram[s][t] / maxVal;
            const color = getHeatmapColor(value);
            ctx.fillStyle = color;
            ctx.fillRect(
                padding.left + t * cellWidth,
                padding.top + (numScales - 1 - s) * cellHeight,
                Math.ceil(cellWidth),
                Math.ceil(cellHeight)
            );
        }
    }

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time', width / 2, height - 5);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Scale', 0, 0);
    ctx.restore();

    // Color bar
    const barX = width - 40;
    const barHeight = chartHeight;
    for (let i = 0; i < barHeight; i++) {
        const value = 1 - i / barHeight;
        ctx.fillStyle = getHeatmapColor(value);
        ctx.fillRect(barX, padding.top + i, 15, 1);
    }
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('High', barX + 20, padding.top + 10);
    ctx.fillText('Low', barX + 20, padding.top + barHeight);
}

function getHeatmapColor(value) {
    // Blue -> Cyan -> Green -> Yellow -> Red
    const colors = [
        [0, 0, 139],      // Dark blue
        [0, 139, 139],    // Cyan
        [0, 128, 0],      // Green
        [255, 255, 0],    // Yellow
        [255, 0, 0]       // Red
    ];

    const idx = value * (colors.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const t = idx - lower;

    const r = Math.round(colors[lower][0] + t * (colors[upper][0] - colors[lower][0]));
    const g = Math.round(colors[lower][1] + t * (colors[upper][1] - colors[lower][1]));
    const b = Math.round(colors[lower][2] + t * (colors[upper][2] - colors[lower][2]));

    return `rgb(${r}, ${g}, ${b})`;
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 10000) return num.toExponential(2);
    if (Math.abs(num) >= 1) return num.toFixed(2);
    return num.toFixed(4);
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('thresholdGroup').style.display = calcType === 'denoise' ? 'block' : 'none';
    document.getElementById('cwtOptions').style.display = calcType === 'cwt' ? 'block' : 'none';
    document.getElementById('waveletGroup').style.display = calcType !== 'cwt' ? 'block' : 'none';
}

function loadSample(type) {
    let signal;
    switch (type) {
        case 'sine':
            signal = Array.from({ length: 128 }, (_, i) => Math.sin(2 * Math.PI * 5 * i / 128));
            break;
        case 'noisy':
            signal = Array.from({ length: 128 }, (_, i) =>
                Math.sin(2 * Math.PI * 5 * i / 128) + (Math.random() - 0.5) * 0.8
            );
            break;
        case 'step':
            signal = Array.from({ length: 128 }, (_, i) => i < 64 ? 0 : 1);
            break;
        default:
            signal = [1, 0, -1, 0, 1, 0, -1, 0];
    }
    document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
}

// Initialize
updateOptions();
