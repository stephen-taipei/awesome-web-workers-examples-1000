/**
 * Main script for Pseudoinverse
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
        case 'square':
            matrix = '1, 2, 3\n4, 5, 6\n7, 8, 10';
            break;
        case 'tall':
            matrix = '1, 2\n3, 4\n5, 6\n7, 8';
            break;
        case 'wide':
            matrix = '1, 2, 3, 4\n5, 6, 7, 8';
            break;
        case 'rankDef':
            // Rank deficient: row 2 = 2 * row 1
            matrix = '1, 2, 3\n2, 4, 6\n4, 5, 6';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
}

function parseMatrix(text) {
    const lines = text.trim().split('\n');
    const m = lines.length;
    let n = 0;
    const rows = [];

    for (let i = 0; i < m; i++) {
        const values = lines[i].split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN)) {
            throw new Error('Invalid number in matrix');
        }
        if (i === 0) {
            n = values.length;
        } else if (values.length !== n) {
            throw new Error('All rows must have the same number of columns');
        }
        rows.push(values);
    }

    const matrix = new Float64Array(m * n);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            matrix[i * n + j] = rows[i][j];
        }
    }

    return { data: matrix, m, n };
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;
    const tolerance = parseFloat(document.getElementById('tolerance').value) || 1e-10;

    let data;

    try {
        if (inputMode === 'manual') {
            const parsed = parseMatrix(document.getElementById('matrixInput').value);
            data = { A: parsed.data, m: parsed.m, n: parsed.n, generate: false, tolerance };
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const matrixType = document.getElementById('matrixType').value;

            if (rows < 2 || rows > 200 || cols < 2 || cols > 200) {
                throw new Error('Matrix dimensions must be between 2 and 200');
            }

            data = { rows, cols, matrixType, generate: true, tolerance };
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
            <h3>Moore-Penrose Pseudoinverse A⁺</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Input Size</span>
                    <span class="stat-value">${result.inputSize}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Size</span>
                    <span class="stat-value">${result.outputSize}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rank</span>
                    <span class="stat-value">${result.rank}</span>
                </div>
    `;

    if (result.verificationError !== undefined) {
        const errorClass = result.verificationError < 1e-6 ? 'highlight' : '';
        html += `
                <div class="stat-item ${errorClass}">
                    <span class="stat-label">||AA⁺A - A|| / ||A||</span>
                    <span class="stat-value">${formatNumber(result.verificationError)}</span>
                </div>
        `;
    }

    if (result.executionTime !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Compute Time</span>
                    <span class="stat-value">${result.executionTime.toFixed(1)}ms</span>
                </div>
        `;
    }

    html += `</div>`;

    // Warning message
    if (result.warning) {
        html += `<div class="warning">Warning: ${result.warning}</div>`;
    }

    // Singular values
    if (result.singularValues && result.singularValues.length > 0) {
        html += `<h4>Singular Values (top 5)</h4>`;
        html += `<div class="singular-values">`;
        for (let i = 0; i < result.singularValues.length; i++) {
            html += `<span class="sv-item">σ${i+1} = ${formatNumber(result.singularValues[i])}</span>`;
        }
        html += `</div>`;
    }

    // Comparison table
    if (result.comparison) {
        html += `
            <h4>Method Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Method</th>
                        <th>Time (ms)</th>
                        <th>Rank</th>
                        <th>Error</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                <tr>
                    <td>${comp.method}</td>
                    <td>${comp.time}</td>
                    <td>${comp.rank}</td>
                    <td>${comp.error}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Input matrix preview
    if (result.inputSubmatrix) {
        html += `<h4>Input Matrix A (preview)</h4>`;
        html += `<div class="matrix-display">`;
        html += `<table class="matrix-table">`;
        for (const row of result.inputSubmatrix) {
            html += `<tr>`;
            for (const val of row) {
                html += `<td>${formatNumber(val)}</td>`;
            }
            html += `</tr>`;
        }
        html += `</table>`;
        html += `</div>`;
    }

    // Result matrix preview
    if (result.submatrix) {
        html += `<h4>Pseudoinverse A⁺ (preview)</h4>`;
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
    loadSample('tall');
});
