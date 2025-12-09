/**
 * Main script for QR Decomposition
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
            matrix = '1, 1, 0\n1, 0, 1\n0, 1, 1';
            break;
        case 'rectangular':
            matrix = '1, 2, 3\n4, 5, 6\n7, 8, 9\n10, 11, 12';
            break;
        case 'orthogonal':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'illConditioned':
            matrix = '1, 1, 1\n1, 1.0001, 1\n1, 1, 1.0001';
            break;
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
}

function parseMatrix(text) {
    const rows = text.trim().split('\n');
    const matrix = [];
    let cols = null;

    for (const row of rows) {
        const values = row.split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN)) {
            throw new Error('Invalid matrix values');
        }
        if (cols === null) {
            cols = values.length;
        } else if (values.length !== cols) {
            throw new Error('All rows must have the same number of columns');
        }
        matrix.push(values);
    }

    if (matrix.length < matrix[0].length) {
        throw new Error('Matrix must have at least as many rows as columns for QR decomposition');
    }

    return matrix;
}

function generateRandomMatrix(rows, cols, range) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
            matrix[i][j] = Math.floor(Math.random() * (2 * range + 1)) - range;
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
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const range = parseInt(document.getElementById('range').value);
            if (rows < cols) {
                throw new Error('Rows must be >= columns for QR decomposition');
            }
            matrix = generateRandomMatrix(rows, cols, range);
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
            <h3>QR Decomposition Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'A = QR factorization'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}</span>
                </div>
    `;

    if (result.verification) {
        html += `
                <div class="stat-item ${result.verification.isValid ? 'highlight' : 'warning'}">
                    <span class="stat-label">QR Error</span>
                    <span class="stat-value">${result.verification.maxError.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.orthogonalityError !== undefined) {
        html += `
                <div class="stat-item ${result.orthogonalityError < 1e-10 ? 'highlight' : ''}">
                    <span class="stat-label">Orthogonality</span>
                    <span class="stat-value">${result.orthogonalityError.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.numReflections !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Reflections</span>
                    <span class="stat-value">${result.numReflections}</span>
                </div>
        `;
    }

    if (result.rotationCount !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Rotations</span>
                    <span class="stat-value">${result.rotationCount}</span>
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
                        <th>QR Error</th>
                        <th>Orth. Error</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.success ? comp.time : '-'}</td>
                        <td>${comp.success ? comp.qrError : '-'}</td>
                        <td>${comp.success ? comp.orthError : '-'}</td>
                        <td class="${comp.success ? 'success' : 'failed'}">${comp.success ? 'OK' : 'Failed'}</td>
                    </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Display Q and R matrices
    if (result.Q && result.R) {
        html += `
            <div class="decomposition-display">
                <h4>Decomposition: A = QR</h4>
                <div class="matrices-row">
                    <div class="matrix-block">
                        <h5>Q (Orthogonal)</h5>
                        ${renderMatrix(result.Q, 8)}
                    </div>
                    <div class="matrix-block">
                        <h5>R (Upper Triangular)</h5>
                        ${renderMatrix(result.R, 8)}
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
