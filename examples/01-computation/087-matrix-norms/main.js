/**
 * Main script for Matrix Norms
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

// Toggle p-norm input visibility
document.getElementById('normType').addEventListener('change', function() {
    const pInput = document.getElementById('pNormInput');
    pInput.style.display = this.value === 'pNorm' ? 'block' : 'none';
});

function toggleInputMode() {
    const mode = document.getElementById('inputMode').value;
    document.getElementById('manualInput').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('randomInput').style.display = mode === 'random' ? 'block' : 'none';
}

function loadSample(type) {
    if (type === 'random') {
        document.getElementById('inputMode').value = 'random';
        toggleInputMode();
        return;
    }

    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let matrix;

    switch (type) {
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'ones':
            matrix = '1, 1, 1\n1, 1, 1\n1, 1, 1';
            break;
        case 'diagonal':
            matrix = '3, 0, 0\n0, 4, 0\n0, 0, 5';
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
    const normType = document.getElementById('normType').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const parsed = parseMatrix(document.getElementById('matrixInput').value);
            data = { A: parsed.data, m: parsed.m, n: parsed.n, generate: false };
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const matrixType = document.getElementById('matrixType').value;

            if (rows < 2 || rows > 1000 || cols < 2 || cols > 1000) {
                throw new Error('Matrix dimensions must be between 2 and 1000');
            }

            data = { rows, cols, matrixType, generate: true };
        }

        if (normType === 'pNorm') {
            data.p = parseFloat(document.getElementById('pValue').value);
            if (data.p < 1) {
                throw new Error('p must be at least 1');
            }
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
            <h3>Matrix Norms</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}</span>
                </div>
    `;

    if (result.norm !== undefined) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Norm Value</span>
                    <span class="stat-value">${formatNumber(result.norm)}</span>
                </div>
        `;
    }

    if (result.pValue !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">p Value</span>
                    <span class="stat-value">${result.pValue}</span>
                </div>
        `;
    }

    html += `</div>`;

    // All norms comparison table
    if (result.norms) {
        html += `
            <h4>Norm Values</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Norm Type</th>
                        <th>Value</th>
                    </tr>
        `;
        for (const norm of result.norms) {
            const value = typeof norm.value === 'number' ? formatNumber(norm.value) : norm.value;
            html += `
                <tr>
                    <td>${norm.name}</td>
                    <td>${value}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Norm relationships
    if (result.relationships && result.relationships.length > 0) {
        html += `
            <h4>Norm Inequalities</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Relationship</th>
                        <th>Values</th>
                        <th>Verified</th>
                    </tr>
        `;
        for (const rel of result.relationships) {
            const verified = rel.holds ? '✓' : '✗';
            const verifiedClass = rel.holds ? 'verified' : 'not-verified';
            html += `
                <tr>
                    <td>${rel.relation}</td>
                    <td>${rel.values}</td>
                    <td class="${verifiedClass}">${verified}</td>
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

function formatNumber(val) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-10) return '0';
    if (Math.abs(val) < 0.001 || Math.abs(val) > 10000) {
        return val.toExponential(4);
    }
    return val.toFixed(6);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('diagonal');
});
