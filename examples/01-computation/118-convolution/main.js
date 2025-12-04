/**
 * Main script for Convolution
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
        ['sine', 'square', 'pulse', 'noisy', 'step'].includes(type) ? 'block' : 'none';
    document.getElementById('customOptions').style.display =
        type === 'custom' ? 'block' : 'none';
}

function updateKernelOptions() {
    const type = document.getElementById('kernelType').value;
    document.getElementById('kernelOptions').style.display =
        type !== 'custom' ? 'block' : 'none';
    document.getElementById('customKernelOptions').style.display =
        type === 'custom' ? 'block' : 'none';
}

function loadPreset(preset) {
    switch (preset) {
        case 'smooth':
            document.getElementById('signalType').value = 'noisy';
            document.getElementById('freq').value = '3';
            document.getElementById('kernelType').value = 'lowpass';
            document.getElementById('kernelSize').value = '7';
            document.getElementById('signalSize').value = '128';
            document.getElementById('method').value = 'fft';
            break;
        case 'edge':
            document.getElementById('signalType').value = 'step';
            document.getElementById('kernelType').value = 'highpass';
            document.getElementById('kernelSize').value = '3';
            document.getElementById('signalSize').value = '128';
            document.getElementById('method').value = 'fft';
            break;
        case 'denoise':
            document.getElementById('signalType').value = 'noisy';
            document.getElementById('freq').value = '5';
            document.getElementById('kernelType').value = 'gaussian';
            document.getElementById('kernelSize').value = '9';
            document.getElementById('signalSize').value = '256';
            document.getElementById('method').value = 'fft';
            break;
        case 'derivative':
            document.getElementById('signalType').value = 'sine';
            document.getElementById('freq').value = '3';
            document.getElementById('kernelType').value = 'derivative';
            document.getElementById('kernelSize').value = '3';
            document.getElementById('signalSize').value = '128';
            document.getElementById('method').value = 'fft';
            break;
    }
    updateSignalOptions();
    updateKernelOptions();
}

function generateSignal() {
    const type = document.getElementById('signalType').value;
    const N = parseInt(document.getElementById('signalSize').value);
    const freq = parseFloat(document.getElementById('freq').value);
    const amplitude = parseFloat(document.getElementById('amplitude').value);

    const signal = new Array(N);

    switch (type) {
        case 'sine':
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude * Math.sin(2 * Math.PI * freq * n / N);
            }
            break;

        case 'square':
            for (let n = 0; n < N; n++) {
                const phase = (freq * n / N) % 1;
                signal[n] = phase < 0.5 ? amplitude : -amplitude;
            }
            break;

        case 'pulse':
            for (let n = 0; n < N; n++) {
                signal[n] = (n >= N * 0.4 && n < N * 0.6) ? amplitude : 0;
            }
            break;

        case 'noisy':
            for (let n = 0; n < N; n++) {
                const clean = amplitude * Math.sin(2 * Math.PI * freq * n / N);
                const noise = (Math.random() - 0.5) * amplitude * 0.5;
                signal[n] = clean + noise;
            }
            break;

        case 'step':
            for (let n = 0; n < N; n++) {
                signal[n] = n < N / 2 ? 0 : amplitude;
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

function generateKernel() {
    const type = document.getElementById('kernelType').value;
    const size = parseInt(document.getElementById('kernelSize').value);

    let kernel;

    switch (type) {
        case 'lowpass':
            // Box filter (moving average)
            kernel = new Array(size).fill(1 / size);
            break;

        case 'highpass':
            // High-pass filter
            kernel = new Array(size).fill(-1 / size);
            kernel[Math.floor(size / 2)] = 1 - 1 / size;
            break;

        case 'gaussian':
            // Gaussian kernel
            const sigma = size / 6;
            const center = Math.floor(size / 2);
            kernel = new Array(size);
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

        case 'derivative':
            // First derivative (central difference)
            if (size === 3) {
                kernel = [-0.5, 0, 0.5];
            } else {
                kernel = new Array(size).fill(0);
                kernel[0] = -1;
                kernel[size - 1] = 1;
                // Normalize by distance
                const scale = 2;
                kernel[0] /= scale;
                kernel[size - 1] /= scale;
            }
            break;

        case 'laplacian':
            // Second derivative (Laplacian)
            kernel = new Array(size).fill(0);
            kernel[0] = 1;
            kernel[Math.floor(size / 2)] = -2;
            kernel[size - 1] = 1;
            break;

        case 'custom':
            const customStr = document.getElementById('customKernel').value;
            kernel = customStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
            if (kernel.length === 0) {
                kernel = [1]; // Default to identity
            }
            break;
    }

    return kernel;
}

function calculate() {
    try {
        const signal = generateSignal();
        const kernel = generateKernel();
        const method = document.getElementById('method').value;

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { signal, kernel, method }
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
    const { signal, kernel, result: convResult, N, M, outputLength, method,
            signalSpectrum, kernelSpectrum, resultSpectrum, stats } = result;

    let html = `
        <div class="result-card">
            <h3>Convolution Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${method.toUpperCase()} Convolution</div>
                <div class="method-info">Signal: ${N} samples | Kernel: ${M} samples | Output: ${outputLength} samples</div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Kernel Sum</span>
                    <span class="stat-value">${stats.kernelSum.toFixed(4)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Normalized</span>
                    <span class="stat-value">${stats.kernelNormalized ? 'Yes' : 'No'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Signal Range</span>
                    <span class="stat-value">[${stats.signalMin.toFixed(1)}, ${stats.signalMax.toFixed(1)}]</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Result Range</span>
                    <span class="stat-value">[${stats.resultMin.toFixed(1)}, ${stats.resultMax.toFixed(1)}]</span>
                </div>
            </div>

            <h4>Input Signal</h4>
            <div class="signal-display">
    `;

    // Signal visualization
    const signalMax = Math.max(...signal.map(Math.abs));
    const displaySignal = signal.length > 256 ? signal.filter((_, i) => i % Math.ceil(signal.length / 256) === 0) : signal;

    displaySignal.forEach((x, n) => {
        const height = signalMax > 0 ? (x / signalMax * 45 + 50) : 50;
        html += `<div class="signal-bar input" style="height: ${height}%"></div>`;
    });

    html += `</div>`;

    // Kernel visualization
    html += `<h4>Kernel (Filter)</h4><div class="kernel-display">`;

    const kernelMax = Math.max(...kernel.map(Math.abs));
    kernel.forEach((k, i) => {
        const height = kernelMax > 0 ? Math.abs(k) / kernelMax * 100 : 0;
        const isPositive = k >= 0;
        html += `<div class="kernel-bar ${isPositive ? 'positive' : 'negative'}" style="height: ${height}%" title="h[${i}]=${k.toFixed(4)}"></div>`;
    });

    html += `</div>`;

    // Kernel values
    html += `<div class="kernel-values">`;
    kernel.forEach((k, i) => {
        html += `<span class="kernel-val">${k.toFixed(4)}</span>`;
    });
    html += `</div>`;

    // Result visualization
    html += `<h4>Convolution Result</h4><div class="signal-display">`;

    const resultMax = Math.max(...convResult.map(Math.abs));
    const displayResult = convResult.length > 256 ? convResult.filter((_, i) => i % Math.ceil(convResult.length / 256) === 0) : convResult;

    displayResult.forEach((x) => {
        const height = resultMax > 0 ? (x / resultMax * 45 + 50) : 50;
        html += `<div class="signal-bar output" style="height: ${height}%"></div>`;
    });

    html += `</div>`;

    // Frequency domain
    html += `
        <h4>Frequency Domain</h4>
        <div class="spectra-container">
            <div class="spectrum-panel">
                <div class="spectrum-title">Signal Spectrum |X(f)|</div>
                <div class="spectrum-display">
    `;

    const specMax = Math.max(...signalSpectrum);
    const displaySpec = signalSpectrum.length > 64 ? signalSpectrum.filter((_, i) => i % Math.ceil(signalSpectrum.length / 64) === 0) : signalSpectrum;

    displaySpec.forEach((m) => {
        const height = specMax > 0 ? m / specMax * 100 : 0;
        html += `<div class="spectrum-bar" style="height: ${height}%"></div>`;
    });

    html += `</div></div>`;

    // Kernel spectrum
    html += `
        <div class="spectrum-panel">
            <div class="spectrum-title">Kernel Spectrum |H(f)|</div>
            <div class="spectrum-display">
    `;

    const kernelSpecMax = Math.max(...kernelSpectrum);
    const displayKernelSpec = kernelSpectrum.length > 64 ? kernelSpectrum.filter((_, i) => i % Math.ceil(kernelSpectrum.length / 64) === 0) : kernelSpectrum;

    displayKernelSpec.forEach((m) => {
        const height = kernelSpecMax > 0 ? m / kernelSpecMax * 100 : 0;
        html += `<div class="spectrum-bar kernel" style="height: ${height}%"></div>`;
    });

    html += `</div></div>`;

    // Result spectrum
    html += `
        <div class="spectrum-panel">
            <div class="spectrum-title">Result Spectrum |Y(f)|</div>
            <div class="spectrum-display">
    `;

    const resultSpecMax = Math.max(...resultSpectrum);
    const displayResultSpec = resultSpectrum.length > 64 ? resultSpectrum.filter((_, i) => i % Math.ceil(resultSpectrum.length / 64) === 0) : resultSpectrum;

    displayResultSpec.forEach((m) => {
        const height = resultSpecMax > 0 ? m / resultSpecMax * 100 : 0;
        html += `<div class="spectrum-bar result" style="height: ${height}%"></div>`;
    });

    html += `</div></div></div>`;

    // Detected peaks/edges
    if (stats.peaks.length > 0) {
        html += `
            <h4>Detected Peaks/Edges</h4>
            <div class="peaks-table">
                <table>
                    <tr>
                        <th>Index</th>
                        <th>Value</th>
                    </tr>
        `;

        stats.peaks.forEach(peak => {
            html += `
                <tr>
                    <td>${peak.index}</td>
                    <td>${peak.value.toFixed(4)}</td>
                </tr>
            `;
        });

        html += `</table></div>`;
    }

    // Sample values
    html += `
        <h4>Sample Output Values</h4>
        <div class="sample-values">
    `;

    const showCount = Math.min(20, convResult.length);
    for (let i = 0; i < showCount; i++) {
        html += `<span class="sample-val">y[${i}]=${convResult[i].toFixed(3)}</span>`;
    }
    if (convResult.length > showCount) {
        html += `<span class="sample-more">... and ${convResult.length - showCount} more</span>`;
    }

    html += `</div></div>`;
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
