/**
 * Main script for Matrix Multiplication
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

    let matrixA, matrixB;

    switch (type) {
        case 'small':
            matrixA = '1, 2, 3\n4, 5, 6\n7, 8, 9';
            matrixB = '9, 8, 7\n6, 5, 4\n3, 2, 1';
            break;
        case 'identity':
            matrixA = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            matrixB = '5, 6, 7\n8, 9, 10\n11, 12, 13';
            break;
        case 'rectangular':
            matrixA = '1, 2, 3\n4, 5, 6';
            matrixB = '7, 8\n9, 10\n11, 12';
            break;
        case 'sparse':
            matrixA = '1, 0, 0, 2\n0, 3, 0, 0\n0, 0, 4, 0\n5, 0, 0, 6';
            matrixB = '1, 0, 2, 0\n0, 1, 0, 3\n2, 0, 1, 0\n0, 3, 0, 1';
            break;
    }

    document.getElementById('matrixA').value = matrixA;
    document.getElementById('matrixB').value = matrixB;
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

    // Validate all rows have same length
    const cols = matrix[0].length;
    for (let i = 1; i < matrix.length; i++) {
        if (matrix[i].length !== cols) {
            throw new Error('All rows must have the same number of columns');
        }
    }

    return matrix;
}

function generateRandomMatrix(rows, cols, min, max) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
            matrix[i][j] = Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    return matrix;
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;

    let matrixA, matrixB;

    try {
        if (inputMode === 'manual') {
            matrixA = parseMatrix(document.getElementById('matrixA').value);
            matrixB = parseMatrix(document.getElementById('matrixB').value);
        } else {
            const rowsA = parseInt(document.getElementById('rowsA').value);
            const colsA = parseInt(document.getElementById('colsA').value);
            const colsB = parseInt(document.getElementById('colsB').value);
            const minVal = parseInt(document.getElementById('minVal').value);
            const maxVal = parseInt(document.getElementById('maxVal').value);

            matrixA = generateRandomMatrix(rowsA, colsA, minVal, maxVal);
            matrixB = generateRandomMatrix(colsA, colsB, minVal, maxVal);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    const data = { matrixA, matrixB };

    if (algorithm === 'block') {
        data.blockSize = parseInt(document.getElementById('blockSize').value) || 32;
    }

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
            <h3>Matrix Multiplication Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.complexity}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Result Dimensions</span>
                    <span class="stat-value">${result.dimensions.rows} × ${result.dimensions.cols}</span>
                </div>
    `;

    if (result.operations) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Operations</span>
                    <span class="stat-value">${result.operations.toLocaleString()}</span>
                </div>
        `;
    }

    if (result.blockSize) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Block Size</span>
                    <span class="stat-value">${result.blockSize}</span>
                </div>
        `;
    }

    if (result.paddedSize) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Padded Size</span>
                    <span class="stat-value">${result.paddedSize}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Display comparison table if available
    if (result.comparison) {
        html += `
            <h4>Performance Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Algorithm</th>
                        <th>Time (ms)</th>
                        <th>Complexity</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.time}</td>
                        <td>${comp.complexity}</td>
                    </tr>
            `;
        }
        html += `
                </table>
            </div>
            <p class="verification">${result.verified ? '✓ All results verified identical' : '⚠ Results may differ due to numerical precision'}</p>
        `;
    }

    // Display result matrix (limited for large matrices)
    const C = result.result;
    const showFull = C.length <= 10 && C[0].length <= 10;

    html += `<h4>Result Matrix C ${showFull ? '' : '(showing first 10×10)'}</h4>`;
    html += `<div class="matrix-display"><table class="matrix-table">`;

    const displayRows = Math.min(C.length, 10);
    const displayCols = Math.min(C[0].length, 10);

    for (let i = 0; i < displayRows; i++) {
        html += '<tr>';
        for (let j = 0; j < displayCols; j++) {
            const val = C[i][j];
            const display = Number.isInteger(val) ? val : val.toFixed(4);
            html += `<td>${display}</td>`;
        }
        if (C[0].length > 10) html += '<td>...</td>';
        html += '</tr>';
    }
    if (C.length > 10) {
        html += '<tr>';
        for (let j = 0; j <= displayCols; j++) {
            html += '<td>...</td>';
        }
        html += '</tr>';
    }

    html += `</table></div>`;

    html += `
            <p class="description-text">${result.description}</p>
        </div>
    `;

    resultsDiv.innerHTML = html;
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Show block size option when block algorithm selected
    document.getElementById('algorithm').addEventListener('change', function() {
        document.getElementById('blockSizeGroup').style.display =
            this.value === 'block' ? 'block' : 'none';
    });

    loadSample('small');
});
