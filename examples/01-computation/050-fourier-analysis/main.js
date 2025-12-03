/**
 * Main Thread: Fourier Analysis Calculator
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
        const freqStr = document.getElementById('frequencies').value;
        const ampStr = document.getElementById('amplitudes').value;
        const frequencies = freqStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
        const amplitudes = ampStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
        const sampleRate = parseInt(document.getElementById('sampleRate').value) || 1000;
        const duration = parseFloat(document.getElementById('duration').value) || 1;

        if (frequencies.length === 0 || amplitudes.length === 0) {
            resultsDiv.innerHTML = '<div class="error">Enter valid frequencies and amplitudes</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: 'generate', data: { frequencies, amplitudes, sampleRate, duration } });
    } else if (calcType === 'filter') {
        const signal = parseSignal();
        if (!signal) return;

        const filterType = document.getElementById('filterType').value;
        const cutoff = parseFloat(document.getElementById('cutoffFreq').value) || 100;
        const sampleRate = parseInt(document.getElementById('sampleRate').value) || 1000;

        worker.postMessage({ type: 'filter', data: { signal, filterType, cutoff, sampleRate } });
    } else {
        const signal = parseSignal();
        if (!signal) return;

        const sampleRate = parseInt(document.getElementById('sampleRate').value) || 1000;

        if (calcType === 'dft' || calcType === 'fft') {
            worker.postMessage({ type: calcType, data: { signal } });
        } else {
            worker.postMessage({ type: 'spectrum', data: { signal, sampleRate } });
        }
    }
}

function parseSignal() {
    const input = document.getElementById('signalData').value.trim();
    const signal = input.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (signal.length < 4) {
        resultsDiv.innerHTML = '<div class="error">Need at least 4 signal values</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return signal;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Fourier Analysis Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'dft' || calculationType === 'fft') {
        html += displayTransform(result);
    } else if (calculationType === 'spectrum' || calculationType === 'generate') {
        html += displaySpectrum(result);
    } else if (calculationType === 'filter') {
        html += displayFilter(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw charts
    setTimeout(() => {
        if (result.magnitude) drawMagnitudeChart(result);
        if (result.powerSpectrum) drawSpectrumChart(result);
        if (result.signal || result.originalSignal) drawSignalChart(result);
    }, 100);
}

function displayTransform(result) {
    let html = `
        <div class="method-display">
            <div class="method-name">${result.method}</div>
            <div class="method-info">N = ${result.N}${result.originalLength ? ` (padded from ${result.originalLength})` : ''}</div>
        </div>

        <h4>Magnitude Spectrum</h4>
        <div class="chart-container"><canvas id="magnitudeChart"></canvas></div>

        <h4>Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Max Magnitude</span>
                <span class="stat-value">${formatNumber(Math.max(...result.magnitude))}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">DC Component</span>
                <span class="stat-value">${formatNumber(result.magnitude[0])}</span>
            </div>
            <div class="stat-item highlight">
                <span class="stat-label">Samples</span>
                <span class="stat-value">${result.N}</span>
            </div>
        </div>`;

    // Show first few coefficients
    html += `
        <h4>First 8 Frequency Components</h4>
        <div class="table-container">
            <table class="coeff-table">
                <thead>
                    <tr>
                        <th>k</th>
                        <th>Real</th>
                        <th>Imaginary</th>
                        <th>Magnitude</th>
                        <th>Phase (rad)</th>
                    </tr>
                </thead>
                <tbody>
                    ${Array.from({ length: Math.min(8, result.N) }, (_, k) => `
                        <tr>
                            <td>${k}</td>
                            <td>${formatNumber(result.real[k])}</td>
                            <td>${formatNumber(result.imag[k])}</td>
                            <td>${formatNumber(result.magnitude[k])}</td>
                            <td>${formatNumber(result.phase[k])}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    return html;
}

function displaySpectrum(result) {
    let html = '';

    if (result.generated) {
        html += `
            <div class="generated-info">
                <span class="badge">Generated Signal</span>
                <span class="info-badge">Frequencies: ${result.inputFrequencies.join(', ')} Hz</span>
            </div>`;
    }

    html += `
        <h4>Power Spectrum</h4>
        <div class="chart-container"><canvas id="spectrumChart"></canvas></div>

        <h4>Signal (Time Domain)</h4>
        <div class="chart-container"><canvas id="signalChart"></canvas></div>`;

    // Dominant frequencies
    if (result.dominantFrequencies && result.dominantFrequencies.length > 0) {
        html += `
            <h4>Dominant Frequencies</h4>
            <div class="freq-grid">
                ${result.dominantFrequencies.slice(0, 6).map((f, i) => `
                    <div class="freq-item ${i === 0 ? 'primary' : ''}">
                        <span class="freq-rank">#${i + 1}</span>
                        <span class="freq-value">${formatNumber(f.frequency)} Hz</span>
                        <span class="freq-power">Power: ${formatNumber(f.power)}</span>
                    </div>
                `).join('')}
            </div>`;
    }

    // Spectral statistics
    html += `
        <h4>Spectral Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Spectral Centroid</span>
                <span class="stat-value">${formatNumber(result.spectralCentroid)} Hz</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Bandwidth</span>
                <span class="stat-value">${formatNumber(result.spectralBandwidth)} Hz</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Power</span>
                <span class="stat-value">${formatNumber(result.totalPower)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Freq Resolution</span>
                <span class="stat-value">${formatNumber(result.frequencyResolution)} Hz</span>
            </div>
        </div>`;

    return html;
}

function displayFilter(result) {
    let html = `
        <div class="filter-info">
            <span class="badge">${result.filterType.toUpperCase()} Filter</span>
            <span class="info-badge">Cutoff: ${result.cutoffFrequency} Hz</span>
        </div>

        <h4>Filtered Signal</h4>
        <div class="chart-container"><canvas id="signalChart"></canvas></div>

        <h4>Comparison</h4>
        <div class="comparison-box">
            <div class="comparison-item">
                <span class="comparison-label">Original RMS</span>
                <span class="comparison-value">${formatNumber(rms(result.originalSignal))}</span>
            </div>
            <div class="comparison-item">
                <span class="comparison-label">Filtered RMS</span>
                <span class="comparison-value">${formatNumber(rms(result.filteredSignal))}</span>
            </div>
            <div class="comparison-item">
                <span class="comparison-label">Removed RMS</span>
                <span class="comparison-value">${formatNumber(rms(result.removedComponents))}</span>
            </div>
        </div>`;

    return html;
}

function drawMagnitudeChart(result) {
    const canvas = document.getElementById('magnitudeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 200;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Use only first half (positive frequencies)
    const halfN = Math.floor(result.N / 2);
    const magnitude = result.magnitude.slice(0, halfN);
    const maxMag = Math.max(...magnitude);

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw bars
    const barWidth = chartWidth / halfN;
    ctx.fillStyle = '#5c6bc0';

    for (let i = 0; i < halfN; i++) {
        const x = padding.left + i * barWidth;
        const barHeight = (magnitude[i] / maxMag) * chartHeight;
        const y = padding.top + chartHeight - barHeight;

        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    }

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0', padding.left, height - 5);
    ctx.fillText(`${halfN}`, width - padding.right, height - 5);
    ctx.fillText('Frequency Bin (k)', width / 2, height - 5);
}

function drawSpectrumChart(result) {
    const canvas = document.getElementById('spectrumChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 220;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const frequencies = result.frequencies;
    const powerSpectrum = result.powerSpectrum;
    const maxPower = Math.max(...powerSpectrum);
    const maxFreq = frequencies[frequencies.length - 1];

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

    // Draw spectrum
    ctx.fillStyle = 'rgba(92, 107, 192, 0.6)';
    ctx.strokeStyle = '#5c6bc0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);

    for (let i = 0; i < frequencies.length; i++) {
        const x = padding.left + (frequencies[i] / maxFreq) * chartWidth;
        const y = padding.top + chartHeight - (powerSpectrum[i] / maxPower) * chartHeight;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(width - padding.right, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mark dominant frequencies
    if (result.dominantFrequencies) {
        ctx.fillStyle = '#e91e63';
        for (const peak of result.dominantFrequencies.slice(0, 3)) {
            const x = padding.left + (peak.frequency / maxFreq) * chartWidth;
            const y = padding.top + chartHeight - (peak.power / maxPower) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0', padding.left, height - 15);
    ctx.fillText(`${Math.round(maxFreq)} Hz`, width - padding.right, height - 15);
    ctx.fillText('Frequency (Hz)', width / 2, height - 5);

    ctx.textAlign = 'right';
    ctx.fillText('Power', padding.left - 5, padding.top + 10);
}

function drawSignalChart(result) {
    const canvas = document.getElementById('signalChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 180;

    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const signal = result.signal || result.originalSignal;
    const filteredSignal = result.filteredSignal;

    // Sample for display
    const maxSamples = 500;
    const step = Math.max(1, Math.floor(signal.length / maxSamples));
    const sampledSignal = signal.filter((_, i) => i % step === 0);
    const sampledFiltered = filteredSignal ? filteredSignal.filter((_, i) => i % step === 0) : null;

    const allValues = sampledFiltered ? [...sampledSignal, ...sampledFiltered] : sampledSignal;
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.1;
    maxVal += range * 0.1;

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw zero line
    const zeroY = padding.top + chartHeight * (maxVal / (maxVal - minVal));
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();

    // Draw original signal
    ctx.strokeStyle = sampledFiltered ? '#999' : '#5c6bc0';
    ctx.lineWidth = sampledFiltered ? 1 : 1.5;
    ctx.beginPath();
    for (let i = 0; i < sampledSignal.length; i++) {
        const x = padding.left + (i / (sampledSignal.length - 1)) * chartWidth;
        const y = padding.top + ((maxVal - sampledSignal[i]) / (maxVal - minVal)) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw filtered signal
    if (sampledFiltered) {
        ctx.strokeStyle = '#5c6bc0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < sampledFiltered.length; i++) {
            const x = padding.left + (i / (sampledFiltered.length - 1)) * chartWidth;
            const y = padding.top + ((maxVal - sampledFiltered[i]) / (maxVal - minVal)) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Legend
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#999';
        ctx.fillText('Original', padding.left + 10, padding.top + 12);
        ctx.fillStyle = '#5c6bc0';
        ctx.fillText('Filtered', padding.left + 70, padding.top + 12);
    }

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time (samples)', width / 2, height - 5);
}

function rms(arr) {
    const sumSquares = arr.reduce((sum, v) => sum + v * v, 0);
    return Math.sqrt(sumSquares / arr.length);
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 10000) return num.toExponential(2);
    if (Math.abs(num) >= 100) return num.toFixed(1);
    if (Math.abs(num) >= 1) return num.toFixed(2);
    return num.toFixed(4);
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    document.getElementById('signalInputs').style.display = calcType === 'generate' ? 'none' : 'block';
    document.getElementById('generateInputs').style.display = calcType === 'generate' ? 'block' : 'none';
    document.getElementById('filterInputs').style.display = calcType === 'filter' ? 'block' : 'none';
    document.getElementById('sampleRateGroup').style.display =
        ['spectrum', 'filter', 'generate'].includes(calcType) ? 'block' : 'none';
}

function loadSample(type) {
    let signal;
    switch (type) {
        case 'sine':
            // 10Hz sine wave at 100Hz sample rate
            signal = Array.from({ length: 100 }, (_, i) => Math.sin(2 * Math.PI * 10 * i / 100));
            break;
        case 'composite':
            // 5Hz + 15Hz + 30Hz
            signal = Array.from({ length: 200 }, (_, i) =>
                Math.sin(2 * Math.PI * 5 * i / 100) +
                0.5 * Math.sin(2 * Math.PI * 15 * i / 100) +
                0.3 * Math.sin(2 * Math.PI * 30 * i / 100)
            );
            break;
        case 'noisy':
            // Sine with noise
            signal = Array.from({ length: 128 }, (_, i) =>
                Math.sin(2 * Math.PI * 8 * i / 100) + (Math.random() - 0.5) * 0.5
            );
            break;
        default:
            signal = [1, 0, -1, 0, 1, 0, -1, 0];
    }
    document.getElementById('signalData').value = signal.map(v => v.toFixed(4)).join(', ');
}

// Initialize
updateOptions();
