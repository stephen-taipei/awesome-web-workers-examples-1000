/**
 * Main script for Polynomial Root Finding
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

const polynomialStrings = {
    'cubic': 'x³ - 6x² + 11x - 6',
    'quartic': 'x⁴ - 10x³ + 35x² - 50x + 24',
    'complex': 'x² + 1',
    'mixed': 'x³ - 1',
    'double': 'x³ - 3x + 2',
    'quintic': 'x⁵ - 1'
};

function updatePolynomial() {
    const select = document.getElementById('polynomialSelect');
    const customInput = document.getElementById('customInput');
    const polyDisplay = document.getElementById('polynomialText');

    customInput.style.display = select.value === 'custom' ? 'block' : 'none';

    if (polynomialStrings[select.value]) {
        polyDisplay.textContent = 'P(x) = ' + polynomialStrings[select.value];
    } else {
        polyDisplay.textContent = 'P(x) = Custom polynomial';
    }
}

function loadSample(type) {
    document.getElementById('polynomialSelect').value = type;
    updatePolynomial();
}

function coeffsToString(coeffs) {
    const n = coeffs.length - 1;
    let terms = [];

    for (let i = 0; i <= n; i++) {
        const c = coeffs[i];
        const power = n - i;

        if (c === 0) continue;

        let term = '';
        if (i > 0 && c > 0) term += ' + ';
        if (i > 0 && c < 0) term += ' - ';
        if (i === 0 && c < 0) term += '-';

        const absC = Math.abs(c);
        if (power === 0) {
            term += absC;
        } else if (absC !== 1) {
            term += absC;
        }

        if (power > 0) {
            term += 'x';
            if (power > 1) {
                term += superscript(power);
            }
        }

        terms.push(term);
    }

    return terms.join('') || '0';
}

function superscript(n) {
    const supers = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return String(n).split('').map(d => supers[parseInt(d)]).join('');
}

function calculate() {
    const polynomialType = document.getElementById('polynomialSelect').value;
    const coefficients = document.getElementById('coefficients').value;
    const tolerance = parseFloat(document.getElementById('tolerance').value);
    const maxIterations = parseInt(document.getElementById('maxIterations').value);

    if (isNaN(tolerance) || isNaN(maxIterations)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (polynomialType === 'custom' && !coefficients.trim()) {
        displayError('Please enter polynomial coefficients');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { polynomialType, coefficients, tolerance, maxIterations }
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

    let statusClass = result.converged ? 'success' : 'warning';
    let statusText = result.converged ? 'Converged' : 'Max iterations';

    let html = `
        <div class="result-card">
            <h3>Polynomial Root Finding Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">P(x) = ${coeffsToString(result.coefficients)}</div>
                <div class="method-info">Degree ${result.degree} polynomial</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item ${statusClass}">
                    <span class="stat-label">Status</span>
                    <span class="stat-value">${statusText}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Iterations</span>
                    <span class="stat-value">${result.iterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Real Roots</span>
                    <span class="stat-value">${result.realCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Complex Roots</span>
                    <span class="stat-value">${result.complexCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tolerance</span>
                    <span class="stat-value">${result.tolerance.toExponential(0)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Final Error</span>
                    <span class="stat-value">${result.maxError.toExponential(2)}</span>
                </div>
            </div>

            <h4>Roots Found</h4>
            <div class="roots-grid">
    `;

    for (let i = 0; i < result.roots.length; i++) {
        const rootInfo = result.roots[i];
        const root = rootInfo.root;
        const rootClass = rootInfo.isReal ? 'real' : 'complex';
        const verifyClass = rootInfo.pMagnitude < 1e-8 ? 'verified' : 'approximate';

        html += `
            <div class="root-card ${rootClass}">
                <div class="root-index">Root ${i + 1}</div>
                <div class="root-value">${formatComplex(root)}</div>
                <div class="root-type">${rootInfo.isReal ? 'Real' : 'Complex'}</div>
                <div class="root-verify ${verifyClass}">
                    |P(z)| = ${rootInfo.pMagnitude.toExponential(2)}
                </div>
            </div>
        `;
    }

    html += `</div>`;

    // Convergence visualization
    if (result.history && result.history.length > 1) {
        html += `
            <h4>Convergence History</h4>
            <div class="table-container">
                <table class="iteration-table">
                    <tr>
                        <th>Iteration</th>
                        <th>Max Error</th>
                        <th>Status</th>
                    </tr>
        `;

        for (const hist of result.history) {
            const errorClass = hist.maxError < result.tolerance ? 'converged' :
                              (hist.maxError < 1e-6 ? 'close' : '');
            html += `
                <tr class="${errorClass}">
                    <td>${hist.iteration}</td>
                    <td>${hist.maxError.toExponential(4)}</td>
                    <td>${hist.maxError < result.tolerance ? '✓ Converged' : 'Iterating...'}</td>
                </tr>
            `;
        }

        html += `</table></div>`;
    }

    // Info about complex conjugate pairs
    if (result.complexCount > 0) {
        html += `
            <div class="info-box">
                <strong>Note:</strong> Complex roots of real-coefficient polynomials always come in conjugate pairs (a + bi and a - bi).
            </div>
        `;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatComplex(c, precision = 8) {
    const re = c.re;
    const im = c.im;

    if (Math.abs(im) < 1e-10) {
        return formatNumber(re, precision);
    }

    const reStr = formatNumber(re, precision);
    const imAbs = formatNumber(Math.abs(im), precision);

    if (Math.abs(re) < 1e-10) {
        return im >= 0 ? `${imAbs}i` : `-${imAbs}i`;
    }

    return im >= 0 ? `${reStr} + ${imAbs}i` : `${reStr} - ${imAbs}i`;
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-14) return '0';
    if (Math.abs(val) < 0.0001 || Math.abs(val) > 100000) {
        return val.toExponential(4);
    }
    // Remove trailing zeros
    return parseFloat(val.toFixed(decimals)).toString();
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('cubic');
});
