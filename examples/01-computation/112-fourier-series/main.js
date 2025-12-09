/**
 * Main script for Fourier Series
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

function updateFunction() {
    const type = document.getElementById('functionType').value;
    document.getElementById('customFunction').style.display = type === 'custom' ? 'block' : 'none';
}

function loadPreset(type) {
    document.getElementById('functionType').value = type;
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionType').value;
    const customExpr = document.getElementById('customExpr').value;
    const numTerms = parseInt(document.getElementById('numTerms').value);
    const evalPoint = parseFloat(document.getElementById('evalPoint').value);
    const integrationPoints = parseInt(document.getElementById('integrationPoints').value);

    if (functionType === 'custom' && !customExpr.trim()) {
        displayError('Please enter a custom function expression');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { functionType, customExpr, numTerms, evalPoint, integrationPoints }
    });
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
    const { functionType, numTerms, a0, coefficients, evalPoint, evalResult,
            exactValue, energy, convergenceAnalysis } = result;

    const functionNames = {
        'square': 'Square Wave',
        'sawtooth': 'Sawtooth Wave',
        'triangle': 'Triangle Wave',
        'rectified': 'Rectified Sine',
        'pulse': 'Pulse Train',
        'custom': 'Custom Function'
    };

    let html = `
        <div class="result-card">
            <h3>Fourier Series Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${functionNames[functionType]}</div>
                <div class="method-info">${numTerms} Fourier terms</div>
            </div>

            <div class="interpolation-result">
                <div class="ir-label">S${subscript(numTerms)}(${formatNumber(evalPoint, 2)}) =</div>
                <div class="ir-value">${formatNumber(evalResult.total, 8)}</div>
                <div class="ir-exact">Exact: ${formatNumber(exactValue, 8)}</div>
                <div class="ir-error">Error: ${Math.abs(evalResult.total - exactValue).toExponential(4)}</div>
            </div>

            <h4>DC Component (a₀)</h4>
            <div class="dc-component">
                <div class="dc-value">a₀ = ${formatNumber(a0, 8)}</div>
                <div class="dc-contrib">a₀/2 = ${formatNumber(a0 / 2, 8)} (contribution to series)</div>
            </div>

            <h4>Fourier Coefficients</h4>
            <div class="coefficients-table">
                <table>
                    <tr>
                        <th>n</th>
                        <th>aₙ (cosine)</th>
                        <th>bₙ (sine)</th>
                        <th>Amplitude</th>
                        <th>Phase (°)</th>
                    </tr>
    `;

    coefficients.slice(0, 15).forEach(c => {
        const isSignificant = c.amplitude > 0.01;
        html += `
            <tr class="${isSignificant ? 'significant' : ''}">
                <td>${c.n}</td>
                <td>${formatNumber(c.an, 6)}</td>
                <td>${formatNumber(c.bn, 6)}</td>
                <td>${formatNumber(c.amplitude, 6)}</td>
                <td>${formatNumber(c.phaseDegrees, 2)}</td>
            </tr>
        `;
    });

    if (coefficients.length > 15) {
        html += `<tr><td colspan="5" class="more-rows">... ${coefficients.length - 15} more terms</td></tr>`;
    }

    html += `</table></div>`;

    // Spectrum visualization
    html += `
        <h4>Amplitude Spectrum</h4>
        <div class="spectrum">
    `;

    const maxAmplitude = Math.max(...coefficients.map(c => c.amplitude));
    coefficients.slice(0, 20).forEach(c => {
        const height = maxAmplitude > 0 ? (c.amplitude / maxAmplitude * 100) : 0;
        html += `
            <div class="spectrum-bar">
                <div class="bar-fill" style="height: ${height}%"></div>
                <span class="bar-label">${c.n}</span>
            </div>
        `;
    });

    html += `</div>`;

    // Evaluation breakdown
    html += `
        <h4>Evaluation at x = ${formatNumber(evalPoint, 2)}</h4>
        <div class="eval-breakdown">
    `;

    let runningTotal = 0;
    evalResult.terms.slice(0, 11).forEach(t => {
        runningTotal += t.term;
        html += `
            <div class="eval-term">
                <span class="term-n">${t.n === 0 ? 'a₀/2' : 'n=' + t.n}</span>
                <span class="term-value">${t.n === 0 ? '' : formatNumber(t.cosContrib, 4) + ' + ' + formatNumber(t.sinContrib, 4) + ' ='} ${formatNumber(t.term, 6)}</span>
                <span class="term-running">Σ = ${formatNumber(runningTotal, 6)}</span>
            </div>
        `;
    });

    if (evalResult.terms.length > 11) {
        html += `<div class="eval-term more">... ${evalResult.terms.length - 11} more terms</div>`;
    }

    html += `
            <div class="eval-term total">
                <span class="term-n">Total</span>
                <span class="term-value"></span>
                <span class="term-running">${formatNumber(evalResult.total, 8)}</span>
            </div>
        </div>
    `;

    // Energy (Parseval)
    html += `
        <h4>Energy Analysis (Parseval's Theorem)</h4>
        <div class="energy-analysis">
            <div class="energy-item">
                <span class="energy-label">Total Energy:</span>
                <span class="energy-value">${formatNumber(energy, 6)}</span>
            </div>
            <div class="energy-formula">
                E = a₀²/2 + Σ(aₙ² + bₙ²)
            </div>
        </div>
    `;

    // Convergence analysis
    html += `
        <h4>Convergence Analysis</h4>
        <div class="convergence">
            <table>
                <tr>
                    <th>Terms</th>
                    <th>RMS Error</th>
                </tr>
    `;

    convergenceAnalysis.forEach(c => {
        html += `
            <tr>
                <td>${c.nTerms}</td>
                <td>${c.rmse.toExponential(4)}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    // Properties
    html += `
        <h4>Series Properties</h4>
        <div class="properties">
    `;

    const hasOnlyCosine = coefficients.every(c => Math.abs(c.bn) < 1e-10);
    const hasOnlySine = coefficients.every(c => Math.abs(c.an) < 1e-10);
    const hasOnlyOddHarmonics = coefficients.every((c, i) => (i % 2 === 1) || (c.amplitude < 1e-10));

    html += `
            <div class="prop-item">
                <span class="prop-label">Function Symmetry:</span>
                <span class="prop-value">${hasOnlyCosine ? 'Even (cosine only)' : hasOnlySine ? 'Odd (sine only)' : 'Neither'}</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">Harmonics:</span>
                <span class="prop-value">${hasOnlyOddHarmonics ? 'Odd harmonics only' : 'All harmonics'}</span>
            </div>
            <div class="prop-item">
                <span class="prop-label">DC Offset:</span>
                <span class="prop-value">${Math.abs(a0) < 1e-10 ? 'Zero' : formatNumber(a0 / 2, 4)}</span>
            </div>
        </div>
    `;

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function subscript(n) {
    const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(n).split('').map(d => subs[parseInt(d)] || d).join('');
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
    loadPreset('square');
});
