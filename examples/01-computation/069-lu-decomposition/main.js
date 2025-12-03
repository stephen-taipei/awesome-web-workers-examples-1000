/**
 * Main script for LU Decomposition
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
        case 'simple':
            matrix = '2, 1, 1\n4, 3, 3\n8, 7, 9';
            break;
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'diagonal':
            matrix = '2, 0, 0\n0, 3, 0\n0, 0, 5';
            break;
        case 'tridiagonal':
            matrix = '4, 1, 0, 0\n1, 4, 1, 0\n0, 1, 4, 1\n0, 0, 1, 4';
            break;
        case 'hilbert':
            matrix = '1, 0.5, 0.333\n0.5, 0.333, 0.25\n0.333, 0.25, 0.2';
            break;
        case 'needsPivot':
            matrix = '0, 1, 2\n1, 2, 1\n2, 1, 0';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
}

function parseMatrix(text) {
    const rows = text.trim().split('\n');
    const matrix = [];
    for (const row of rows) {
        const values = row.split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN)) {
            throw new Error('Invalid matrix values');
        }
        matrix.push(values);
    }

    const n = matrix.length;
    for (let i = 0; i < n; i++) {
        if (matrix[i].length !== n) {
            throw new Error('Matrix must be square');
        }
    }

    return matrix;
}

function generateRandomMatrix(size, min, max) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            matrix[i][j] = Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    return matrix;
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;

    let matrix;

    try {
        if (inputMode === 'manual') {
            matrix = parseMatrix(document.getElementById('matrixInput').value);
        } else {
            const size = parseInt(document.getElementById('size').value);
            const minVal = parseInt(document.getElementById('minVal').value);
            const maxVal = parseInt(document.getElementById('maxVal').value);
            matrix = generateRandomMatrix(size, minVal, maxVal);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data: { matrix } });
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
            <h3>LU Decomposition Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'A = LU factorization'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
    `;

    if (result.determinant !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Determinant</span>
                    <span class="stat-value">${formatNumber(result.determinant)}</span>
                </div>
        `;
    }

    if (result.swaps !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Row Swaps</span>
                    <span class="stat-value">${result.swaps}</span>
                </div>
        `;
    }

    if (result.verification) {
        html += `
                <div class="stat-item ${result.verification.isValid ? 'highlight' : 'warning'}">
                    <span class="stat-label">Max Error</span>
                    <span class="stat-value">${result.verification.maxError.toExponential(2)}</span>
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
                        <th>Error</th>
                        <th>Determinant</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.success ? comp.time : '-'}</td>
                        <td>${comp.success ? comp.error : '-'}</td>
                        <td>${comp.success ? formatNumber(comp.det) : '-'}</td>
                        <td class="${comp.success ? 'success' : 'failed'}">${comp.success ? 'OK' : 'Failed'}</td>
                    </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Display L and U matrices
    if (result.L && result.U) {
        const showFull = result.matrixSize <= 8;

        html += `
            <div class="decomposition-display">
                <h4>Decomposition: ${result.P ? 'PA = LU' : 'A = LU'}</h4>
        `;

        if (result.P) {
            html += `
                <div class="matrix-block">
                    <h5>P (Permutation: [${result.P.join(', ')}])</h5>
                    ${renderMatrix(result.Pmatrix, 8)}
                </div>
            `;
        }

        html += `
                <div class="matrices-row">
                    <div class="matrix-block">
                        <h5>L (Lower Triangular)</h5>
                        ${renderMatrix(result.L, 8)}
                    </div>
                    <div class="matrix-block">
                        <h5>U (Upper Triangular)</h5>
                        ${renderMatrix(result.U, 8)}
                    </div>
                </div>
            </div>
        `;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function renderMatrix(M, maxSize) {
    const displayRows = Math.min(M.length, maxSize);
    const displayCols = Math.min(M[0].length, maxSize);

    let html = '<div class="matrix-display"><table class="matrix-table">';

    for (let i = 0; i < displayRows; i++) {
        html += '<tr>';
        for (let j = 0; j < displayCols; j++) {
            html += `<td>${formatNumber(M[i][j])}</td>`;
        }
        if (M[0].length > maxSize) html += '<td>...</td>';
        html += '</tr>';
    }
    if (M.length > maxSize) {
        html += '<tr>';
        for (let j = 0; j <= displayCols; j++) {
            html += '<td>...</td>';
        }
        html += '</tr>';
    }

    html += '</table></div>';
    return html;
}

function formatNumber(val) {
    if (Math.abs(val) < 1e-10) return '0';
    if (Number.isInteger(val)) return val.toString();
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
    loadSample('simple');
});
