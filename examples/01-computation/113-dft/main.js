/**
 * Main script for Discrete Fourier Transform
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
        ['sine', 'cosine', 'composite', 'square', 'sawtooth'].includes(type) ? 'block' : 'none';
    document.getElementById('compositeParams').style.display =
        type === 'composite' ? 'block' : 'none';
    document.getElementById('customValues').style.display =
        type === 'custom' ? 'block' : 'none';
}

function loadPreset(preset) {
    switch (preset) {
        case 'single':
            document.getElementById('signalType').value = 'sine';
            document.getElementById('freq1').value = '5';
            document.getElementById('amp1').value = '1';
            break;
        case 'dual':
            document.getElementById('signalType').value = 'composite';
            document.getElementById('freq1').value = '3';
            document.getElementById('amp1').value = '1';
            document.getElementById('freq2').value = '10';
            document.getElementById('amp2').value = '0.5';
            document.getElementById('freq3').value = '0';
            document.getElementById('amp3').value = '0';
            break;
        case 'triple':
            document.getElementById('signalType').value = 'composite';
            document.getElementById('freq1').value = '2';
            document.getElementById('amp1').value = '1';
            document.getElementById('freq2').value = '7';
            document.getElementById('amp2').value = '0.7';
            document.getElementById('freq3').value = '15';
            document.getElementById('amp3').value = '0.4';
            break;
        case 'square':
            document.getElementById('signalType').value = 'square';
            document.getElementById('freq1').value = '4';
            document.getElementById('amp1').value = '1';
            break;
    }
    updateSignalOptions();
}

function generateSignal() {
    const type = document.getElementById('signalType').value;
    const N = parseInt(document.getElementById('sampleSize').value);
    const freq1 = parseInt(document.getElementById('freq1').value);
    const amp1 = parseFloat(document.getElementById('amp1').value);

    const signal = [];

    switch (type) {
        case 'sine':
            for (let n = 0; n < N; n++) {
                signal.push(amp1 * Math.sin(2 * Math.PI * freq1 * n / N));
            }
            break;

        case 'cosine':
            for (let n = 0; n < N; n++) {
                signal.push(amp1 * Math.cos(2 * Math.PI * freq1 * n / N));
            }
            break;

        case 'composite':
            const freq2 = parseInt(document.getElementById('freq2').value);
            const amp2 = parseFloat(document.getElementById('amp2').value);
            const freq3 = parseInt(document.getElementById('freq3').value);
            const amp3 = parseFloat(document.getElementById('amp3').value);
            for (let n = 0; n < N; n++) {
                let val = amp1 * Math.sin(2 * Math.PI * freq1 * n / N);
                if (amp2 !== 0) val += amp2 * Math.sin(2 * Math.PI * freq2 * n / N);
                if (amp3 !== 0) val += amp3 * Math.sin(2 * Math.PI * freq3 * n / N);
                signal.push(val);
            }
            break;

        case 'square':
            for (let n = 0; n < N; n++) {
                const phase = (freq1 * n / N) % 1;
                signal.push(amp1 * (phase < 0.5 ? 1 : -1));
            }
            break;

        case 'sawtooth':
            for (let n = 0; n < N; n++) {
                const phase = (freq1 * n / N) % 1;
                signal.push(amp1 * (2 * phase - 1));
            }
            break;

        case 'impulse':
            for (let n = 0; n < N; n++) {
                signal.push(n === 0 ? 1 : 0);
            }
            break;

        case 'noise':
            for (let n = 0; n < N; n++) {
                signal.push(Math.random() * 2 - 1);
            }
            break;

        case 'custom':
            const customStr = document.getElementById('customSignal').value;
            const values = customStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
            if (values.length === 0) {
                throw new Error('Invalid custom signal values');
            }
            // Repeat or truncate to match N
            for (let n = 0; n < N; n++) {
                signal.push(values[n % values.length]);
            }
            break;
    }

    return signal;
}

function calculate() {
    try {
        const signal = generateSignal();
        const viewFreq = parseInt(document.getElementById('viewFreq').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { signal, viewFreq }
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
    const { signal, N, spectrum, dominantFreqs, timeEnergy, freqEnergy,
            viewBin, detailedView, reconstructionError } = result;

    let html = `
        <div class="result-card">
            <h3>DFT Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms (O(N²) = O(${N * N}))</p>

            <div class="method-display">
                <div class="method-name">N = ${N} Samples</div>
                <div class="method-info">Frequency resolution: ${N} bins (0 to ${N - 1})</div>
            </div>

            <h4>Input Signal (Time Domain)</h4>
            <div class="signal-display">
                <div class="signal-samples">
    `;

    signal.slice(0, 16).forEach((x, n) => {
        html += `<span class="sample">x[${n}] = ${formatNumber(x, 4)}</span>`;
    });

    if (N > 16) {
        html += `<span class="sample more">... ${N - 16} more</span>`;
    }

    html += `</div></div>`;

    // Magnitude Spectrum
    html += `
        <h4>Magnitude Spectrum</h4>
        <div class="spectrum">
    `;

    const maxMag = Math.max(...spectrum.map(s => s.magnitude));
    const displayBins = Math.min(N / 2 + 1, 32);

    for (let k = 0; k < displayBins; k++) {
        const height = maxMag > 0 ? (spectrum[k].magnitude / maxMag * 100) : 0;
        const isSignificant = spectrum[k].magnitude > maxMag * 0.1;
        html += `
            <div class="spectrum-bar ${isSignificant ? 'significant' : ''}">
                <div class="bar-fill" style="height: ${height}%"></div>
                <span class="bar-label">${k}</span>
            </div>
        `;
    }

    if (N / 2 > 32) {
        html += `<div class="spectrum-bar more"><span class="bar-label">...</span></div>`;
    }

    html += `</div>`;

    // Dominant frequencies
    html += `
        <h4>Dominant Frequencies</h4>
        <div class="dominant-freqs">
            <table>
                <tr>
                    <th>Bin k</th>
                    <th>Magnitude</th>
                    <th>Phase (°)</th>
                    <th>Normalized</th>
                </tr>
    `;

    dominantFreqs.forEach(d => {
        html += `
            <tr>
                <td>${d.k}</td>
                <td>${formatNumber(d.magnitude, 4)}</td>
                <td>${formatNumber(d.phaseDegrees, 2)}</td>
                <td>${formatNumber(d.normalizedMagnitude, 4)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Detailed frequency bin
    html += `
        <h4>Detailed View: X[${viewBin}]</h4>
        <div class="detailed-bin">
            <div class="bin-result">
                <div class="bin-complex">
                    X[${viewBin}] = ${formatNumber(detailedView.real, 4)} ${detailedView.imag >= 0 ? '+' : ''} ${formatNumber(detailedView.imag, 4)}i
                </div>
                <div class="bin-polar">
                    = ${formatNumber(detailedView.magnitude, 4)} ∠ ${formatNumber(detailedView.phaseDegrees, 2)}°
                </div>
            </div>

            <div class="bin-terms">
                <table>
                    <tr>
                        <th>n</th>
                        <th>x[n]</th>
                        <th>angle (°)</th>
                        <th>cos(θ)</th>
                        <th>sin(θ)</th>
                        <th>Real contrib</th>
                        <th>Imag contrib</th>
                    </tr>
    `;

    detailedView.terms.forEach(t => {
        html += `
            <tr>
                <td>${t.n}</td>
                <td>${formatNumber(t.xn, 3)}</td>
                <td>${formatNumber(t.angleDegrees, 1)}</td>
                <td>${formatNumber(t.cosVal, 3)}</td>
                <td>${formatNumber(t.sinVal, 3)}</td>
                <td>${formatNumber(t.realContrib, 4)}</td>
                <td>${formatNumber(t.imagContrib, 4)}</td>
            </tr>
        `;
    });

    if (detailedView.totalTerms > 16) {
        html += `<tr><td colspan="7" class="more-rows">... ${detailedView.totalTerms - 16} more terms</td></tr>`;
    }

    html += `
                    <tr class="total-row">
                        <td colspan="5">Total</td>
                        <td>${formatNumber(detailedView.real, 4)}</td>
                        <td>${formatNumber(detailedView.imag, 4)}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    // First 10 DFT coefficients
    html += `
        <h4>DFT Coefficients (First 10)</h4>
        <div class="coefficients">
            <table>
                <tr>
                    <th>k</th>
                    <th>Real</th>
                    <th>Imaginary</th>
                    <th>|X[k]|</th>
                    <th>Phase</th>
                </tr>
    `;

    spectrum.slice(0, 10).forEach(s => {
        html += `
            <tr>
                <td>${s.k}</td>
                <td>${formatNumber(s.real, 4)}</td>
                <td>${formatNumber(s.imag, 4)}</td>
                <td>${formatNumber(s.magnitude, 4)}</td>
                <td>${formatNumber(s.phaseDegrees, 2)}°</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Energy analysis
    html += `
        <h4>Energy Analysis (Parseval's Theorem)</h4>
        <div class="energy-analysis">
            <div class="energy-item">
                <span class="energy-label">Time Domain Energy:</span>
                <span class="energy-value">Σ|x[n]|² = ${formatNumber(timeEnergy, 6)}</span>
            </div>
            <div class="energy-item">
                <span class="energy-label">Freq Domain Energy:</span>
                <span class="energy-value">(1/N)Σ|X[k]|² = ${formatNumber(freqEnergy, 6)}</span>
            </div>
            <div class="energy-item">
                <span class="energy-label">Reconstruction Error:</span>
                <span class="energy-value">${reconstructionError.toExponential(4)}</span>
            </div>
        </div>
    `;

    // Properties
    html += `
        <h4>Transform Properties</h4>
        <div class="properties">
            <div class="prop-item">
                <span class="prop-label">DC Component (k=0):</span>
                <span class="prop-value">${formatNumber(spectrum[0].real / N, 4)} (mean of signal)</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Nyquist Bin (k=N/2):</span>
                <span class="prop-value">${N % 2 === 0 ? formatNumber(spectrum[N/2].magnitude, 4) : 'N/A (N is odd)'}</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Symmetry Check:</span>
                <span class="prop-value">|X[1]| = ${formatNumber(spectrum[1].magnitude, 4)}, |X[N-1]| = ${formatNumber(spectrum[N-1].magnitude, 4)}</span>
            </div>
        </div>
    `;

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-12) return '0';
    if (Math.abs(val) < 0.0001 || Math.abs(val) > 10000) {
        return val.toExponential(Math.min(decimals, 4));
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
