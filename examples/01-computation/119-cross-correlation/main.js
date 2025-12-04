/**
 * Main script for Cross-Correlation
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
    const type1 = document.getElementById('signal1Type').value;
    const type2 = document.getElementById('signal2Type').value;
    const corrType = document.getElementById('correlationType').value;

    document.getElementById('signal1Options').style.display =
        ['sine', 'cosine', 'pulse', 'chirp', 'noise'].includes(type1) ? 'block' : 'none';
    document.getElementById('custom1Options').style.display =
        type1 === 'custom' ? 'block' : 'none';

    // Hide signal 2 controls for auto-correlation
    document.getElementById('signal2Controls').style.display =
        corrType === 'auto' ? 'none' : 'block';

    document.getElementById('signal2Options').style.display =
        ['sine', 'cosine', 'pulse', 'shifted', 'noisy-copy'].includes(type2) ? 'block' : 'none';
    document.getElementById('custom2Options').style.display =
        type2 === 'custom' ? 'block' : 'none';
}

function loadPreset(preset) {
    switch (preset) {
        case 'delay':
            document.getElementById('correlationType').value = 'cross';
            document.getElementById('signal1Type').value = 'pulse';
            document.getElementById('signal2Type').value = 'shifted';
            document.getElementById('freq1').value = '1';
            document.getElementById('amplitude1').value = '100';
            document.getElementById('shift').value = '25';
            document.getElementById('signalSize').value = '128';
            break;
        case 'pattern':
            document.getElementById('correlationType').value = 'normalized';
            document.getElementById('signal1Type').value = 'sine';
            document.getElementById('signal2Type').value = 'noisy-copy';
            document.getElementById('freq1').value = '5';
            document.getElementById('amplitude1').value = '100';
            document.getElementById('signalSize').value = '256';
            break;
        case 'periodic':
            document.getElementById('correlationType').value = 'auto';
            document.getElementById('signal1Type').value = 'sine';
            document.getElementById('freq1').value = '8';
            document.getElementById('amplitude1').value = '100';
            document.getElementById('signalSize').value = '256';
            break;
        case 'similarity':
            document.getElementById('correlationType').value = 'normalized';
            document.getElementById('signal1Type').value = 'chirp';
            document.getElementById('signal2Type').value = 'sine';
            document.getElementById('freq1').value = '5';
            document.getElementById('freq2').value = '5';
            document.getElementById('amplitude1').value = '100';
            document.getElementById('amplitude2').value = '100';
            document.getElementById('signalSize').value = '128';
            break;
    }
    updateSignalOptions();
}

function generateSignal1() {
    const type = document.getElementById('signal1Type').value;
    const N = parseInt(document.getElementById('signalSize').value);
    const freq = parseFloat(document.getElementById('freq1').value);
    const amplitude = parseFloat(document.getElementById('amplitude1').value);

    return generateSignal(type, N, freq, amplitude, 'customValues1');
}

function generateSignal2(signal1) {
    const corrType = document.getElementById('correlationType').value;
    if (corrType === 'auto') {
        return signal1.slice();
    }

    const type = document.getElementById('signal2Type').value;
    const N = parseInt(document.getElementById('signalSize').value);
    const freq = parseFloat(document.getElementById('freq2').value);
    const amplitude = parseFloat(document.getElementById('amplitude2').value);
    const shift = parseInt(document.getElementById('shift').value);

    if (type === 'shifted') {
        // Create a shifted version of signal1
        const shifted = new Array(N).fill(0);
        for (let i = 0; i < N; i++) {
            const srcIdx = i - shift;
            if (srcIdx >= 0 && srcIdx < N) {
                shifted[i] = signal1[srcIdx];
            }
        }
        return shifted;
    }

    if (type === 'noisy-copy') {
        // Create a noisy copy of signal1
        return signal1.map(x => x + (Math.random() - 0.5) * amplitude * 0.3);
    }

    return generateSignal(type, N, freq, amplitude, 'customValues2');
}

function generateSignal(type, N, freq, amplitude, customId) {
    const signal = new Array(N);

    switch (type) {
        case 'sine':
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude * Math.sin(2 * Math.PI * freq * n / N);
            }
            break;

        case 'cosine':
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude * Math.cos(2 * Math.PI * freq * n / N);
            }
            break;

        case 'pulse':
            for (let n = 0; n < N; n++) {
                signal[n] = (n >= N * 0.4 && n < N * 0.5) ? amplitude : 0;
            }
            break;

        case 'chirp':
            for (let n = 0; n < N; n++) {
                const t = n / N;
                const instantFreq = freq * (1 + 2 * t);
                signal[n] = amplitude * Math.sin(2 * Math.PI * instantFreq * t);
            }
            break;

        case 'noise':
            for (let n = 0; n < N; n++) {
                signal[n] = (Math.random() - 0.5) * amplitude * 2;
            }
            break;

        case 'custom':
            const customStr = document.getElementById(customId).value;
            const values = customStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
            for (let n = 0; n < N; n++) {
                signal[n] = values[n % values.length] || 0;
            }
            break;

        default:
            for (let n = 0; n < N; n++) {
                signal[n] = 0;
            }
    }

    return signal;
}

function calculate() {
    try {
        const signal1 = generateSignal1();
        const signal2 = generateSignal2(signal1);
        const correlationType = document.getElementById('correlationType').value;

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { signal1, signal2, correlationType }
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
    const { signal1, signal2, correlation, N, correlationType,
            peakLag, peakValue, stats, spectrum1, spectrum2, normalizedCorr } = result;

    const typeNames = {
        'cross': 'Cross-Correlation',
        'auto': 'Auto-Correlation',
        'normalized': 'Normalized Cross-Correlation'
    };

    let html = `
        <div class="result-card">
            <h3>Correlation Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${typeNames[correlationType]}</div>
                <div class="method-info">N = ${N} samples | Peak Lag = ${peakLag}</div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Peak Lag</span>
                    <span class="stat-value">${peakLag}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Peak Value</span>
                    <span class="stat-value">${peakValue.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Correlation Coeff</span>
                    <span class="stat-value">${stats.normalizedPeak.toFixed(4)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Est. Delay</span>
                    <span class="stat-value">${stats.estimatedDelay} samples</span>
                </div>
            </div>

            <h4>Signal 1 (Reference)</h4>
            <div class="signal-display">
    `;

    // Signal 1 visualization
    const max1 = Math.max(...signal1.map(Math.abs));
    const display1 = signal1.length > 256 ? signal1.filter((_, i) => i % Math.ceil(signal1.length / 256) === 0) : signal1;

    display1.forEach((x) => {
        const height = max1 > 0 ? (x / max1 * 45 + 50) : 50;
        html += `<div class="signal-bar signal1" style="height: ${height}%"></div>`;
    });

    html += `</div>`;

    // Signal 2 visualization (if not auto-correlation)
    if (correlationType !== 'auto') {
        html += `<h4>Signal 2 (Test)</h4><div class="signal-display">`;

        const max2 = Math.max(...signal2.map(Math.abs));
        const display2 = signal2.length > 256 ? signal2.filter((_, i) => i % Math.ceil(signal2.length / 256) === 0) : signal2;

        display2.forEach((x) => {
            const height = max2 > 0 ? (x / max2 * 45 + 50) : 50;
            html += `<div class="signal-bar signal2" style="height: ${height}%"></div>`;
        });

        html += `</div>`;
    }

    // Correlation result
    html += `<h4>Correlation Function</h4><div class="correlation-display">`;

    const corrMax = Math.max(...correlation.map(Math.abs));
    const displayCorr = correlation.length > 256 ? correlation.filter((_, i) => i % Math.ceil(correlation.length / 256) === 0) : correlation;
    const centerIdx = Math.floor(displayCorr.length / 2);

    displayCorr.forEach((c, i) => {
        const height = corrMax > 0 ? Math.abs(c) / corrMax * 100 : 0;
        const isPositive = c >= 0;
        const isPeak = Math.abs(i - centerIdx) === Math.abs(Math.round(peakLag * displayCorr.length / correlation.length));
        html += `<div class="corr-bar ${isPositive ? 'positive' : 'negative'} ${isPeak ? 'peak' : ''}" style="height: ${height}%"></div>`;
    });

    html += `</div>`;
    html += `<div class="lag-axis"><span>-${Math.floor(N/2)}</span><span>0</span><span>+${Math.floor(N/2)}</span></div>`;

    // Spectra comparison
    html += `
        <h4>Frequency Spectra</h4>
        <div class="spectra-container">
            <div class="spectrum-panel">
                <div class="spectrum-title">|Signal 1 Spectrum|</div>
                <div class="spectrum-display">
    `;

    const spec1Max = Math.max(...spectrum1);
    const displaySpec1 = spectrum1.length > 64 ? spectrum1.filter((_, i) => i % Math.ceil(spectrum1.length / 64) === 0) : spectrum1;

    displaySpec1.forEach((m) => {
        const height = spec1Max > 0 ? m / spec1Max * 100 : 0;
        html += `<div class="spectrum-bar s1" style="height: ${height}%"></div>`;
    });

    html += `</div></div>`;

    if (correlationType !== 'auto') {
        html += `
            <div class="spectrum-panel">
                <div class="spectrum-title">|Signal 2 Spectrum|</div>
                <div class="spectrum-display">
        `;

        const spec2Max = Math.max(...spectrum2);
        const displaySpec2 = spectrum2.length > 64 ? spectrum2.filter((_, i) => i % Math.ceil(spectrum2.length / 64) === 0) : spectrum2;

        displaySpec2.forEach((m) => {
            const height = spec2Max > 0 ? m / spec2Max * 100 : 0;
            html += `<div class="spectrum-bar s2" style="height: ${height}%"></div>`;
        });

        html += `</div></div>`;
    }

    html += `</div>`;

    // Secondary peaks
    if (stats.secondaryPeaks.length > 0) {
        html += `
            <h4>Top Correlation Peaks</h4>
            <div class="peaks-table">
                <table>
                    <tr>
                        <th>Rank</th>
                        <th>Lag</th>
                        <th>Value</th>
                        <th>Strength</th>
                    </tr>
        `;

        const maxPeak = Math.max(...stats.secondaryPeaks.map(p => Math.abs(p.value)));
        stats.secondaryPeaks.forEach((peak, idx) => {
            const strength = Math.abs(peak.value) / maxPeak * 100;
            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${peak.lag}</td>
                    <td>${peak.value.toFixed(4)}</td>
                    <td>
                        <div class="strength-container">
                            <div class="strength-bar" style="width: ${strength}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</table></div>`;
    }

    // Periodicity (for auto-correlation)
    if (correlationType === 'auto' && stats.periodicity) {
        html += `
            <h4>Periodicity Detection</h4>
            <div class="periodicity-info">
                <p>Estimated period: <strong>${stats.periodicity} samples</strong></p>
                <p>This suggests the signal has a repeating pattern every ${stats.periodicity} samples.</p>
            </div>
        `;
    }

    // Signal statistics
    html += `
        <h4>Signal Statistics</h4>
        <div class="stats-table">
            <table>
                <tr>
                    <th>Property</th>
                    <th>Signal 1</th>
                    ${correlationType !== 'auto' ? '<th>Signal 2</th>' : ''}
                </tr>
                <tr>
                    <td>Mean</td>
                    <td>${stats.mean1.toFixed(4)}</td>
                    ${correlationType !== 'auto' ? `<td>${stats.mean2.toFixed(4)}</td>` : ''}
                </tr>
                <tr>
                    <td>Std Dev</td>
                    <td>${stats.std1.toFixed(4)}</td>
                    ${correlationType !== 'auto' ? `<td>${stats.std2.toFixed(4)}</td>` : ''}
                </tr>
                <tr>
                    <td>Energy</td>
                    <td>${stats.energy1.toFixed(2)}</td>
                    ${correlationType !== 'auto' ? `<td>${stats.energy2.toFixed(2)}</td>` : ''}
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
    loadPreset('delay');
    document.getElementById('correlationType').addEventListener('change', updateSignalOptions);
});
