/**
 * Main script for Wavelet Transform
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
        ['sine', 'step', 'chirp', 'noisy-sine', 'composite'].includes(type) ? 'block' : 'none';
    document.getElementById('customOptions').style.display =
        type === 'custom' ? 'block' : 'none';
}

function loadPreset(preset) {
    switch (preset) {
        case 'smooth':
            document.getElementById('signalType').value = 'sine';
            document.getElementById('freq').value = '2';
            document.getElementById('amplitude').value = '100';
            document.getElementById('sampleSize').value = '64';
            document.getElementById('waveletType').value = 'haar';
            document.getElementById('decompLevel').value = '3';
            document.getElementById('threshold').value = '0';
            break;
        case 'edge':
            document.getElementById('signalType').value = 'step';
            document.getElementById('amplitude').value = '100';
            document.getElementById('sampleSize').value = '64';
            document.getElementById('waveletType').value = 'haar';
            document.getElementById('decompLevel').value = '3';
            document.getElementById('threshold').value = '0';
            break;
        case 'denoise':
            document.getElementById('signalType').value = 'noisy-sine';
            document.getElementById('freq').value = '3';
            document.getElementById('amplitude').value = '100';
            document.getElementById('sampleSize').value = '128';
            document.getElementById('waveletType').value = 'db2';
            document.getElementById('decompLevel').value = '4';
            document.getElementById('threshold').value = '20';
            break;
        case 'compress':
            document.getElementById('signalType').value = 'composite';
            document.getElementById('amplitude').value = '100';
            document.getElementById('sampleSize').value = '256';
            document.getElementById('waveletType').value = 'db4';
            document.getElementById('decompLevel').value = 'max';
            document.getElementById('threshold').value = '10';
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
        case 'sine':
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude * Math.sin(2 * Math.PI * freq * n / N);
            }
            break;

        case 'step':
            for (let n = 0; n < N; n++) {
                signal[n] = n < N / 2 ? 0 : amplitude;
            }
            break;

        case 'chirp':
            // Frequency sweep from low to high
            for (let n = 0; n < N; n++) {
                const t = n / N;
                const instantFreq = freq * (1 + 3 * t); // Frequency increases with time
                signal[n] = amplitude * Math.sin(2 * Math.PI * instantFreq * t);
            }
            break;

        case 'noisy-sine':
            for (let n = 0; n < N; n++) {
                const clean = amplitude * Math.sin(2 * Math.PI * freq * n / N);
                const noise = (Math.random() - 0.5) * amplitude * 0.5;
                signal[n] = clean + noise;
            }
            break;

        case 'composite':
            // Multiple frequency components
            for (let n = 0; n < N; n++) {
                signal[n] = amplitude * 0.5 * Math.sin(2 * Math.PI * 2 * n / N) +
                           amplitude * 0.3 * Math.sin(2 * Math.PI * 8 * n / N) +
                           amplitude * 0.2 * Math.cos(2 * Math.PI * 16 * n / N);
            }
            break;

        case 'custom':
            const customStr = document.getElementById('customValues').value;
            const values = customStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
            // Pad or trim to N
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
        const waveletType = document.getElementById('waveletType').value;
        const levels = document.getElementById('decompLevel').value;
        const thresholdPercent = parseInt(document.getElementById('threshold').value);

        document.getElementById('calculateBtn').disabled = true;
        showProgress();
        initWorker();

        worker.postMessage({
            data: { signal, waveletType, levels, thresholdPercent }
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
    const { signal, N, waveletType, levels, maxLevels, decomposition,
            thresholdedDecomp, reconstructed, thresholdPercent, stats } = result;

    let html = `
        <div class="result-card">
            <h3>Wavelet Transform Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${waveletType.toUpperCase()} Wavelet</div>
                <div class="method-info">N = ${N} | ${levels} of ${maxLevels} levels | Threshold: ${thresholdPercent}%</div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Compression Ratio</span>
                    <span class="stat-value">${stats.compressionRatio.toFixed(2)}:1</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Non-zero Coeffs</span>
                    <span class="stat-value">${stats.nonZeroCoeffs}/${stats.totalCoeffs}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">MSE</span>
                    <span class="stat-value">${stats.mse.toFixed(6)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">PSNR</span>
                    <span class="stat-value">${isFinite(stats.psnr) ? stats.psnr.toFixed(2) + ' dB' : '∞'}</span>
                </div>
            </div>

            <h4>Original Signal</h4>
            <div class="signal-display">
    `;

    // Original signal visualization
    const maxVal = Math.max(...signal.map(Math.abs));
    signal.forEach((x, n) => {
        const height = maxVal > 0 ? (x / maxVal * 45 + 50) : 50;
        html += `<div class="signal-bar original" style="height: ${height}%" title="x[${n}]=${x.toFixed(2)}"></div>`;
    });

    html += `</div>`;

    // Decomposition levels
    html += `<h4>Wavelet Decomposition</h4><div class="decomposition-levels">`;

    for (let level = 0; level < levels; level++) {
        const detail = decomposition.details[level];
        const maxD = Math.max(...detail.map(Math.abs));

        html += `
            <div class="level-display">
                <div class="level-header">
                    <span class="level-name">Level ${level + 1} Detail (cD${level + 1})</span>
                    <span class="level-info">${detail.length} coefficients</span>
                </div>
                <div class="coeff-display detail">
        `;

        detail.forEach((d, k) => {
            const height = maxD > 0 ? Math.abs(d) / maxD * 100 : 0;
            const isPositive = d >= 0;
            html += `<div class="coeff-bar ${isPositive ? 'positive' : 'negative'}" style="height: ${height}%" title="cD${level + 1}[${k}]=${d.toFixed(3)}"></div>`;
        });

        html += `</div></div>`;
    }

    // Final approximation
    const finalApprox = decomposition.approximations[levels - 1];
    const maxA = Math.max(...finalApprox.map(Math.abs));

    html += `
        <div class="level-display">
            <div class="level-header">
                <span class="level-name">Level ${levels} Approximation (cA${levels})</span>
                <span class="level-info">${finalApprox.length} coefficients</span>
            </div>
            <div class="coeff-display approx">
    `;

    finalApprox.forEach((a, k) => {
        const height = maxA > 0 ? (a / maxA * 45 + 50) : 50;
        html += `<div class="coeff-bar approx-bar" style="height: ${height}%" title="cA${levels}[${k}]=${a.toFixed(3)}"></div>`;
    });

    html += `</div></div></div>`;

    // Reconstructed signal
    html += `
        <h4>Reconstructed Signal</h4>
        <div class="signal-display">
    `;

    reconstructed.forEach((x, n) => {
        const height = maxVal > 0 ? (x / maxVal * 45 + 50) : 50;
        html += `<div class="signal-bar reconstructed" style="height: ${height}%" title="x'[${n}]=${x.toFixed(2)}"></div>`;
    });

    html += `</div>`;

    // Energy distribution
    html += `
        <h4>Energy Distribution</h4>
        <div class="energy-distribution">
            <table>
                <tr>
                    <th>Component</th>
                    <th>Energy</th>
                    <th>Percentage</th>
                </tr>
    `;

    const totalEnergy = stats.totalEnergy;
    stats.levelEnergies.forEach((energy, level) => {
        const percent = (energy / totalEnergy * 100).toFixed(1);
        html += `
            <tr>
                <td>Detail Level ${level + 1}</td>
                <td>${energy.toFixed(4)}</td>
                <td>
                    <div class="energy-bar-container">
                        <div class="energy-bar" style="width: ${percent}%"></div>
                        <span>${percent}%</span>
                    </div>
                </td>
            </tr>
        `;
    });

    const approxPercent = (stats.approxEnergy / totalEnergy * 100).toFixed(1);
    html += `
            <tr>
                <td>Approximation</td>
                <td>${stats.approxEnergy.toFixed(4)}</td>
                <td>
                    <div class="energy-bar-container">
                        <div class="energy-bar approx" style="width: ${approxPercent}%"></div>
                        <span>${approxPercent}%</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>
    `;

    // Significant features (edges)
    if (stats.significantDetails.length > 0) {
        html += `
            <h4>Significant Features Detected</h4>
            <div class="features-list">
                <table>
                    <tr>
                        <th>Level</th>
                        <th>Position</th>
                        <th>Value</th>
                        <th>Strength</th>
                    </tr>
        `;

        stats.significantDetails.forEach(feat => {
            const strengthBar = `<div class="strength-bar" style="width: ${feat.relativeStrength * 100}%"></div>`;
            html += `
                <tr>
                    <td>${feat.level}</td>
                    <td>${feat.position}</td>
                    <td>${feat.value.toFixed(4)}</td>
                    <td><div class="strength-container">${strengthBar}</div></td>
                </tr>
            `;
        });

        html += `</table></div>`;
    }

    // Comparison
    html += `
        <h4>Original vs Reconstructed (First 16 samples)</h4>
        <div class="comparison-table">
            <table>
                <tr>
                    <th>n</th>
                    <th>Original</th>
                    <th>Reconstructed</th>
                    <th>Error</th>
                </tr>
    `;

    const showCount = Math.min(16, N);
    for (let n = 0; n < showCount; n++) {
        const error = Math.abs(signal[n] - reconstructed[n]);
        html += `
            <tr>
                <td>${n}</td>
                <td>${signal[n].toFixed(4)}</td>
                <td>${reconstructed[n].toFixed(4)}</td>
                <td class="${error > 0.01 ? 'high-error' : ''}">${error.toFixed(6)}</td>
            </tr>
        `;
    }

    html += `</table></div></div>`;
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
