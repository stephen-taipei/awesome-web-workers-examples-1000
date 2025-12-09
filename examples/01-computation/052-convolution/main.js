/**
 * Main Thread: Convolution Calculator
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

    if (calcType === 'filter1d') {
        const signal = parseSignal();
        if (!signal) return;
        const filterType = document.getElementById('filter1d').value;
        worker.postMessage({ type: 'filter1d', data: { signal, filterType } });
    } else if (calcType === 'filter2d') {
        const matrix = parseMatrix();
        if (!matrix) return;
        const filterType = document.getElementById('filter2d').value;
        worker.postMessage({ type: 'filter2d', data: { matrix, filterType } });
    } else if (calcType === 'custom1d') {
        const signal = parseSignal();
        const kernel = parseKernel();
        if (!signal || !kernel) return;
        worker.postMessage({ type: 'custom', data: { signal, kernel } });
    } else if (calcType === 'convolve2d') {
        const matrix = parseMatrix();
        const kernel = parseKernel2D();
        if (!matrix || !kernel) return;
        const mode = document.getElementById('mode').value;
        worker.postMessage({ type: 'convolve2d', data: { matrix, kernel, mode } });
    }
}

function parseSignal() {
    const input = document.getElementById('signalData').value.trim();
    const signal = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (signal.length < 3) {
        resultsDiv.innerHTML = '<div class="error">Need at least 3 signal values</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return signal;
}

function parseKernel() {
    const input = document.getElementById('kernelData').value.trim();
    const kernel = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (kernel.length < 1) {
        resultsDiv.innerHTML = '<div class="error">Need at least 1 kernel value</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return kernel;
}

function parseMatrix() {
    const input = document.getElementById('matrixData').value.trim();
    const rows = input.split(/[;\n]+/).filter(r => r.trim());
    const matrix = rows.map(row =>
        row.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v))
    );

    if (matrix.length < 3 || matrix[0].length < 3) {
        resultsDiv.innerHTML = '<div class="error">Need at least 3x3 matrix</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return matrix;
}

function parseKernel2D() {
    const input = document.getElementById('kernel2dData').value.trim();
    const rows = input.split(/[;\n]+/).filter(r => r.trim());
    const kernel = rows.map(row =>
        row.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v))
    );

    if (kernel.length < 1) {
        resultsDiv.innerHTML = '<div class="error">Invalid kernel</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return kernel;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Convolution Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'filter1d' || calculationType === 'custom') {
        html += display1DResult(result, calculationType);
    } else if (calculationType === 'filter2d' || calculationType === 'convolve2d') {
        html += display2DResult(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw charts
    setTimeout(() => {
        if (calculationType === 'filter1d') {
            draw1DChart(result);
        } else if (calculationType === 'custom') {
            drawCustomChart(result);
        } else if (calculationType === 'filter2d' || calculationType === 'convolve2d') {
            draw2DChart(result);
        }
    }, 100);
}

function display1DResult(result, calcType) {
    let html = `
        <div class="method-display">
            <div class="method-name">${result.filterName || '1D Convolution'}</div>
            <div class="method-info">Mode: ${result.mode}</div>
        </div>

        <h4>Kernel</h4>
        <div class="kernel-display">
            ${result.kernel.map(v => `<span class="kernel-value">${formatNumber(v)}</span>`).join('')}
        </div>

        <h4>Signal Comparison</h4>
        <div class="chart-container"><canvas id="convChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Input Length</span>
                <span class="stat-value">${result.inputLength}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Output Length</span>
                <span class="stat-value">${result.outputLength}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Max |Value|</span>
                <span class="stat-value">${result.stats.maxAbsValue}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">RMS</span>
                <span class="stat-value">${result.stats.rms}</span>
            </div>
        </div>`;

    return html;
}

function display2DResult(result) {
    let html = `
        <div class="method-display">
            <div class="method-name">${result.filterName || '2D Convolution'}</div>
            <div class="method-info">Mode: ${result.mode}</div>
        </div>

        <h4>Kernel</h4>
        <div class="kernel-2d-display">
            ${result.kernel.map(row => `
                <div class="kernel-row">
                    ${row.map(v => `<span class="kernel-value">${formatNumber(v)}</span>`).join('')}
                </div>
            `).join('')}
        </div>

        <h4>Result Visualization</h4>
        <div class="dual-chart-container">
            <div class="chart-box">
                <h5>Original</h5>
                <canvas id="originalMatrix"></canvas>
            </div>
            <div class="chart-box">
                <h5>Convolved</h5>
                <canvas id="outputMatrix"></canvas>
            </div>
        </div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Input Size</span>
                <span class="stat-value">${result.inputSize}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Output Size</span>
                <span class="stat-value">${result.outputSize}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Min</span>
                <span class="stat-value">${result.stats.min}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Max</span>
                <span class="stat-value">${result.stats.max}</span>
            </div>
        </div>`;

    return html;
}

function draw1DChart(result) {
    const canvas = document.getElementById('convChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 200;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const original = result.original;
    const output = result.output;

    const allValues = [...original, ...output];
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.1;
    maxVal += range * 0.1;

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw original
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    drawLine(ctx, original, padding, chartWidth, chartHeight, minVal, maxVal);

    // Draw output
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 2;
    drawLine(ctx, output, padding, chartWidth, chartHeight, minVal, maxVal);

    // Legend
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#999';
    ctx.fillText('Original', padding.left + 10, 15);
    ctx.fillStyle = '#e67e22';
    ctx.fillText('Convolved', padding.left + 70, 15);
}

function drawCustomChart(result) {
    const canvas = document.getElementById('convChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const plotHeight = (height - padding.top - padding.bottom) / 2;

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const original = result.original;
    const same = result.results.same.output;

    // Calculate bounds
    const allValues = [...original, ...same];
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.1;
    maxVal += range * 0.1;

    // Draw original (top)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    drawLineInRegion(ctx, original, padding.left, padding.top, chartWidth, plotHeight * 0.8, minVal, maxVal);
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.fillText('Original', padding.left + 5, padding.top + 12);

    // Draw convolved (bottom)
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 2;
    drawLineInRegion(ctx, same, padding.left, padding.top + plotHeight, chartWidth, plotHeight * 0.8, minVal, maxVal);
    ctx.fillStyle = '#e67e22';
    ctx.fillText('Convolved (same)', padding.left + 5, padding.top + plotHeight + 12);
}

function drawLine(ctx, data, padding, width, height, minVal, maxVal) {
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (i / (data.length - 1)) * width;
        const y = padding.top + height - ((data[i] - minVal) / (maxVal - minVal)) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function drawLineInRegion(ctx, data, x, y, width, height, minVal, maxVal) {
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const px = x + (i / (data.length - 1)) * width;
        const py = y + height - ((data[i] - minVal) / (maxVal - minVal)) * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

function draw2DChart(result) {
    const originalCanvas = document.getElementById('originalMatrix');
    const outputCanvas = document.getElementById('outputMatrix');

    if (!originalCanvas || !outputCanvas) return;

    drawMatrix(originalCanvas, result.original);
    drawMatrix(outputCanvas, result.output);
}

function drawMatrix(canvas, matrix) {
    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.parentElement.clientWidth - 20, 200);

    canvas.width = size;
    canvas.height = size;

    const rows = matrix.length;
    const cols = matrix[0].length;
    const cellWidth = size / cols;
    const cellHeight = size / rows;

    // Find min/max for normalization
    let minVal = Infinity, maxVal = -Infinity;
    for (const row of matrix) {
        for (const v of row) {
            minVal = Math.min(minVal, v);
            maxVal = Math.max(maxVal, v);
        }
    }
    const range = maxVal - minVal || 1;

    // Draw cells
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const value = (matrix[i][j] - minVal) / range;
            const gray = Math.round(value * 255);
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
            ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
        }
    }
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    if (Number.isInteger(num)) return num.toString();
    if (Math.abs(num) >= 1) return num.toFixed(2);
    return num.toFixed(4);
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('signal1dGroup').style.display =
        ['filter1d', 'custom1d'].includes(calcType) ? 'block' : 'none';
    document.getElementById('filter1dGroup').style.display =
        calcType === 'filter1d' ? 'block' : 'none';
    document.getElementById('kernel1dGroup').style.display =
        calcType === 'custom1d' ? 'block' : 'none';
    document.getElementById('matrix2dGroup').style.display =
        ['filter2d', 'convolve2d'].includes(calcType) ? 'block' : 'none';
    document.getElementById('filter2dGroup').style.display =
        calcType === 'filter2d' ? 'block' : 'none';
    document.getElementById('kernel2dGroup').style.display =
        calcType === 'convolve2d' ? 'block' : 'none';
    document.getElementById('modeGroup').style.display =
        calcType === 'convolve2d' ? 'block' : 'none';
}

function loadSample(type) {
    if (type === 'signal') {
        document.getElementById('signalData').value =
            '0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0';
    } else if (type === 'noisy') {
        const signal = Array.from({ length: 50 }, (_, i) =>
            Math.sin(2 * Math.PI * 3 * i / 50) + (Math.random() - 0.5) * 0.5
        );
        document.getElementById('signalData').value = signal.map(v => v.toFixed(3)).join(', ');
    } else if (type === 'matrix') {
        document.getElementById('matrixData').value =
            '0, 0, 0, 0, 0; 0, 1, 1, 1, 0; 0, 1, 1, 1, 0; 0, 1, 1, 1, 0; 0, 0, 0, 0, 0';
    } else if (type === 'gradient') {
        const matrix = [];
        for (let i = 0; i < 8; i++) {
            const row = [];
            for (let j = 0; j < 8; j++) {
                row.push((i + j) / 14);
            }
            matrix.push(row.map(v => v.toFixed(2)).join(', '));
        }
        document.getElementById('matrixData').value = matrix.join('; ');
    }
}

// Initialize
updateOptions();
