/**
 * Main script for Discrete Cosine Transform
 */

let worker = null;

function initWorker() {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, result, executionTime, percentage, message } = e.data;

        if (type === 'progress') {
            updateProgress(percentage);
        } else if (type === 'result') {
            hideProgress();
            displayResults(result, executionTime);
            document.getElementById('calculateBtn').disabled = false;
        } else if (type === 'error') {
            hideProgress();
            displayError(message);
            document.getElementById('calculateBtn').disabled = false;
        }
    };

    worker.onerror = function(error) {
        hideProgress();
        displayError('Worker error: ' + error.message);
        document.getElementById('calculateBtn').disabled = false;
    };
}

function updateSignalOptions() {
    const type = document.getElementById('signalType').value;
    document.getElementById('waveOptions').style.display =
        ['cosine', 'step', 'ramp', 'pulse', 'image-row'].includes(type) ? 'block' : 'none';
    document.getElementById('customOptions').style.display =
        type === 'custom' ? 'block' : 'none';
}

function loadPreset(preset) {
    switch (preset) {
        case 'smooth':
            document.getElementById('signalType').value = 'cosine';
            document.getElementById('freq').value = '2';
            document.getElementById('amplitude').value = '100';
            document.getElementById('sampleSize').value = '8';
            document.getElementById('quantization').value = '10';
            break;
        case 'edge':
            document.getElementById('signalType').value = 'step';
            document.getElementById('amplitude').value = '200';
            document.getElementById('sampleSize').value = '8';
            document.getElementById('quantization').value = '10';
            break;
        case 'texture':
            document.getElementById('signalType').value = 'cosine';
            document.getElementById('freq').value = '6';
            document.getElementById('amplitude').value = '80';
            document.getElementById('sampleSize').value = '8';
            document.getElementById('quantization').value = '10';
            break;
        case 'jpeg':
            document.getElementById('signalType').value = 'image-row';
            document.getElementById('amplitude').value = '128';
            document.getElementById('sampleSize').value = '8';
            document.getElementById('quantization').value = '10';
            document.getElementById('dctType').value = 'DCT-II';
            break;
    }
    updateSignalOptions();
}

function generateSignal() {
    const type = document.getElementById('signalType').value;
    const N = parseInt(document.getElementById('sampleSize').value);
    const freq = parseFloat(document.getElementById('freq').value);
    const amplitude = parseFloat(document.getElementById('amplitude').value);

    const signal = new Array(N);

    switch (type) {
        case 'cosine':
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude * Math.cos(2 * Math.PI * freq * n / N);
            }
            break;

        case 'step':
            for (let n = 0; n < N; n++) {
                signal[n] = n < N / 2 ? 0 : amplitude;
            }
            break;

        case 'ramp':
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude * n / (N - 1);
            }
            break;

        case 'pulse':
            for (let n = 0; n < N; n++) {
                signal[n] = (n >= N / 4 && n < 3 * N / 4) ? amplitude : 0;
            }
            break;

        case 'image-row':
            // Simulate a grayscale image row (gradual change with some detail)
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude + 30 * Math.sin(2 * Math.PI * n / N) +
                           15 * Math.cos(4 * Math.PI * n / N) +
                           (Math.random() - 0.5) * 10;
            }
            break;

        case 'custom':
            const customStr = document.getElementById('customValues').value;
            const values = customStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
            for (let n = 0; n < N; n++) {
                signal[n] = values[n % values.length] || 0;
            }
            break;
    }

    return signal;
}

function calculate() {
    try {
        const signal = generateSignal();
        const dctType = document.getElementById('dctType').value;
        const quantizationFactor = parseInt(document.getElementById('quantization').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { signal, dctType, quantizationFactor }
        });
    } catch (error) {
        displayError(error.message);
    }
}

function showProgress() {
    document.getElementById('progress').style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = 'Processing...';
}

function updateProgress(percentage) {
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Processing... ${percentage}%`;
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

function displayResults(result, executionTime) {
    const resultsDiv = document.getElementById('results');
    const { signal, N, dctType, dctCoeffs, quantizedCoeffs, reconstructed,
            quantizationFactor, nonZeroCount, compressionRatio, mse, psnr,
            signalEnergy, dctEnergy, energyCompaction } = result;

    let html = `
        <div class="result-card">
            <h3>DCT Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${dctType}</div>
                <div class="method-info">N = ${N} samples | Q = ${quantizationFactor || 'None'}</div>
            </div>

            <div class="compression-stats">
                <div class="stat-item">
                    <span class="stat-label">Non-zero coeffs</span>
                    <span class="stat-value">${nonZeroCount}/${N}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Compression</span>
                    <span class="stat-value">${compressionRatio.toFixed(2)}:1</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">MSE</span>
                    <span class="stat-value">${mse.toFixed(4)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">PSNR</span>
                    <span class="stat-value">${isFinite(psnr) ? psnr.toFixed(2) + ' dB' : '∞'}</span>
                </div>
            </div>

            <h4>Original Signal</h4>
            <div class="signal-display">
    `;

    const maxVal = Math.max(...signal.map(Math.abs));
    signal.forEach((x, n) => {
        const height = maxVal > 0 ? (x / maxVal * 50 + 50) : 50;
        html += `<div class="signal-bar" style="height: ${height}%" title="x[${n}]=${x.toFixed(2)}"></div>`;
    });

    html += `</div>`;

    // DCT Coefficients
    html += `
        <h4>DCT Coefficients</h4>
        <div class="dct-display">
    `;

    const maxCoeff = Math.max(...dctCoeffs.map(Math.abs));
    dctCoeffs.forEach((c, k) => {
        const height = maxCoeff > 0 ? (Math.abs(c) / maxCoeff * 100) : 0;
        const isPositive = c >= 0;
        html += `<div class="dct-bar ${isPositive ? 'positive' : 'negative'}" style="height: ${height}%" title="X[${k}]=${c.toFixed(2)}"></div>`;
    });

    html += `</div>`;

    // Quantized Coefficients
    if (quantizationFactor > 0) {
        html += `
            <h4>Quantized Coefficients (Q=${quantizationFactor})</h4>
            <div class="dct-display quantized">
        `;

        quantizedCoeffs.forEach((c, k) => {
            const height = maxCoeff > 0 ? (Math.abs(c) / maxCoeff * 100) : 0;
            const isPositive = c >= 0;
            const isZero = c === 0;
            html += `<div class="dct-bar ${isPositive ? 'positive' : 'negative'} ${isZero ? 'zero' : ''}" style="height: ${height}%" title="Q[${k}]=${c.toFixed(2)}"></div>`;
        });

        html += `</div>`;
    }

    // Reconstructed Signal
    html += `
        <h4>Reconstructed Signal</h4>
        <div class="signal-display reconstructed">
    `;

    reconstructed.forEach((x, n) => {
        const height = maxVal > 0 ? (x / maxVal * 50 + 50) : 50;
        html += `<div class="signal-bar" style="height: ${height}%" title="x'[${n}]=${x.toFixed(2)}"></div>`;
    });

    html += `</div>`;

    // Comparison
    html += `
        <h4>Original vs Reconstructed</h4>
        <div class="comparison-table">
            <table>
                <tr>
                    <th>n</th>
                    <th>Original</th>
                    <th>Reconstructed</th>
                    <th>Error</th>
                </tr>
    `;

    signal.forEach((x, n) => {
        const error = Math.abs(x - reconstructed[n]);
        html += `
            <tr>
                <td>${n}</td>
                <td>${x.toFixed(4)}</td>
                <td>${reconstructed[n].toFixed(4)}</td>
                <td class="${error > 1 ? 'high-error' : ''}">${error.toFixed(4)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Energy Compaction
    html += `
        <h4>Energy Compaction</h4>
        <div class="energy-compaction">
            <table>
                <tr>
                    <th>k</th>
                    <th>Coefficient</th>
                    <th>Cumulative Energy %</th>
                </tr>
    `;

    energyCompaction.forEach(e => {
        html += `
            <tr>
                <td>${e.k}</td>
                <td>${e.coefficient.toFixed(4)}</td>
                <td>
                    <div class="energy-bar-container">
                        <div class="energy-bar" style="width: ${e.percentEnergy}%"></div>
                        <span>${e.percentEnergy.toFixed(1)}%</span>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // DCT Coefficients table
    html += `
        <h4>All DCT Coefficients</h4>
        <div class="coefficients-list">
    `;

    dctCoeffs.forEach((c, k) => {
        const qc = quantizedCoeffs[k];
        html += `<span class="coeff-item ${Math.abs(c) < 0.01 ? 'negligible' : ''}">X[${k}]=${c.toFixed(2)}${quantizationFactor > 0 ? ' → ' + qc.toFixed(0) : ''}</span>`;
    });

    html += `</div>`;

    // Energy preservation
    html += `
        <h4>Energy Preservation (Parseval)</h4>
        <div class="energy-analysis">
            <div class="energy-item">
                <span class="energy-label">Signal Energy:</span>
                <span class="energy-value">${signalEnergy.toFixed(4)}</span>
            </div>
            <div class="energy-item">
                <span class="energy-label">DCT Energy:</span>
                <span class="energy-value">${dctEnergy.toFixed(4)}</span>
            </div>
        </div>
    `;

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadPreset('smooth');
});
