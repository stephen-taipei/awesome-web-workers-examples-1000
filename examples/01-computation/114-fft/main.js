/**
 * Main script for Fast Fourier Transform
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
    const showComposite = ['sine', 'composite', 'square', 'am'].includes(type);
    document.getElementById('compositeParams').style.display =
        type === 'composite' ? 'block' : 'none';
}

function loadPreset(preset) {
    const sampleRate = document.getElementById('sampleRate');
    switch (preset) {
        case 'single':
            document.getElementById('signalType').value = 'sine';
            document.getElementById('freq1').value = '100';
            document.getElementById('amp1').value = '1';
            sampleRate.value = '1000';
            break;
        case 'dual':
            document.getElementById('signalType').value = 'composite';
            document.getElementById('freq1').value = '50';
            document.getElementById('amp1').value = '1';
            document.getElementById('freq2').value = '120';
            document.getElementById('amp2').value = '0.7';
            document.getElementById('freq3').value = '0';
            document.getElementById('amp3').value = '0';
            sampleRate.value = '1000';
            break;
        case 'dtmf':
            document.getElementById('signalType').value = 'composite';
            document.getElementById('freq1').value = '697';
            document.getElementById('amp1').value = '1';
            document.getElementById('freq2').value = '1209';
            document.getElementById('amp2').value = '1';
            document.getElementById('freq3').value = '0';
            document.getElementById('amp3').value = '0';
            sampleRate.value = '8000';
            break;
        case 'chirp':
            document.getElementById('signalType').value = 'chirp';
            document.getElementById('freq1').value = '10';
            document.getElementById('freq2').value = '200';
            sampleRate.value = '1000';
            break;
    }
    updateSignalOptions();
}

function generateSignal() {
    const type = document.getElementById('signalType').value;
    const N = parseInt(document.getElementById('sampleSize').value);
    const sampleRate = parseInt(document.getElementById('sampleRate').value);
    const freq1 = parseFloat(document.getElementById('freq1').value);
    const amp1 = parseFloat(document.getElementById('amp1').value);
    const freq2 = parseFloat(document.getElementById('freq2').value);
    const amp2 = parseFloat(document.getElementById('amp2').value);
    const freq3 = parseFloat(document.getElementById('freq3').value);
    const amp3 = parseFloat(document.getElementById('amp3').value);

    const signal = new Float64Array(N);
    const dt = 1 / sampleRate;

    switch (type) {
        case 'sine':
            for (let n = 0; n < N; n++) {
                const t = n * dt;
                signal[n] = amp1 * Math.sin(2 * Math.PI * freq1 * t);
            }
            break;

        case 'composite':
            for (let n = 0; n < N; n++) {
                const t = n * dt;
                signal[n] = amp1 * Math.sin(2 * Math.PI * freq1 * t);
                if (amp2 !== 0) signal[n] += amp2 * Math.sin(2 * Math.PI * freq2 * t);
                if (amp3 !== 0) signal[n] += amp3 * Math.sin(2 * Math.PI * freq3 * t);
            }
            break;

        case 'chirp':
            // Linear chirp from freq1 to freq2
            const f0 = freq1, f1 = freq2;
            const T = N * dt;
            const k = (f1 - f0) / T;
            for (let n = 0; n < N; n++) {
                const t = n * dt;
                signal[n] = amp1 * Math.sin(2 * Math.PI * (f0 * t + 0.5 * k * t * t));
            }
            break;

        case 'square':
            for (let n = 0; n < N; n++) {
                const t = n * dt;
                signal[n] = amp1 * Math.sign(Math.sin(2 * Math.PI * freq1 * t));
            }
            break;

        case 'impulse':
            signal[0] = 1;
            break;

        case 'noise':
            for (let n = 0; n < N; n++) {
                signal[n] = (Math.random() * 2 - 1);
            }
            break;

        case 'am':
            // AM modulation: carrier at freq1, modulation at freq2
            for (let n = 0; n < N; n++) {
                const t = n * dt;
                const modulation = 1 + 0.5 * Math.cos(2 * Math.PI * freq2 * t);
                signal[n] = amp1 * modulation * Math.cos(2 * Math.PI * freq1 * t);
            }
            break;
    }

    return { signal: Array.from(signal), sampleRate };
}

function calculate() {
    try {
        const { signal, sampleRate } = generateSignal();

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { signal, sampleRate }
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
    const { signal, N, sampleRate, freqResolution, spectrum, peaks,
            fftTime, dftOps, fftOps, speedup, timeEnergy, freqEnergy } = result;

    let html = `
        <div class="result-card">
            <h3>FFT Results</h3>
            <p class="execution-time">Total time: ${executionTime}ms | FFT core: ${fftTime}ms</p>

            <div class="method-display">
                <div class="method-name">N = ${N.toLocaleString()} samples</div>
                <div class="method-info">Sample rate: ${sampleRate} Hz | Resolution: ${freqResolution.toFixed(2)} Hz/bin</div>
            </div>

            <div class="complexity-comparison">
                <div class="complexity-item">
                    <span class="comp-label">DFT Operations:</span>
                    <span class="comp-value">${dftOps.toLocaleString()}</span>
                </div>
                <div class="complexity-item">
                    <span class="comp-label">FFT Operations:</span>
                    <span class="comp-value">${fftOps.toLocaleString()}</span>
                </div>
                <div class="complexity-item highlight">
                    <span class="comp-label">Speedup:</span>
                    <span class="comp-value">${speedup}×</span>
                </div>
            </div>

            <h4>Detected Frequency Peaks</h4>
            <div class="peaks-table">
                <table>
                    <tr>
                        <th>Bin</th>
                        <th>Frequency (Hz)</th>
                        <th>Magnitude</th>
                        <th>Normalized</th>
                        <th>Phase (°)</th>
                    </tr>
    `;

    peaks.forEach(p => {
        html += `
            <tr>
                <td>${p.bin}</td>
                <td>${p.frequency.toFixed(2)}</td>
                <td>${p.magnitude.toFixed(4)}</td>
                <td>${p.magnitudeNorm.toFixed(4)}</td>
                <td>${p.phase.toFixed(1)}</td>
            </tr>
        `;
    });

    if (peaks.length === 0) {
        html += `<tr><td colspan="5" class="no-peaks">No significant peaks detected</td></tr>`;
    }

    html += `</table></div>`;

    // Magnitude spectrum visualization
    html += `
        <h4>Magnitude Spectrum (0 to Nyquist)</h4>
        <div class="spectrum">
    `;

    const halfN = N / 2;
    const displayBins = Math.min(halfN, 128);
    const binStep = Math.max(1, Math.floor(halfN / displayBins));
    const maxMag = Math.max(...spectrum.slice(0, halfN).map(s => s.magnitude));

    for (let i = 0; i < halfN; i += binStep) {
        const s = spectrum[i];
        const height = maxMag > 0 ? (s.magnitude / maxMag * 100) : 0;
        const isPeak = peaks.some(p => Math.abs(p.bin - i) < binStep);
        html += `
            <div class="spectrum-bar ${isPeak ? 'peak' : ''}" title="${s.frequency.toFixed(1)} Hz">
                <div class="bar-fill" style="height: ${height}%"></div>
            </div>
        `;
    }

    html += `
        </div>
        <div class="spectrum-axis">
            <span>0 Hz</span>
            <span>${(sampleRate / 4).toFixed(0)} Hz</span>
            <span>${(sampleRate / 2).toFixed(0)} Hz (Nyquist)</span>
        </div>
    `;

    // First few DFT coefficients
    html += `
        <h4>FFT Coefficients (First 10 bins)</h4>
        <div class="coefficients">
            <table>
                <tr>
                    <th>Bin k</th>
                    <th>Frequency</th>
                    <th>Real</th>
                    <th>Imaginary</th>
                    <th>|X[k]|</th>
                    <th>dB</th>
                </tr>
    `;

    spectrum.slice(0, 10).forEach(s => {
        html += `
            <tr>
                <td>${s.k}</td>
                <td>${s.frequency.toFixed(2)} Hz</td>
                <td>${formatNumber(s.real, 2)}</td>
                <td>${formatNumber(s.imag, 2)}</td>
                <td>${formatNumber(s.magnitude, 2)}</td>
                <td>${s.magnitudeDB.toFixed(1)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Energy conservation
    html += `
        <h4>Energy Conservation (Parseval)</h4>
        <div class="energy-analysis">
            <div class="energy-item">
                <span class="energy-label">Time Domain:</span>
                <span class="energy-value">Σ|x[n]|² = ${formatNumber(timeEnergy, 4)}</span>
            </div>
            <div class="energy-item">
                <span class="energy-label">Frequency Domain:</span>
                <span class="energy-value">(1/N)Σ|X[k]|² = ${formatNumber(freqEnergy, 4)}</span>
            </div>
            <div class="energy-item">
                <span class="energy-label">Relative Error:</span>
                <span class="energy-value">${((Math.abs(timeEnergy - freqEnergy) / timeEnergy) * 100).toExponential(2)}%</span>
            </div>
        </div>
    `;

    // Input signal preview
    html += `
        <h4>Input Signal (First 100 samples)</h4>
        <div class="signal-preview">
    `;

    signal.slice(0, 50).forEach((x, n) => {
        html += `<span class="sample-val" title="x[${n}]">${x.toFixed(3)}</span>`;
    });

    if (signal.length > 50) {
        html += `<span class="sample-more">... ${N - 50} more</span>`;
    }

    html += `</div></div>`;
    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 4) {
    if (Math.abs(val) < 0.0001 || Math.abs(val) > 10000) {
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
    loadPreset('dual');
});
