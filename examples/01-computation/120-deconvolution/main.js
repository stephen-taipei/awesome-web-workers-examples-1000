/**
 * Main script for Deconvolution
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
    document.getElementById('signalOptions').style.display =
        type !== 'custom' ? 'block' : 'none';
    document.getElementById('customOptions').style.display =
        type === 'custom' ? 'block' : 'none';
}

function loadPreset(preset) {
    switch (preset) {
        case 'sharp':
            document.getElementById('signalType').value = 'pulse';
            document.getElementById('kernelType').value = 'gaussian';
            document.getElementById('kernelSize').value = '7';
            document.getElementById('noiseLevel').value = '0';
            document.getElementById('method').value = 'wiener';
            document.getElementById('wienerK').value = '0.001';
            document.getElementById('signalSize').value = '128';
            break;
        case 'noisy':
            document.getElementById('signalType').value = 'spikes';
            document.getElementById('kernelType').value = 'gaussian';
            document.getElementById('kernelSize').value = '11';
            document.getElementById('noiseLevel').value = '5';
            document.getElementById('method').value = 'wiener';
            document.getElementById('wienerK').value = '0.1';
            document.getElementById('signalSize').value = '128';
            break;
        case 'motion':
            document.getElementById('signalType').value = 'square';
            document.getElementById('kernelType').value = 'motion';
            document.getElementById('kernelSize').value = '15';
            document.getElementById('noiseLevel').value = '1';
            document.getElementById('method').value = 'wiener';
            document.getElementById('wienerK').value = '0.01';
            document.getElementById('signalSize').value = '256';
            break;
        case 'compare':
            document.getElementById('signalType').value = 'step';
            document.getElementById('kernelType').value = 'box';
            document.getElementById('kernelSize').value = '7';
            document.getElementById('noiseLevel').value = '1';
            document.getElementById('method').value = 'inverse';
            document.getElementById('wienerK').value = '0.01';
            document.getElementById('signalSize').value = '128';
            break;
    }
    updateSignalOptions();
}

function generateSignal() {
    const type = document.getElementById('signalType').value;
    const N = parseInt(document.getElementById('signalSize').value);
    const amplitude = parseFloat(document.getElementById('amplitude').value);

    const signal = new Array(N).fill(0);

    switch (type) {
        case 'pulse':
            // Sharp pulse in the center
            const center = Math.floor(N / 2);
            signal[center] = amplitude;
            break;

        case 'square':
            // Square wave
            for (let i = Math.floor(N * 0.3); i < Math.floor(N * 0.7); i++) {
                signal[i] = amplitude;
            }
            break;

        case 'step':
            // Step function
            for (let i = Math.floor(N / 2); i < N; i++) {
                signal[i] = amplitude;
            }
            break;

        case 'spikes':
            // Multiple spikes
            signal[Math.floor(N * 0.2)] = amplitude;
            signal[Math.floor(N * 0.4)] = amplitude * 0.7;
            signal[Math.floor(N * 0.6)] = amplitude * 0.5;
            signal[Math.floor(N * 0.8)] = amplitude * 0.8;
            break;

        case 'custom':
            const customStr = document.getElementById('customValues').value;
            const values = customStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
            for (let i = 0; i < N && i < values.length; i++) {
                signal[i] = values[i];
            }
            break;
    }

    return signal;
}

function generateKernel() {
    const type = document.getElementById('kernelType').value;
    const size = parseInt(document.getElementById('kernelSize').value);

    let kernel = new Array(size);

    switch (type) {
        case 'gaussian':
            const sigma = size / 6;
            const center = Math.floor(size / 2);
            let sum = 0;
            for (let i = 0; i < size; i++) {
                const x = i - center;
                kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
                sum += kernel[i];
            }
            // Normalize
            for (let i = 0; i < size; i++) {
                kernel[i] /= sum;
            }
            break;

        case 'box':
            // Uniform averaging
            kernel = new Array(size).fill(1 / size);
            break;

        case 'motion':
            // Motion blur (horizontal)
            kernel = new Array(size).fill(1 / size);
            break;
    }

    return kernel;
}

function calculate() {
    try {
        const original = generateSignal();
        const kernel = generateKernel();
        const noiseLevel = parseFloat(document.getElementById('noiseLevel').value);
        const method = document.getElementById('method').value;
        const wienerK = parseFloat(document.getElementById('wienerK').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { original, kernel, noiseLevel, method, wienerK }
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
    const { original, blurred, noisy, restored, kernel, N, method,
            noiseLevel, wienerK, metrics, spectra } = result;

    const methodNames = {
        'inverse': 'Inverse Filter',
        'wiener': 'Wiener Filter',
        'regularized': 'Regularized Inverse'
    };

    let html = `
        <div class="result-card">
            <h3>Deconvolution Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${methodNames[method]}</div>
                <div class="method-info">N = ${N} | Noise: ${noiseLevel}% | K = ${wienerK}</div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Blurred PSNR</span>
                    <span class="stat-value">${isFinite(metrics.psnrBlurred) ? metrics.psnrBlurred.toFixed(2) + ' dB' : '∞'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Restored PSNR</span>
                    <span class="stat-value">${isFinite(metrics.psnrRestored) ? metrics.psnrRestored.toFixed(2) + ' dB' : '∞'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Improvement</span>
                    <span class="stat-value ${metrics.improvement > 0 ? 'positive' : 'negative'}">${metrics.improvement > 0 ? '+' : ''}${metrics.improvement.toFixed(2)} dB</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Correlation</span>
                    <span class="stat-value">${metrics.correlation.toFixed(4)}</span>
                </div>
            </div>

            <h4>Original Signal</h4>
            <div class="signal-display">
    `;

    // Original signal visualization
    const maxVal = Math.max(...original.map(Math.abs), ...restored.map(Math.abs));

    original.forEach((x) => {
        const height = maxVal > 0 ? (x / maxVal * 45 + 50) : 50;
        html += `<div class="signal-bar original" style="height: ${height}%"></div>`;
    });

    html += `</div>`;

    // Kernel visualization
    html += `<h4>Blur Kernel (PSF)</h4><div class="kernel-display">`;

    const kernelMax = Math.max(...kernel);
    kernel.forEach((k, i) => {
        const height = kernelMax > 0 ? k / kernelMax * 100 : 0;
        html += `<div class="kernel-bar" style="height: ${height}%" title="h[${i}]=${k.toFixed(4)}"></div>`;
    });

    html += `</div>`;

    // Blurred + Noisy signal
    html += `<h4>Blurred${noiseLevel > 0 ? ' + Noisy' : ''} Signal</h4><div class="signal-display">`;

    noisy.forEach((x) => {
        const height = maxVal > 0 ? (x / maxVal * 45 + 50) : 50;
        html += `<div class="signal-bar blurred" style="height: ${height}%"></div>`;
    });

    html += `</div>`;

    // Restored signal
    html += `<h4>Restored Signal</h4><div class="signal-display">`;

    restored.forEach((x) => {
        const height = maxVal > 0 ? (x / maxVal * 45 + 50) : 50;
        html += `<div class="signal-bar restored" style="height: ${height}%"></div>`;
    });

    html += `</div>`;

    // Comparison overlay
    html += `
        <h4>Comparison: Original (blue) vs Restored (orange)</h4>
        <div class="comparison-display">
    `;

    for (let i = 0; i < N; i++) {
        const origHeight = maxVal > 0 ? (original[i] / maxVal * 45 + 50) : 50;
        const restHeight = maxVal > 0 ? (restored[i] / maxVal * 45 + 50) : 50;
        html += `
            <div class="comparison-bar">
                <div class="orig-bar" style="height: ${origHeight}%"></div>
                <div class="rest-bar" style="height: ${restHeight}%"></div>
            </div>
        `;
    }

    html += `</div>`;

    // Frequency domain
    html += `
        <h4>Frequency Domain Analysis</h4>
        <div class="spectra-container">
            <div class="spectrum-panel">
                <div class="spectrum-title">Original Spectrum</div>
                <div class="spectrum-display">
    `;

    const specMax = Math.max(...spectra.original, ...spectra.restored);
    const displayOrig = spectra.original.length > 64 ?
        spectra.original.filter((_, i) => i % Math.ceil(spectra.original.length / 64) === 0) :
        spectra.original;

    displayOrig.forEach((m) => {
        const height = specMax > 0 ? m / specMax * 100 : 0;
        html += `<div class="spectrum-bar original" style="height: ${height}%"></div>`;
    });

    html += `</div></div>`;

    // Kernel spectrum
    html += `
            <div class="spectrum-panel">
                <div class="spectrum-title">Kernel Spectrum |H(f)|</div>
                <div class="spectrum-display">
    `;

    const kernelSpecMax = Math.max(...spectra.kernel);
    const displayKernel = spectra.kernel.length > 64 ?
        spectra.kernel.filter((_, i) => i % Math.ceil(spectra.kernel.length / 64) === 0) :
        spectra.kernel;

    displayKernel.forEach((m) => {
        const height = kernelSpecMax > 0 ? m / kernelSpecMax * 100 : 0;
        html += `<div class="spectrum-bar kernel" style="height: ${height}%"></div>`;
    });

    html += `</div></div>`;

    // Restored spectrum
    html += `
            <div class="spectrum-panel">
                <div class="spectrum-title">Restored Spectrum</div>
                <div class="spectrum-display">
    `;

    const displayRestored = spectra.restored.length > 64 ?
        spectra.restored.filter((_, i) => i % Math.ceil(spectra.restored.length / 64) === 0) :
        spectra.restored;

    displayRestored.forEach((m) => {
        const height = specMax > 0 ? m / specMax * 100 : 0;
        html += `<div class="spectrum-bar restored" style="height: ${height}%"></div>`;
    });

    html += `</div></div></div>`;

    // Error metrics table
    html += `
        <h4>Quality Metrics</h4>
        <div class="metrics-table">
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Blurred</th>
                    <th>Restored</th>
                    <th>Change</th>
                </tr>
                <tr>
                    <td>MSE</td>
                    <td>${metrics.mseBlurred.toFixed(4)}</td>
                    <td>${metrics.mseRestored.toFixed(4)}</td>
                    <td class="${metrics.mseRestored < metrics.mseBlurred ? 'positive' : 'negative'}">
                        ${((metrics.mseRestored - metrics.mseBlurred) / metrics.mseBlurred * 100).toFixed(1)}%
                    </td>
                </tr>
                <tr>
                    <td>PSNR</td>
                    <td>${isFinite(metrics.psnrBlurred) ? metrics.psnrBlurred.toFixed(2) + ' dB' : '∞'}</td>
                    <td>${isFinite(metrics.psnrRestored) ? metrics.psnrRestored.toFixed(2) + ' dB' : '∞'}</td>
                    <td class="${metrics.improvement > 0 ? 'positive' : 'negative'}">
                        ${metrics.improvement > 0 ? '+' : ''}${metrics.improvement.toFixed(2)} dB
                    </td>
                </tr>
            </table>
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
    loadPreset('sharp');
});
