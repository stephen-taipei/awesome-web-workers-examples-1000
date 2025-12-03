/**
 * Main script for Tridiagonal Matrix Solver
 */

let worker = null;

function initWorker() {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, algorithm, result, executionTime, percentage, message } = e.data;

        if (type === 'progress') {
            updateProgress(percentage);
        } else if (type === 'result') {
            hideProgress();
            displayResults(algorithm, result, executionTime);
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

function toggleInputMode() {
    const mode = document.getElementById('inputMode').value;
    document.getElementById('manualInput').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('randomInput').style.display = mode === 'random' ? 'block' : 'none';
}

function loadSample(type) {
    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let subDiag, mainDiag, superDiag, vectorB;

    switch (type) {
        case 'simple':
            // Simple 5×5 tridiagonal
            subDiag = '1, 1, 1, 1';
            mainDiag = '4, 4, 4, 4, 4';
            superDiag = '1, 1, 1, 1';
            vectorB = '6, 7, 7, 7, 6';
            break;
        case 'heatEq':
            // 1D Heat equation: -u[i-1] + 2u[i] - u[i+1] = f[i]
            subDiag = '-1, -1, -1, -1';
            mainDiag = '2, 2, 2, 2, 2';
            superDiag = '-1, -1, -1, -1';
            vectorB = '0, 0, 0, 0, 1';
            break;
        case 'waveEq':
            // 1D Wave equation discretization
            subDiag = '-1, -1, -1, -1';
            mainDiag = '2.5, 2.5, 2.5, 2.5, 2.5';
            superDiag = '-1, -1, -1, -1';
            vectorB = '1, 0, 0, 0, 1';
            break;
        case 'spline':
            // Cubic spline system
            subDiag = '1, 1, 1, 1';
            mainDiag = '4, 4, 4, 4, 4';
            superDiag = '1, 1, 1, 1';
            vectorB = '3, 6, 6, 6, 3';
            break;
    }

    document.getElementById('subDiag').value = subDiag;
    document.getElementById('mainDiag').value = mainDiag;
    document.getElementById('superDiag').value = superDiag;
    document.getElementById('vectorB').value = vectorB;
}

function parseVector(text) {
    const values = text.split(',').map(v => parseFloat(v.trim()));
    if (values.some(isNaN)) {
        throw new Error('Invalid vector values');
    }
    return new Float64Array(values);
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const a = parseVector(document.getElementById('subDiag').value);
            const d = parseVector(document.getElementById('mainDiag').value);
            const c = parseVector(document.getElementById('superDiag').value);
            const b = parseVector(document.getElementById('vectorB').value);

            const n = d.length;
            if (a.length !== n - 1) {
                throw new Error(`Sub-diagonal should have ${n - 1} elements`);
            }
            if (c.length !== n - 1) {
                throw new Error(`Super-diagonal should have ${n - 1} elements`);
            }
            if (b.length !== n) {
                throw new Error(`Vector b should have ${n} elements`);
            }

            data = { a, d, c, b, generate: false };
        } else {
            const n = parseInt(document.getElementById('size').value);
            const systemType = document.getElementById('systemType').value;

            if (n < 3) throw new Error('System size must be at least 3');
            if (n > 10000000) throw new Error('System size too large (max 10,000,000)');

            data = { n, systemType, generate: true };
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data });
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

function displayResults(algorithm, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card">
            <h3>Tridiagonal System Solution</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">System Size</span>
                    <span class="stat-value">${result.systemSize.toLocaleString()}</span>
                </div>
    `;

    if (result.residualNorm !== undefined) {
        html += `
                <div class="stat-item ${result.residualNorm < 1e-8 ? 'highlight' : ''}">
                    <span class="stat-label">||Ax - b||</span>
                    <span class="stat-value">${result.residualNorm.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.executionTime !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Solve Time</span>
                    <span class="stat-value">${result.executionTime.toFixed(2)}ms</span>
                </div>
        `;
    }

    // Calculate operations per second
    if (result.systemSize && result.executionTime) {
        const opsPerSec = (result.systemSize / (result.executionTime / 1000));
        html += `
                <div class="stat-item">
                    <span class="stat-label">Equations/sec</span>
                    <span class="stat-value">${formatOps(opsPerSec)}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Comparison table
    if (result.comparison) {
        html += `
            <h4>Algorithm Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Algorithm</th>
                        <th>Time (ms)</th>
                        <th>||Residual||</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                <tr>
                    <td>${comp.algorithm}</td>
                    <td>${comp.time}</td>
                    <td>${comp.residual}</td>
                    <td class="${comp.success ? 'success' : 'failed'}">${comp.success ? 'OK' : (comp.note || 'Failed')}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Solution sample
    if (result.solutionSample && result.solutionSample.length > 0) {
        html += `<h4>Solution Sample (first ${result.solutionSample.length} elements)</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.solutionSample.length; i++) {
            html += `<span class="sol-item">x[${i}] = ${formatNumber(result.solutionSample[i])}</span>`;
        }
        html += `</div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatNumber(val) {
    if (Math.abs(val) < 1e-10) return '0';
    if (Math.abs(val) < 0.001 || Math.abs(val) > 10000) {
        return val.toExponential(4);
    }
    return val.toFixed(6);
}

function formatOps(ops) {
    if (ops >= 1e9) return (ops / 1e9).toFixed(2) + 'G';
    if (ops >= 1e6) return (ops / 1e6).toFixed(2) + 'M';
    if (ops >= 1e3) return (ops / 1e3).toFixed(2) + 'K';
    return ops.toFixed(0);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('simple');
});
