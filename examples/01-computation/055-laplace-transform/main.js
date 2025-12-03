/**
 * Main Thread: Laplace Transform
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

    if (calcType === 'numerical') {
        const signal = parseSignal();
        if (!signal) return;

        const dt = parseFloat(document.getElementById('dt').value) || 0.01;
        const sigmaRange = parseFloat(document.getElementById('sigmaRange').value) || 2;
        const omegaRange = parseFloat(document.getElementById('omegaRange').value) || 10;

        // Generate s values
        const sValues = [];
        for (let sigma = -sigmaRange; sigma <= sigmaRange; sigma += 0.5) {
            for (let omega = -omegaRange; omega <= omegaRange; omega += 1) {
                sValues.push({ re: sigma, im: omega });
            }
        }

        worker.postMessage({ type: 'numerical', data: { signal, sValues, dt } });
    } else if (calcType === 'transferfunction') {
        const numerator = parseCoefficients('numerator');
        const denominator = parseCoefficients('denominator');
        if (!numerator || !denominator) return;

        const fMin = parseFloat(document.getElementById('fMin').value) || 0.01;
        const fMax = parseFloat(document.getElementById('fMax').value) || 100;
        const frequencies = generateLogSpace(fMin, fMax, 200);

        worker.postMessage({ type: 'transferfunction', data: { numerator, denominator, frequencies } });
    } else if (calcType === 'impulse' || calcType === 'step') {
        const numerator = parseCoefficients('numerator');
        const denominator = parseCoefficients('denominator');
        if (!numerator || !denominator) return;

        const duration = parseFloat(document.getElementById('duration').value) || 5;
        const dt = parseFloat(document.getElementById('dt').value) || 0.01;

        worker.postMessage({ type: calcType, data: { numerator, denominator, duration, dt } });
    } else if (calcType === 'poles') {
        const numerator = parseCoefficients('numerator');
        const denominator = parseCoefficients('denominator');
        if (!numerator || !denominator) return;

        worker.postMessage({ type: 'poles', data: { numerator, denominator } });
    }
}

function parseSignal() {
    const input = document.getElementById('signalData').value.trim();
    const signal = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (signal.length < 5) {
        resultsDiv.innerHTML = '<div class="error">Need at least 5 data points</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return signal;
}

function parseCoefficients(inputId) {
    const input = document.getElementById(inputId).value.trim();
    const coeffs = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (coeffs.length < 1) {
        resultsDiv.innerHTML = `<div class="error">Invalid ${inputId} coefficients</div>`;
        calculateBtn.disabled = false;
        return null;
    }

    return coeffs;
}

function generateLogSpace(min, max, n) {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const step = (logMax - logMin) / (n - 1);

    return Array.from({ length: n }, (_, i) => Math.pow(10, logMin + i * step));
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Laplace Transform Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'numerical':
            html += displayNumerical(result);
            break;
        case 'transferfunction':
            html += displayTransferFunction(result);
            break;
        case 'impulse':
            html += displayImpulse(result);
            break;
        case 'step':
            html += displayStep(result);
            break;
        case 'poles':
            html += displayPoles(result);
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    setTimeout(() => {
        switch (calculationType) {
            case 'numerical':
                drawNumericalChart(result);
                break;
            case 'transferfunction':
                drawBodePlot(result);
                break;
            case 'impulse':
            case 'step':
                drawResponseChart(result);
                break;
            case 'poles':
                drawPoleZeroMap(result);
                break;
        }
    }, 100);
}

function displayNumerical(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Signal Duration: ${result.stats.duration}s, Δt: ${result.dt}s</div>
        </div>

        <h4>Laplace Domain Magnitude</h4>
        <div class="chart-container"><canvas id="laplaceChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Signal Length</span>
                <span class="stat-value">${result.stats.signalLength}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Duration</span>
                <span class="stat-value">${result.stats.duration}s</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">s-Values Computed</span>
                <span class="stat-value">${result.stats.numSValues}</span>
            </div>
        </div>`;
}

function displayTransferFunction(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">H(s) = N(s)/D(s)</div>
        </div>

        <h4>Transfer Function</h4>
        <div class="tf-display">
            <p><strong>Numerator:</strong> [${result.numerator.join(', ')}]</p>
            <p><strong>Denominator:</strong> [${result.denominator.join(', ')}]</p>
        </div>

        <h4>Bode Plot - Magnitude</h4>
        <div class="chart-container"><canvas id="magChart"></canvas></div>

        <h4>Bode Plot - Phase</h4>
        <div class="chart-container"><canvas id="phaseChart"></canvas></div>

        <h4>Characteristics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">DC Gain</span>
                <span class="stat-value">${result.characteristics.dcGain}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">DC Gain (dB)</span>
                <span class="stat-value">${result.characteristics.dcGainDB} dB</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Bandwidth (-3dB)</span>
                <span class="stat-value">${result.characteristics.bandwidth3dB} Hz</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Peak Frequency</span>
                <span class="stat-value">${result.characteristics.peakFrequency} Hz</span>
            </div>
        </div>`;
}

function displayImpulse(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">h(t) = L⁻¹{H(s)}</div>
        </div>

        <h4>Impulse Response</h4>
        <div class="chart-container"><canvas id="responseChart"></canvas></div>

        <h4>Response Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Duration</span>
                <span class="stat-value">${result.stats.duration}s</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Peak Value</span>
                <span class="stat-value">${result.stats.peakValue}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Settling Time</span>
                <span class="stat-value">${result.stats.settlingTime}s</span>
            </div>
        </div>

        <h4>System Poles</h4>
        <div class="poles-list">
            ${result.poles.map((p, i) => `
                <span class="pole-item">p${i + 1}: ${p.re.toFixed(3)} ${p.im >= 0 ? '+' : ''}${p.im.toFixed(3)}j</span>
            `).join('')}
        </div>`;
}

function displayStep(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">y(t) = ∫h(τ)dτ</div>
        </div>

        <h4>Step Response</h4>
        <div class="chart-container"><canvas id="responseChart"></canvas></div>

        <h4>Response Characteristics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Final Value</span>
                <span class="stat-value">${result.stats.finalValue}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Rise Time</span>
                <span class="stat-value">${result.stats.riseTime}s</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Overshoot</span>
                <span class="stat-value">${result.stats.overshoot}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Settling Time</span>
                <span class="stat-value">${result.stats.settlingTime}s</span>
            </div>
        </div>`;
}

function displayPoles(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">System Order: ${result.order.denominator}</div>
        </div>

        <h4>Pole-Zero Map</h4>
        <div class="chart-container"><canvas id="pzChart"></canvas></div>

        <h4>Stability Analysis</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">System Status</span>
                <span class="stat-value ${result.stability.isStable ? 'stable' : 'unstable'}">${result.stability.systemType}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Natural Freq</span>
                <span class="stat-value">${result.dominant.naturalFreq} rad/s</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Damping Ratio</span>
                <span class="stat-value">${result.dominant.dampingRatio}</span>
            </div>
        </div>

        <h4>Poles</h4>
        <div class="poles-list">
            ${result.poles.map((p, i) => `
                <div class="pole-item">
                    <span class="pole-label">Pole ${i + 1}:</span>
                    <span class="pole-value">${p.re} ${parseFloat(p.im) >= 0 ? '+' : ''}${p.im}j</span>
                    <span class="pole-mag">|p| = ${p.magnitude}</span>
                </div>
            `).join('')}
        </div>

        ${result.zeros.length > 0 ? `
        <h4>Zeros</h4>
        <div class="poles-list">
            ${result.zeros.map((z, i) => `
                <div class="pole-item">
                    <span class="pole-label">Zero ${i + 1}:</span>
                    <span class="pole-value">${z.re} ${parseFloat(z.im) >= 0 ? '+' : ''}${z.im}j</span>
                </div>
            `).join('')}
        </div>
        ` : ''}`;
}

function drawNumericalChart(result) {
    const canvas = document.getElementById('laplaceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 300;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Create heatmap data
    const data = result.results;
    const sigmas = [...new Set(data.map(d => d.s.re))].sort((a, b) => a - b);
    const omegas = [...new Set(data.map(d => d.s.im))].sort((a, b) => a - b);

    const maxMag = Math.max(...data.map(d => d.magnitude));

    const cellWidth = chartWidth / sigmas.length;
    const cellHeight = chartHeight / omegas.length;

    // Draw heatmap
    data.forEach(d => {
        const sigmaIdx = sigmas.indexOf(d.s.re);
        const omegaIdx = omegas.indexOf(d.s.im);

        const x = padding.left + sigmaIdx * cellWidth;
        const y = padding.top + (omegas.length - 1 - omegaIdx) * cellHeight;

        const intensity = Math.min(1, d.magnitude / maxMag);
        const r = Math.round(52 + intensity * 100);
        const g = Math.round(73 + intensity * 80);
        const b = Math.round(94 + intensity * 60);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, cellWidth + 1, cellHeight + 1);
    });

    // Draw axes labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('σ (Real)', padding.left + chartWidth / 2, height - 5);

    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ω (Imaginary)', 0, 0);
    ctx.restore();

    // Colorbar
    const barWidth = 15;
    const barX = width - padding.right + 10;
    for (let i = 0; i < chartHeight; i++) {
        const intensity = 1 - i / chartHeight;
        const r = Math.round(52 + intensity * 100);
        const g = Math.round(73 + intensity * 80);
        const b = Math.round(94 + intensity * 60);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(barX, padding.top + i, barWidth, 1);
    }

    ctx.fillStyle = '#333';
    ctx.font = '9px sans-serif';
    ctx.fillText(maxMag.toFixed(1), barX + barWidth / 2, padding.top - 5);
    ctx.fillText('0', barX + barWidth / 2, padding.top + chartHeight + 12);
}

function drawBodePlot(result) {
    // Magnitude plot
    const magCanvas = document.getElementById('magChart');
    if (magCanvas) {
        const ctx = magCanvas.getContext('2d');
        const width = magCanvas.parentElement.clientWidth;
        const height = 200;

        magCanvas.width = width;
        magCanvas.height = height;

        const padding = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        const freqs = result.freqResponse.map(fr => fr.frequency);
        const mags = result.freqResponse.map(fr => fr.magnitudeDB);

        const minF = Math.log10(freqs[0]);
        const maxF = Math.log10(freqs[freqs.length - 1]);
        const minM = Math.min(...mags) - 5;
        const maxM = Math.max(...mags) + 5;

        // Grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        for (let db = Math.ceil(minM / 20) * 20; db <= maxM; db += 20) {
            const y = padding.top + chartHeight - ((db - minM) / (maxM - minM)) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            ctx.fillStyle = '#666';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${db}dB`, padding.left - 5, y + 3);
        }

        // Plot
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.beginPath();

        result.freqResponse.forEach((fr, i) => {
            const x = padding.left + ((Math.log10(fr.frequency) - minF) / (maxF - minF)) * chartWidth;
            const y = padding.top + chartHeight - ((fr.magnitudeDB - minM) / (maxM - minM)) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // X-axis label
        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Frequency (Hz) - Log Scale', padding.left + chartWidth / 2, height - 5);
    }

    // Phase plot
    const phaseCanvas = document.getElementById('phaseChart');
    if (phaseCanvas) {
        const ctx = phaseCanvas.getContext('2d');
        const width = phaseCanvas.parentElement.clientWidth;
        const height = 180;

        phaseCanvas.width = width;
        phaseCanvas.height = height;

        const padding = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        const freqs = result.freqResponse.map(fr => fr.frequency);
        const phases = result.freqResponse.map(fr => fr.phaseDeg);

        const minF = Math.log10(freqs[0]);
        const maxF = Math.log10(freqs[freqs.length - 1]);
        const minP = Math.min(...phases) - 10;
        const maxP = Math.max(...phases) + 10;

        // Plot
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();

        result.freqResponse.forEach((fr, i) => {
            const x = padding.left + ((Math.log10(fr.frequency) - minF) / (maxF - minF)) * chartWidth;
            const y = padding.top + chartHeight - ((fr.phaseDeg - minP) / (maxP - minP)) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Frequency (Hz) - Log Scale', padding.left + chartWidth / 2, height - 5);

        ctx.save();
        ctx.translate(15, padding.top + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Phase (°)', 0, 0);
        ctx.restore();
    }
}

function drawResponseChart(result) {
    const canvas = document.getElementById('responseChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const t = result.time;
    const y = result.response;

    let minY = Math.min(...y);
    let maxY = Math.max(...y);
    const range = maxY - minY || 1;
    minY -= range * 0.1;
    maxY += range * 0.1;

    // Grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;

    // Zero line
    if (minY < 0 && maxY > 0) {
        const zeroY = padding.top + chartHeight - ((0 - minY) / (maxY - minY)) * chartHeight;
        ctx.strokeStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(padding.left + chartWidth, zeroY);
        ctx.stroke();
    }

    // Fill area
    ctx.fillStyle = 'rgba(52, 73, 94, 0.2)';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight - ((0 - minY) / (maxY - minY)) * chartHeight);

    for (let i = 0; i < t.length; i++) {
        const x = padding.left + (t[i] / t[t.length - 1]) * chartWidth;
        const py = padding.top + chartHeight - ((y[i] - minY) / (maxY - minY)) * chartHeight;
        ctx.lineTo(x, py);
    }

    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight - ((0 - minY) / (maxY - minY)) * chartHeight);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < t.length; i++) {
        const x = padding.left + (t[i] / t[t.length - 1]) * chartWidth;
        const py = padding.top + chartHeight - ((y[i] - minY) / (maxY - minY)) * chartHeight;
        if (i === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', padding.left + chartWidth / 2, height - 5);

    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Response', 0, 0);
    ctx.restore();
}

function drawPoleZeroMap(result) {
    const canvas = document.getElementById('pzChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.parentElement.clientWidth, 350);

    canvas.width = size;
    canvas.height = size;

    const padding = 50;
    const chartSize = size - 2 * padding;
    const center = size / 2;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, size, size);

    // Find scale
    const allPoints = [...result.poles, ...result.zeros];
    let maxAbs = 1;
    allPoints.forEach(p => {
        maxAbs = Math.max(maxAbs, Math.abs(parseFloat(p.re)), Math.abs(parseFloat(p.im)));
    });
    maxAbs *= 1.3;

    // Draw grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;

    // Axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, center);
    ctx.lineTo(size - padding, center);
    ctx.moveTo(center, padding);
    ctx.lineTo(center, size - padding);
    ctx.stroke();

    // Unit circle
    ctx.strokeStyle = '#bbb';
    ctx.setLineDash([5, 5]);
    const unitRadius = (1 / maxAbs) * (chartSize / 2);
    ctx.beginPath();
    ctx.arc(center, center, unitRadius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Left half-plane shading (stable region)
    ctx.fillStyle = 'rgba(39, 174, 96, 0.1)';
    ctx.fillRect(padding, padding, chartSize / 2, chartSize);

    // Draw poles (X)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    result.poles.forEach(p => {
        const x = center + (parseFloat(p.re) / maxAbs) * (chartSize / 2);
        const y = center - (parseFloat(p.im) / maxAbs) * (chartSize / 2);

        ctx.beginPath();
        ctx.moveTo(x - 8, y - 8);
        ctx.lineTo(x + 8, y + 8);
        ctx.moveTo(x + 8, y - 8);
        ctx.lineTo(x - 8, y + 8);
        ctx.stroke();
    });

    // Draw zeros (O)
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    result.zeros.forEach(z => {
        const x = center + (parseFloat(z.re) / maxAbs) * (chartSize / 2);
        const y = center - (parseFloat(z.im) / maxAbs) * (chartSize / 2);

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.stroke();
    });

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Re(s)', size - padding + 20, center + 4);
    ctx.fillText('Im(s)', center, padding - 10);

    // Legend
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('× Poles', padding + 30, padding + 15);
    ctx.fillStyle = '#3498db';
    ctx.fillText('○ Zeros', padding + 80, padding + 15);
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('signalGroup').style.display =
        calcType === 'numerical' ? 'block' : 'none';
    document.getElementById('tfGroup').style.display =
        calcType !== 'numerical' ? 'block' : 'none';
    document.getElementById('freqRangeGroup').style.display =
        calcType === 'transferfunction' ? 'block' : 'none';
    document.getElementById('sRangeGroup').style.display =
        calcType === 'numerical' ? 'block' : 'none';
    document.getElementById('durationGroup').style.display =
        ['impulse', 'step'].includes(calcType) ? 'block' : 'none';
}

function loadSample(type) {
    if (type === 'exponential') {
        const n = 200;
        const dt = 0.05;
        const signal = Array.from({ length: n }, (_, i) => Math.exp(-0.5 * i * dt));
        document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'sine') {
        const n = 200;
        const dt = 0.02;
        const signal = Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * 2 * i * dt));
        document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'firstorder') {
        document.getElementById('numerator').value = '1';
        document.getElementById('denominator').value = '1, 1';
    } else if (type === 'secondorder') {
        document.getElementById('numerator').value = '1';
        document.getElementById('denominator').value = '1, 0.5, 1';
    } else if (type === 'bandpass') {
        document.getElementById('numerator').value = '0, 1, 0';
        document.getElementById('denominator').value = '1, 1, 1';
    }
}

// Initialize
updateOptions();
