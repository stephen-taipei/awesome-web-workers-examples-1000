/**
 * Main Thread: Hilbert Transform
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
    const signal = parseSignal();

    if (!signal) return;

    calculateBtn.disabled = true;
    resultsDiv.innerHTML = '<p>Calculating...</p>';

    const sampleRate = parseInt(document.getElementById('sampleRate').value) || 1000;

    worker.postMessage({ type: calcType, data: { signal, sampleRate } });
}

function parseSignal() {
    const input = document.getElementById('signalData').value.trim();
    const signal = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (signal.length < 8) {
        resultsDiv.innerHTML = '<div class="error">Need at least 8 data points</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return signal;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Hilbert Transform Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'hilbert':
            html += displayHilbert(result);
            break;
        case 'envelope':
            html += displayEnvelope(result);
            break;
        case 'instantaneous':
            html += displayInstantaneous(result);
            break;
        case 'hht':
            html += displayHHT(result);
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw charts
    setTimeout(() => {
        switch (calculationType) {
            case 'hilbert':
                drawHilbertChart(result);
                break;
            case 'envelope':
                drawEnvelopeChart(result);
                break;
            case 'instantaneous':
                drawInstantaneousCharts(result);
                break;
            case 'hht':
                drawHHTCharts(result);
                break;
        }
    }, 100);
}

function displayHilbert(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Analytic Signal Computation</div>
        </div>

        <h4>Signal Comparison</h4>
        <div class="chart-container"><canvas id="hilbertChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Signal Length</span>
                <span class="stat-value">${result.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Original RMS</span>
                <span class="stat-value">${result.stats.originalRMS}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Hilbert RMS</span>
                <span class="stat-value">${result.stats.hilbertRMS}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Correlation</span>
                <span class="stat-value">${result.stats.correlation}</span>
            </div>
        </div>

        <div class="info-box">
            <p><strong>Note:</strong> The Hilbert transform shifts the signal by 90° in phase. For a sine wave, the Hilbert transform produces a cosine wave.</p>
        </div>`;
}

function displayEnvelope(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Instantaneous Amplitude Detection</div>
        </div>

        <h4>Envelope Detection</h4>
        <div class="chart-container"><canvas id="envelopeChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Mean Envelope</span>
                <span class="stat-value">${result.stats.meanEnvelope}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Max Envelope</span>
                <span class="stat-value">${result.stats.maxEnvelope}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Min Envelope</span>
                <span class="stat-value">${result.stats.minEnvelope}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Peak Count</span>
                <span class="stat-value">${result.stats.peakCount}</span>
            </div>
        </div>`;
}

function displayInstantaneous(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Sample Rate: ${result.sampleRate} Hz</div>
        </div>

        <h4>Instantaneous Amplitude</h4>
        <div class="chart-container"><canvas id="amplitudeChart"></canvas></div>

        <h4>Instantaneous Phase</h4>
        <div class="chart-container"><canvas id="phaseChart"></canvas></div>

        <h4>Instantaneous Frequency</h4>
        <div class="chart-container"><canvas id="frequencyChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Mean Amplitude</span>
                <span class="stat-value">${result.stats.meanAmplitude}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Mean Frequency</span>
                <span class="stat-value">${result.stats.meanFrequency} Hz</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Max Frequency</span>
                <span class="stat-value">${result.stats.maxFrequency} Hz</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Min Frequency</span>
                <span class="stat-value">${result.stats.minFrequency} Hz</span>
            </div>
        </div>`;
}

function displayHHT(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Empirical Mode Decomposition + Hilbert Spectral Analysis</div>
        </div>

        <h4>Intrinsic Mode Functions (IMFs)</h4>
        <div class="chart-container"><canvas id="imfChart"></canvas></div>

        <h4>Hilbert Spectrum</h4>
        <div class="chart-container"><canvas id="spectrumChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Number of IMFs</span>
                <span class="stat-value">${result.stats.numIMFs}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Energy</span>
                <span class="stat-value">${result.stats.totalEnergy}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Dominant Freq</span>
                <span class="stat-value">${result.stats.dominantFreq} Hz</span>
            </div>
        </div>

        <h4>IMF Details</h4>
        <div class="imf-list">
            ${result.hilbertSpectrum.map(h => `
                <div class="imf-item">
                    <span class="imf-label">IMF ${h.imfIndex}</span>
                    <span class="imf-freq">${h.meanFreq} Hz</span>
                    <span class="imf-energy">E: ${h.energy.toFixed(2)}</span>
                </div>
            `).join('')}
        </div>`;
}

function drawHilbertChart(result) {
    const canvas = document.getElementById('hilbertChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const original = result.original;
    const hilbert = result.hilbert;

    const allValues = [...original, ...hilbert];
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.1;
    maxVal += range * 0.1;

    // Draw original
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    drawLine(ctx, original, padding, chartWidth, chartHeight, minVal, maxVal);

    // Draw Hilbert transform
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    drawLine(ctx, hilbert, padding, chartWidth, chartHeight, minVal, maxVal);

    // Legend
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#3498db';
    ctx.fillText('Original', padding.left + 10, 15);
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('Hilbert Transform', padding.left + 80, 15);
}

function drawEnvelopeChart(result) {
    const canvas = document.getElementById('envelopeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const original = result.original;
    const envelope = result.envelope;

    const allValues = [...original, ...envelope];
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.1;
    maxVal += range * 0.1;

    // Fill envelope area
    ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight / 2);

    for (let i = 0; i < envelope.length; i++) {
        const x = padding.left + (i / (envelope.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((envelope[i] - minVal) / (maxVal - minVal)) * chartHeight;
        ctx.lineTo(x, y);
    }

    for (let i = envelope.length - 1; i >= 0; i--) {
        const x = padding.left + (i / (envelope.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((-envelope[i] - minVal) / (maxVal - minVal)) * chartHeight;
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw original signal
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1.5;
    drawLine(ctx, original, padding, chartWidth, chartHeight, minVal, maxVal);

    // Draw envelope
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 2;
    drawLine(ctx, envelope, padding, chartWidth, chartHeight, minVal, maxVal);

    // Draw negative envelope
    const negEnvelope = envelope.map(v => -v);
    drawLine(ctx, negEnvelope, padding, chartWidth, chartHeight, minVal, maxVal);

    // Legend
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#3498db';
    ctx.fillText('Signal', padding.left + 10, 15);
    ctx.fillStyle = '#9b59b6';
    ctx.fillText('Envelope', padding.left + 60, 15);
}

function drawInstantaneousCharts(result) {
    // Amplitude chart
    drawSingleChart('amplitudeChart', result.original, result.amplitude,
        '#3498db', '#9b59b6', 'Signal', 'Amplitude');

    // Phase chart
    const phaseCanvas = document.getElementById('phaseChart');
    if (phaseCanvas) {
        const ctx = phaseCanvas.getContext('2d');
        const width = phaseCanvas.parentElement.clientWidth;
        const height = 150;

        phaseCanvas.width = width;
        phaseCanvas.height = height;

        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        const phase = result.unwrappedPhase;
        const minVal = Math.min(...phase);
        const maxVal = Math.max(...phase);

        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        drawLine(ctx, phase, padding, chartWidth, chartHeight, minVal, maxVal);

        ctx.fillStyle = '#27ae60';
        ctx.font = '11px sans-serif';
        ctx.fillText('Unwrapped Phase (rad)', padding.left + 10, 15);
    }

    // Frequency chart
    const freqCanvas = document.getElementById('frequencyChart');
    if (freqCanvas) {
        const ctx = freqCanvas.getContext('2d');
        const width = freqCanvas.parentElement.clientWidth;
        const height = 150;

        freqCanvas.width = width;
        freqCanvas.height = height;

        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        const freq = result.frequency;
        const minVal = 0;
        const maxVal = Math.max(...freq) * 1.1;

        // Fill area
        ctx.fillStyle = 'rgba(230, 126, 34, 0.3)';
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);

        for (let i = 0; i < freq.length; i++) {
            const x = padding.left + (i / (freq.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((freq[i] - minVal) / (maxVal - minVal)) * chartHeight;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        drawLine(ctx, freq, padding, chartWidth, chartHeight, minVal, maxVal);

        ctx.fillStyle = '#e67e22';
        ctx.font = '11px sans-serif';
        ctx.fillText('Instantaneous Frequency (Hz)', padding.left + 10, 15);
    }
}

function drawHHTCharts(result) {
    // IMF chart
    const imfCanvas = document.getElementById('imfChart');
    if (imfCanvas) {
        const ctx = imfCanvas.getContext('2d');
        const width = imfCanvas.parentElement.clientWidth;
        const numIMFs = result.imfs.length;
        const plotHeight = 60;
        const height = (numIMFs + 1) * plotHeight + 40;

        imfCanvas.width = width;
        imfCanvas.height = height;

        const padding = { left: 60, right: 20 };
        const chartWidth = width - padding.left - padding.right;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        const colors = ['#3498db', '#e74c3c', '#27ae60', '#9b59b6', '#f39c12'];

        // Draw original
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.fillText('Original', 5, 35);

        const origMin = Math.min(...result.original);
        const origMax = Math.max(...result.original);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        drawLineInRegion(ctx, result.original, padding.left, 10, chartWidth, plotHeight - 15, origMin, origMax);

        // Draw IMFs
        result.imfs.forEach((imf, idx) => {
            const yOffset = (idx + 1) * plotHeight + 10;
            ctx.fillStyle = '#666';
            ctx.fillText(`IMF ${idx + 1}`, 5, yOffset + 25);

            const minVal = Math.min(...imf);
            const maxVal = Math.max(...imf);
            ctx.strokeStyle = colors[idx % colors.length];
            ctx.lineWidth = 1.5;
            drawLineInRegion(ctx, imf, padding.left, yOffset, chartWidth, plotHeight - 15, minVal, maxVal);
        });
    }

    // Spectrum chart (time-frequency)
    const specCanvas = document.getElementById('spectrumChart');
    if (specCanvas) {
        const ctx = specCanvas.getContext('2d');
        const width = specCanvas.parentElement.clientWidth;
        const height = 200;

        specCanvas.width = width;
        specCanvas.height = height;

        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        const colors = ['rgba(52, 152, 219, 0.7)', 'rgba(231, 76, 60, 0.7)',
                       'rgba(39, 174, 96, 0.7)', 'rgba(155, 89, 182, 0.7)'];

        // Find max frequency for scaling
        let maxFreq = 0;
        result.hilbertSpectrum.forEach(h => {
            maxFreq = Math.max(maxFreq, Math.max(...h.frequency));
        });

        // Draw each IMF's instantaneous frequency
        result.hilbertSpectrum.forEach((h, idx) => {
            const freq = h.frequency;
            const amp = h.amplitude;
            const n = freq.length;

            ctx.fillStyle = colors[idx % colors.length];

            for (let i = 0; i < n; i += 2) {
                const x = padding.left + (i / n) * chartWidth;
                const y = padding.top + chartHeight - (freq[i] / maxFreq) * chartHeight;
                const size = Math.max(2, Math.min(8, amp[i] * 5));

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Time', padding.left + chartWidth / 2, height - 5);
        ctx.save();
        ctx.translate(15, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Frequency (Hz)', 0, 0);
        ctx.restore();
    }
}

function drawSingleChart(canvasId, data1, data2, color1, color2, label1, label2) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 150;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 20, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const allValues = [...data1, ...data2];
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.1;
    maxVal += range * 0.1;

    ctx.strokeStyle = color1;
    ctx.lineWidth = 1;
    drawLine(ctx, data1, padding, chartWidth, chartHeight, minVal, maxVal);

    ctx.strokeStyle = color2;
    ctx.lineWidth = 2;
    drawLine(ctx, data2, padding, chartWidth, chartHeight, minVal, maxVal);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = color1;
    ctx.fillText(label1, padding.left + 5, 12);
    ctx.fillStyle = color2;
    ctx.fillText(label2, padding.left + 55, 12);
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

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('sampleRateGroup').style.display =
        ['instantaneous', 'hht'].includes(calcType) ? 'block' : 'none';
}

function loadSample(type) {
    const n = 256;
    let signal;

    if (type === 'am') {
        // Amplitude modulated signal
        signal = Array.from({ length: n }, (_, i) => {
            const t = i / n;
            const carrier = Math.sin(2 * Math.PI * 50 * t);
            const modulator = 0.5 + 0.5 * Math.sin(2 * Math.PI * 5 * t);
            return carrier * modulator;
        });
    } else if (type === 'fm') {
        // Frequency modulated signal
        signal = Array.from({ length: n }, (_, i) => {
            const t = i / n;
            const phase = 2 * Math.PI * 30 * t + 5 * Math.sin(2 * Math.PI * 3 * t);
            return Math.sin(phase);
        });
    } else if (type === 'chirp') {
        // Chirp signal (frequency sweep)
        signal = Array.from({ length: n }, (_, i) => {
            const t = i / n;
            const f0 = 5, f1 = 50;
            const phase = 2 * Math.PI * (f0 * t + (f1 - f0) * t * t / 2);
            return Math.sin(phase);
        });
    } else if (type === 'multicomp') {
        // Multi-component signal
        signal = Array.from({ length: n }, (_, i) => {
            const t = i / n;
            return Math.sin(2 * Math.PI * 10 * t) +
                   0.5 * Math.sin(2 * Math.PI * 30 * t) +
                   0.3 * Math.sin(2 * Math.PI * 60 * t);
        });
    }

    document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
}

// Initialize
updateOptions();
