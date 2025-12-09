/**
 * Main script for SVD Decomposition
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
            matrix = '1, 2\n3, 4\n5, 6';
            break;
        case 'square':
            matrix = '4, 0, 0\n0, 3, 0\n0, 0, 2';
            break;
        case 'tall':
            matrix = '1, 2\n3, 4\n5, 6\n7, 8';
            break;
        case 'wide':
            matrix = '1, 2, 3, 4\n5, 6, 7, 8';
            break;
        case 'rankDeficient':
            matrix = '1, 2, 3\n2, 4, 6\n1, 1, 1';
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
    const numSingular = parseInt(document.getElementById('numSingular').value) || 0;

    let matrix;

    try {
        if (inputMode === 'manual') {
            matrix = parseMatrix(document.getElementById('matrixInput').value);
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const range = parseInt(document.getElementById('range').value);
            matrix = generateRandomMatrix(rows, cols, range);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data: { matrix, numSingular } });
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
            <h3>SVD Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'A = UΣV^T'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rank</span>
                    <span class="stat-value">${result.rank || '-'}</span>
                </div>
    `;

    if (result.verification) {
        html += `
                <div class="stat-item ${result.verification.isValid ? 'highlight' : 'warning'}">
                    <span class="stat-label">Max Error</span>
                    <span class="stat-value">${result.verification.maxError.toExponential(2)}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Singular values display
    if (result.singularValues && result.singularValues.length > 0) {
        html += `
            <h4>Singular Values (σ)</h4>
            <div class="singular-values">
        `;
        const displayCount = Math.min(result.singularValues.length, 10);
        for (let i = 0; i < displayCount; i++) {
            html += `<span class="sv-item">σ<sub>${i + 1}</sub> = ${formatNumber(result.singularValues[i])}</span>`;
        }
        if (result.singularValues.length > 10) {
            html += `<span class="sv-item">... (${result.singularValues.length - 10} more)</span>`;
        }
        html += `</div>`;
    }

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
                        <th>Rank</th>
                        <th>Top σ</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.success ? comp.time : '-'}</td>
                        <td>${comp.success ? comp.error : '-'}</td>
                        <td>${comp.success ? comp.rank : '-'}</td>
                        <td>${comp.success ? comp.topSV : '-'}</td>
                        <td class="${comp.success ? 'success' : 'failed'}">${comp.success ? 'OK' : 'Failed'}</td>
                    </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Display U, Sigma, V matrices
    if (result.U && result.Sigma && result.V) {
        html += `
            <div class="decomposition-display">
                <h4>Decomposition: A = UΣV<sup>T</sup></h4>
                <div class="matrices-row">
                    <div class="matrix-block">
                        <h5>U (${result.rows}×${Math.min(result.rows, result.cols)})</h5>
                        ${renderMatrix(result.U, 6)}
                    </div>
                    <div class="matrix-block">
                        <h5>Σ (${result.rows}×${result.cols})</h5>
                        ${renderMatrix(result.Sigma, 6)}
                    </div>
                    <div class="matrix-block">
                        <h5>V (${result.cols}×${Math.min(result.rows, result.cols)})</h5>
                        ${renderMatrix(result.V, 6)}
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
        return val.toExponential(2);
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
