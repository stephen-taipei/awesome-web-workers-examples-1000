/**
 * Main script for Condition Number
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

    let matrix;

    switch (type) {
        case 'identity':
            // κ(I) = 1
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'orthogonal':
            // Rotation matrix: κ = 1
            const angle = Math.PI / 4;
            const c = Math.cos(angle).toFixed(6);
            const s = Math.sin(angle).toFixed(6);
            matrix = `${c}, ${-s}, 0\n${s}, ${c}, 0\n0, 0, 1`;
            break;
        case 'singular':
            // Nearly singular
            matrix = '1, 2\n1, 2.0001';
            break;
        case 'hilbert':
            // Hilbert matrix 4x4 (very ill-conditioned)
            matrix = '1, 0.5, 0.333333, 0.25\n0.5, 0.333333, 0.25, 0.2\n0.333333, 0.25, 0.2, 0.166667\n0.25, 0.2, 0.166667, 0.142857';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
}

function parseMatrix(text) {
    const lines = text.trim().split('\n');
    const n = lines.length;
    const matrix = new Float64Array(n * n);

    for (let i = 0; i < n; i++) {
        const values = lines[i].split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN) || values.length !== n) {
            throw new Error('Matrix must be square with valid numbers');
        }
        for (let j = 0; j < n; j++) {
            matrix[i * n + j] = values[j];
        }
    }

    return { data: matrix, n };
}

function calculate() {
    const normType = document.getElementById('normType').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const parsed = parseMatrix(document.getElementById('matrixInput').value);
            data = { A: parsed.data, n: parsed.n, generate: false };
        } else {
            const n = parseInt(document.getElementById('size').value);
            const matrixType = document.getElementById('matrixType').value;

            if (n < 2 || n > 200) {
                throw new Error('Matrix size must be between 2 and 200');
            }

            data = { n, matrixType, generate: true };
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: normType, data });
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
            <h3>Condition Number κ(A)</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description}</div>
            </div>
    `;

    // Condition category indicator
    if (result.category) {
        html += `
            <div class="condition-indicator ${result.categoryClass}">
                <span class="indicator-label">Matrix Conditioning:</span>
                <span class="indicator-value">${result.category}</span>
            </div>
        `;
    }

    html += `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
    `;

    if (result.norm !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">||A||</span>
                    <span class="stat-value">${formatNumber(result.norm)}</span>
                </div>
        `;
    }

    if (result.normInverse !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">||A⁻¹||</span>
                    <span class="stat-value">${formatNumber(result.normInverse)}</span>
                </div>
        `;
    }

    if (result.sigmaMax !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">σ_max</span>
                    <span class="stat-value">${formatNumber(result.sigmaMax)}</span>
                </div>
        `;
    }

    if (result.sigmaMin !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">σ_min</span>
                    <span class="stat-value">${formatNumber(result.sigmaMin)}</span>
                </div>
        `;
    }

    const condClass = getConditionClass(result.conditionNumber);
    html += `
                <div class="stat-item ${condClass}">
                    <span class="stat-label">κ(A)</span>
                    <span class="stat-value">${formatNumber(result.conditionNumber)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">log₁₀(κ)</span>
                    <span class="stat-value">${result.log10Cond !== undefined ? result.log10Cond.toFixed(2) : '-'}</span>
                </div>
    `;

    if (result.executionTime !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Compute Time</span>
                    <span class="stat-value">${result.executionTime.toFixed(1)}ms</span>
                </div>
        `;
    }

    html += `</div>`;

    // Comparison table
    if (result.comparison) {
        html += `
            <h4>Norm Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Norm</th>
                        <th>||A||</th>
                        <th>||A⁻¹||</th>
                        <th>κ(A)</th>
                        <th>log₁₀(κ)</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                <tr>
                    <td>${comp.norm}</td>
                    <td>${comp.normA}</td>
                    <td>${comp.normAinv}</td>
                    <td>${comp.condition}</td>
                    <td>${comp.log10}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Submatrix display
    if (result.submatrix) {
        html += `<h4>Matrix Preview (top-left corner)</h4>`;
        html += `<div class="matrix-display">`;
        html += `<table class="matrix-table">`;
        for (const row of result.submatrix) {
            html += `<tr>`;
            for (const val of row) {
                html += `<td>${formatNumber(val)}</td>`;
            }
            html += `</tr>`;
        }
        html += `</table>`;
        html += `</div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function getConditionClass(cond) {
    if (!isFinite(cond)) return 'severe';
    if (cond < 10) return 'good';
    if (cond < 1e6) return 'moderate';
    if (cond < 1e12) return 'poor';
    return 'severe';
}

function formatNumber(val) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-10) return '0';
    if (Math.abs(val) < 0.001 || Math.abs(val) > 10000) {
        return val.toExponential(3);
    }
    return val.toFixed(4);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('identity');
});
