/**
 * Main script for Inverse FFT
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

function updateSpectrumOptions() {
    const type = document.getElementById('spectrumType').value;
    document.getElementById('singleFreqOptions').style.display =
        type === 'single' ? 'block' : 'none';
    document.getElementById('multiFreqOptions').style.display =
        type === 'multiple' ? 'block' : 'none';
    document.getElementById('filterOptions').style.display =
        ['lowpass', 'bandpass'].includes(type) ? 'block' : 'none';
    document.getElementById('customOptions').style.display =
        type === 'custom' ? 'block' : 'none';
}

function loadPreset(preset) {
    const N = parseInt(document.getElementById('sampleSize').value);
    switch (preset) {
        case 'pure':
            document.getElementById('spectrumType').value = 'single';
            document.getElementById('freq1Bin').value = '10';
            document.getElementById('freq1Mag').value = '1';
            document.getElementById('freq1Phase').value = '0';
            break;
        case 'harmonic':
            document.getElementById('spectrumType').value = 'multiple';
            document.getElementById('multi1Bin').value = '5';
            document.getElementById('multi1Mag').value = '1';
            document.getElementById('multi2Bin').value = '10';
            document.getElementById('multi2Mag').value = '0.5';
            document.getElementById('multi3Bin').value = '15';
            document.getElementById('multi3Mag').value = '0.33';
            break;
        case 'filtered':
            document.getElementById('spectrumType').value = 'lowpass';
            document.getElementById('filterLow').value = '0';
            document.getElementById('filterHigh').value = Math.floor(N / 8);
            break;
        case 'impulse':
            document.getElementById('spectrumType').value = 'custom';
            document.getElementById('customSpectrum').value =
                Array.from({length: 10}, (_, i) => `${i}:1`).join(', ');
            break;
    }
    updateSpectrumOptions();
}

function generateSpectrum() {
    const type = document.getElementById('spectrumType').value;
    const N = parseInt(document.getElementById('sampleSize').value);
    const spectrum = [];

    switch (type) {
        case 'single': {
            const bin = parseInt(document.getElementById('freq1Bin').value);
            const mag = parseFloat(document.getElementById('freq1Mag').value);
            const phase = parseFloat(document.getElementById('freq1Phase').value) * Math.PI / 180;
            spectrum.push({ bin, magnitude: mag * N / 2, phase });
            break;
        }

        case 'multiple': {
            const bins = [
                { bin: parseInt(document.getElementById('multi1Bin').value),
                  mag: parseFloat(document.getElementById('multi1Mag').value) },
                { bin: parseInt(document.getElementById('multi2Bin').value),
                  mag: parseFloat(document.getElementById('multi2Mag').value) },
                { bin: parseInt(document.getElementById('multi3Bin').value),
                  mag: parseFloat(document.getElementById('multi3Mag').value) }
            ];
            bins.forEach(b => {
                if (b.mag > 0) {
                    spectrum.push({ bin: b.bin, magnitude: b.mag * N / 2, phase: 0 });
                }
            });
            break;
        }

        case 'lowpass':
        case 'bandpass': {
            const low = parseInt(document.getElementById('filterLow').value);
            const high = parseInt(document.getElementById('filterHigh').value);
            // Create flat spectrum in passband
            for (let k = low; k <= high && k < N / 2; k++) {
                spectrum.push({ bin: k, magnitude: N / 2, phase: Math.random() * 2 * Math.PI });
            }
            break;
        }

        case 'custom': {
            const customStr = document.getElementById('customSpectrum').value;
            const pairs = customStr.split(',').map(s => s.trim());
            pairs.forEach(pair => {
                const [binStr, magStr] = pair.split(':');
                const bin = parseInt(binStr);
                const mag = parseFloat(magStr);
                if (!isNaN(bin) && !isNaN(mag)) {
                    spectrum.push({ bin, magnitude: mag * N / 2, phase: 0 });
                }
            });
            break;
        }
    }

    return spectrum;
}

function calculate() {
    try {
        const N = parseInt(document.getElementById('sampleSize').value);
        const sampleRate = parseInt(document.getElementById('sampleRate').value);
        const spectrum = generateSpectrum();

        if (spectrum.length === 0) {
            throw new Error('No frequency components specified');
        }

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { spectrum, N, sampleRate }
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
    const { signal, N, sampleRate, originalSpectrum, verifySpectrum,
            ifftTime, imaginaryResidual, signalStats, expectedFreqs } = result;

    let html = `
        <div class="result-card">
            <h3>IFFT Results</h3>
            <p class="execution-time">Total time: ${executionTime}ms | IFFT core: ${ifftTime}ms</p>

            <div class="method-display">
                <div class="method-name">N = ${N} samples</div>
                <div class="method-info">Sample rate: ${sampleRate} Hz | Duration: ${(N / sampleRate * 1000).toFixed(1)} ms</div>
            </div>

            <h4>Signal Statistics</h4>
            <div class="signal-stats">
                <div class="stat-item">
                    <span class="stat-label">Mean:</span>
                    <span class="stat-value">${formatNumber(signalStats.mean)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">RMS:</span>
                    <span class="stat-value">${formatNumber(signalStats.rms)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Peak:</span>
                    <span class="stat-value">${formatNumber(signalStats.peak)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Range:</span>
                    <span class="stat-value">[${formatNumber(signalStats.min)}, ${formatNumber(signalStats.max)}]</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Energy:</span>
                    <span class="stat-value">${formatNumber(signalStats.energy)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Imag Residual:</span>
                    <span class="stat-value">${imaginaryResidual.toExponential(2)}</span>
                </div>
            </div>

            <h4>Expected Frequency Components</h4>
            <div class="expected-freqs">
                <table>
                    <tr>
                        <th>Bin</th>
                        <th>Frequency (Hz)</th>
                        <th>Spectrum Mag</th>
                        <th>Expected Amplitude</th>
                    </tr>
    `;

    expectedFreqs.forEach(f => {
        html += `
            <tr>
                <td>${f.bin}</td>
                <td>${f.frequency.toFixed(2)}</td>
                <td>${formatNumber(f.magnitude)}</td>
                <td>${formatNumber(f.expectedAmplitude)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Reconstructed signal visualization
    html += `
        <h4>Reconstructed Signal (Time Domain)</h4>
        <div class="signal-waveform">
    `;

    const displaySamples = Math.min(N, 200);
    const step = Math.max(1, Math.floor(N / displaySamples));
    const maxAmp = Math.max(...signal.map(Math.abs));

    html += `<div class="waveform-container">`;
    for (let n = 0; n < N; n += step) {
        const height = maxAmp > 0 ? (signal[n] / maxAmp * 50 + 50) : 50;
        html += `<div class="waveform-bar" style="height: ${height}%"></div>`;
    }
    html += `</div>`;

    html += `
        <div class="waveform-axis">
            <span>0</span>
            <span>${(N / 2 / sampleRate * 1000).toFixed(1)} ms</span>
            <span>${(N / sampleRate * 1000).toFixed(1)} ms</span>
        </div>
        </div>
    `;

    // Input spectrum visualization
    html += `
        <h4>Input Spectrum</h4>
        <div class="spectrum">
    `;

    const halfN = N / 2;
    const displayBins = Math.min(halfN, 64);
    const binStep = Math.max(1, Math.floor(halfN / displayBins));
    const maxSpecMag = Math.max(...originalSpectrum.slice(0, halfN).map(s => s.magnitude));

    for (let k = 0; k < halfN; k += binStep) {
        const s = originalSpectrum[k];
        const height = maxSpecMag > 0 ? (s.magnitude / maxSpecMag * 100) : 0;
        const isPeak = s.magnitude > maxSpecMag * 0.1;
        html += `
            <div class="spectrum-bar ${isPeak ? 'peak' : ''}" title="Bin ${k}: ${s.frequency.toFixed(1)} Hz">
                <div class="bar-fill" style="height: ${height}%"></div>
            </div>
        `;
    }

    html += `</div>`;

    // Verification
    html += `
        <h4>Verification (FFT of reconstructed signal)</h4>
        <div class="verification">
            <table>
                <tr>
                    <th>Bin</th>
                    <th>Original Mag</th>
                    <th>Recovered Mag</th>
                    <th>Error</th>
                </tr>
    `;

    expectedFreqs.slice(0, 5).forEach(f => {
        const original = originalSpectrum[f.bin]?.magnitude || 0;
        const recovered = verifySpectrum[f.bin]?.magnitude || 0;
        const error = Math.abs(original - recovered);
        html += `
            <tr>
                <td>${f.bin}</td>
                <td>${formatNumber(original)}</td>
                <td>${formatNumber(recovered)}</td>
                <td>${error.toExponential(2)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Signal samples
    html += `
        <h4>Signal Samples (First 20)</h4>
        <div class="signal-samples">
    `;

    signal.slice(0, 20).forEach((x, n) => {
        html += `<span class="sample-val">x[${n}] = ${formatNumber(x, 4)}</span>`;
    });

    if (N > 20) {
        html += `<span class="sample-more">... ${N - 20} more</span>`;
    }

    html += `</div></div>`;
    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 4) {
    if (Math.abs(val) < 0.0001 && val !== 0) {
        return val.toExponential(decimals);
    }
    if (Math.abs(val) > 10000) {
        return val.toExponential(decimals);
    }
    return val.toFixed(decimals);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadPreset('harmonic');
});
