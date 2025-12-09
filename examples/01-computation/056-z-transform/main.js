/**
 * Main Thread: Z-Transform
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

        // Generate z values on and around unit circle
        const zValues = generateZValues();
        worker.postMessage({ type: 'numerical', data: { signal, zValues } });
    } else if (calcType === 'transferfunction') {
        const numerator = parseCoefficients('numerator');
        const denominator = parseCoefficients('denominator');
        if (!numerator || !denominator) return;

        const numPoints = parseInt(document.getElementById('numPoints').value) || 256;
        worker.postMessage({ type: 'transferfunction', data: { numerator, denominator, numPoints } });
    } else if (calcType === 'impulse' || calcType === 'step') {
        const numerator = parseCoefficients('numerator');
        const denominator = parseCoefficients('denominator');
        if (!numerator || !denominator) return;

        const numSamples = parseInt(document.getElementById('numSamples').value) || 100;
        worker.postMessage({ type: calcType, data: { numerator, denominator, numSamples } });
    } else if (calcType === 'poles') {
        const numerator = parseCoefficients('numerator');
        const denominator = parseCoefficients('denominator');
        if (!numerator || !denominator) return;

        worker.postMessage({ type: 'poles', data: { numerator, denominator } });
    } else if (calcType === 'filter') {
        const signal = parseSignal();
        const numerator = parseCoefficients('numerator');
        const denominator = parseCoefficients('denominator');
        if (!signal || !numerator || !denominator) return;

        worker.postMessage({ type: 'filter', data: { signal, numerator, denominator } });
    }
}

function parseSignal() {
    const input = document.getElementById('signalData').value.trim();
    const signal = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (signal.length < 3) {
        resultsDiv.innerHTML = '<div class="error">Need at least 3 samples</div>';
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

function generateZValues() {
    const zValues = [];

    // Points on unit circle
    for (let i = 0; i < 64; i++) {
        const angle = (2 * Math.PI * i) / 64;
        zValues.push({ re: Math.cos(angle), im: Math.sin(angle) });
    }

    // Points inside/outside unit circle
    for (let r = 0.5; r <= 1.5; r += 0.25) {
        for (let i = 0; i < 32; i++) {
            const angle = (2 * Math.PI * i) / 32;
            if (Math.abs(r - 1) > 0.01) {
                zValues.push({ re: r * Math.cos(angle), im: r * Math.sin(angle) });
            }
        }
    }

    return zValues;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Z-Transform Result</h3>
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
        case 'filter':
            html += displayFilter(result);
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    setTimeout(() => {
        switch (calculationType) {
            case 'numerical':
                drawZPlaneChart(result);
                break;
            case 'transferfunction':
                drawFreqResponseChart(result);
                break;
            case 'impulse':
            case 'step':
                drawDiscreteResponseChart(result);
                break;
            case 'poles':
                drawPoleZeroMap(result);
                break;
            case 'filter':
                drawFilterChart(result);
                break;
        }
    }, 100);
}

function displayNumerical(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">X(z) = Σ x[n]z^(-n)</div>
        </div>

        <h4>Z-Plane Magnitude</h4>
        <div class="chart-container"><canvas id="zPlaneChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Signal Length</span>
                <span class="stat-value">${result.stats.signalLength}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Z-Values Computed</span>
                <span class="stat-value">${result.stats.numZValues}</span>
            </div>
        </div>`;
}

function displayTransferFunction(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">Filter Type: ${result.characteristics.filterType}</div>
        </div>

        <h4>Transfer Function</h4>
        <div class="tf-display">
            <p><strong>B(z):</strong> [${result.numerator.join(', ')}]</p>
            <p><strong>A(z):</strong> [${result.denominator.join(', ')}]</p>
        </div>

        <h4>Magnitude Response</h4>
        <div class="chart-container"><canvas id="magChart"></canvas></div>

        <h4>Phase Response</h4>
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
                <span class="stat-label">Cutoff (-3dB)</span>
                <span class="stat-value">${result.characteristics.cutoff3dB}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Nyquist Gain</span>
                <span class="stat-value">${result.characteristics.nyquistGain}</span>
            </div>
        </div>`;
}

function displayImpulse(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">h[n] = Z⁻¹{H(z)}</div>
        </div>

        <h4>Impulse Response h[n]</h4>
        <div class="chart-container"><canvas id="responseChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Samples</span>
                <span class="stat-value">${result.stats.numSamples}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Peak Value</span>
                <span class="stat-value">${result.stats.peakValue}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Energy</span>
                <span class="stat-value">${result.stats.energy}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Settling Time</span>
                <span class="stat-value">${result.stats.settlingTime}</span>
            </div>
        </div>`;
}

function displayStep(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">y[n] = Σh[k], k=0 to n</div>
        </div>

        <h4>Step Response y[n]</h4>
        <div class="chart-container"><canvas id="responseChart"></canvas></div>

        <h4>Characteristics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Final Value</span>
                <span class="stat-value">${result.stats.finalValue}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Rise Time</span>
                <span class="stat-value">${result.stats.riseTime}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Overshoot</span>
                <span class="stat-value">${result.stats.overshoot}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Settling Time</span>
                <span class="stat-value">${result.stats.settlingTime}</span>
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
                <span class="stat-label">Dom. Pole |z|</span>
                <span class="stat-value">${result.dominant.magnitude}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Dom. Pole ∠</span>
                <span class="stat-value">${result.dominant.angle}°</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Time Constant</span>
                <span class="stat-value">${result.dominant.timeConstant}</span>
            </div>
        </div>

        <h4>Poles (inside unit circle = stable)</h4>
        <div class="poles-list">
            ${result.poles.map((p, i) => `
                <div class="pole-item ${parseFloat(p.magnitude) < 1 ? 'stable' : 'unstable'}">
                    <span class="pole-label">Pole ${i + 1}:</span>
                    <span class="pole-value">${p.re} ${parseFloat(p.im) >= 0 ? '+' : ''}${p.im}j</span>
                    <span class="pole-mag">|z| = ${p.magnitude}</span>
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

function displayFilter(result) {
    return `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">y[n] = Σb[k]x[n-k] - Σa[k]y[n-k]</div>
        </div>

        <h4>Input vs Output</h4>
        <div class="chart-container"><canvas id="filterChart"></canvas></div>

        <h4>Filter Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Signal Length</span>
                <span class="stat-value">${result.stats.inputLength}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Input RMS</span>
                <span class="stat-value">${result.stats.inputRMS}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Output RMS</span>
                <span class="stat-value">${result.stats.outputRMS}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Gain</span>
                <span class="stat-value">${result.stats.gain}</span>
            </div>
        </div>`;
}

function drawZPlaneChart(result) {
    const canvas = document.getElementById('zPlaneChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.parentElement.clientWidth, 400);

    canvas.width = size;
    canvas.height = size;

    const center = size / 2;
    const radius = size / 2 - 40;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, size, size);

    // Draw unit circle
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, center);
    ctx.lineTo(size - 20, center);
    ctx.moveTo(center, 20);
    ctx.lineTo(center, size - 20);
    ctx.stroke();

    // Plot magnitude as color-coded points
    const maxMag = Math.max(...result.results.map(r => r.magnitude));

    result.results.forEach(r => {
        const x = center + (r.z.re / 1.5) * radius;
        const y = center - (r.z.im / 1.5) * radius;

        const intensity = Math.min(1, r.magnitude / maxMag);
        const hue = (1 - intensity) * 240; // Blue to red

        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Re(z)', size - 30, center - 5);
    ctx.fillText('Im(z)', center + 15, 25);
    ctx.fillText('Unit Circle', center, size - 10);
}

function drawFreqResponseChart(result) {
    // Magnitude
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

        const mags = result.freqResponse.map(fr => fr.magnitudeDB);
        const minM = Math.min(...mags) - 5;
        const maxM = Math.max(...mags) + 5;

        // Grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        for (let db = Math.ceil(minM / 10) * 10; db <= maxM; db += 10) {
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
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        ctx.beginPath();

        result.freqResponse.forEach((fr, i) => {
            const x = padding.left + (fr.normalizedFreq / 0.5) * chartWidth;
            const y = padding.top + chartHeight - ((fr.magnitudeDB - minM) / (maxM - minM)) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Normalized Frequency (×π rad/sample)', padding.left + chartWidth / 2, height - 5);
    }

    // Phase
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

        const phases = result.freqResponse.map(fr => fr.phaseDeg);
        const minP = Math.min(...phases) - 10;
        const maxP = Math.max(...phases) + 10;

        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();

        result.freqResponse.forEach((fr, i) => {
            const x = padding.left + (fr.normalizedFreq / 0.5) * chartWidth;
            const y = padding.top + chartHeight - ((fr.phaseDeg - minP) / (maxP - minP)) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Normalized Frequency (×π rad/sample)', padding.left + chartWidth / 2, height - 5);
    }
}

function drawDiscreteResponseChart(result) {
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

    const samples = result.samples;
    const response = result.response;

    let minY = Math.min(...response, 0);
    let maxY = Math.max(...response);
    const range = maxY - minY || 1;
    minY -= range * 0.1;
    maxY += range * 0.1;

    // Zero line
    if (minY < 0 && maxY > 0) {
        const zeroY = padding.top + chartHeight - ((0 - minY) / (maxY - minY)) * chartHeight;
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(padding.left + chartWidth, zeroY);
        ctx.stroke();
    }

    // Draw stem plot
    const n = samples.length;
    const barWidth = Math.max(2, chartWidth / n - 1);

    response.forEach((y, i) => {
        const x = padding.left + (i / (n - 1)) * chartWidth;
        const zeroY = padding.top + chartHeight - ((0 - minY) / (maxY - minY)) * chartHeight;
        const yPos = padding.top + chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;

        // Stem
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, zeroY);
        ctx.lineTo(x, yPos);
        ctx.stroke();

        // Marker
        ctx.fillStyle = '#2980b9';
        ctx.beginPath();
        ctx.arc(x, yPos, 3, 0, 2 * Math.PI);
        ctx.fill();
    });

    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sample n', padding.left + chartWidth / 2, height - 5);
}

function drawPoleZeroMap(result) {
    const canvas = document.getElementById('pzChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.parentElement.clientWidth, 350);

    canvas.width = size;
    canvas.height = size;

    const center = size / 2;
    const radius = size / 2 - 50;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, size, size);

    // Stable region (inside unit circle)
    ctx.fillStyle = 'rgba(39, 174, 96, 0.1)';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Unit circle
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, center);
    ctx.lineTo(size - 30, center);
    ctx.moveTo(center, 30);
    ctx.lineTo(center, size - 30);
    ctx.stroke();

    // Draw poles (X)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    result.poles.forEach(p => {
        const x = center + parseFloat(p.re) * radius;
        const y = center - parseFloat(p.im) * radius;

        ctx.beginPath();
        ctx.moveTo(x - 8, y - 8);
        ctx.lineTo(x + 8, y + 8);
        ctx.moveTo(x + 8, y - 8);
        ctx.lineTo(x - 8, y + 8);
        ctx.stroke();
    });

    // Draw zeros (O)
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    result.zeros.forEach(z => {
        const x = center + parseFloat(z.re) * radius;
        const y = center - parseFloat(z.im) * radius;

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.stroke();
    });

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Re(z)', size - 35, center - 5);
    ctx.fillText('Im(z)', center + 15, 25);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('× Poles', 50, 25);
    ctx.fillStyle = '#27ae60';
    ctx.fillText('○ Zeros', 100, 25);
}

function drawFilterChart(result) {
    const canvas = document.getElementById('filterChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    const input = result.input;
    const output = result.output;

    const allVals = [...input, ...output];
    let minY = Math.min(...allVals);
    let maxY = Math.max(...allVals);
    const range = maxY - minY || 1;
    minY -= range * 0.1;
    maxY += range * 0.1;

    const n = input.length;

    // Draw input
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = padding.left + (i / (n - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((input[i] - minY) / (maxY - minY)) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw output
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = padding.left + (i / (n - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((output[i] - minY) / (maxY - minY)) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('Input', padding.left + 10, 15);
    ctx.fillStyle = '#2980b9';
    ctx.fillText('Output', padding.left + 60, 15);

    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('Sample', padding.left + chartWidth / 2, height - 5);
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('signalGroup').style.display =
        ['numerical', 'filter'].includes(calcType) ? 'block' : 'none';
    document.getElementById('tfGroup').style.display = 'block';
    document.getElementById('samplesGroup').style.display =
        ['impulse', 'step'].includes(calcType) ? 'block' : 'none';
    document.getElementById('pointsGroup').style.display =
        calcType === 'transferfunction' ? 'block' : 'none';
}

function loadSample(type) {
    if (type === 'exponential') {
        const signal = Array.from({ length: 50 }, (_, i) => Math.pow(0.9, i));
        document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'sine') {
        const signal = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * 5 * i / 64));
        document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'noisy') {
        const signal = Array.from({ length: 100 }, (_, i) =>
            Math.sin(2 * Math.PI * 3 * i / 100) + (Math.random() - 0.5) * 0.5
        );
        document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
    } else if (type === 'lowpass') {
        document.getElementById('numerator').value = '0.2, 0.2, 0.2, 0.2, 0.2';
        document.getElementById('denominator').value = '1';
    } else if (type === 'highpass') {
        document.getElementById('numerator').value = '0.5, -0.5';
        document.getElementById('denominator').value = '1';
    } else if (type === 'iir') {
        document.getElementById('numerator').value = '0.0675, 0.2025, 0.2025, 0.0675';
        document.getElementById('denominator').value = '1, -0.8, 0.44, -0.08';
    } else if (type === 'resonator') {
        document.getElementById('numerator').value = '0.1, 0, -0.1';
        document.getElementById('denominator').value = '1, -1.6, 0.81';
    }
}

// Initialize
updateOptions();
