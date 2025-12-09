/**
 * Main script for Matrix Transpose
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
            matrix = '1, 2, 3, 4\n5, 6, 7, 8\n9, 10, 11, 12\n13, 14, 15, 16';
            break;
        case 'rectangular':
            matrix = '1, 2, 3, 4, 5\n6, 7, 8, 9, 10\n11, 12, 13, 14, 15';
            break;
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'symmetric':
            matrix = '1, 2, 3\n2, 4, 5\n3, 5, 6';
            break;
        case 'skewSymmetric':
            matrix = '0, 2, -3\n-2, 0, 4\n3, -4, 0';
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

    let matrix;

    try {
        if (inputMode === 'manual') {
            matrix = parseMatrix(document.getElementById('matrixInput').value);
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const minVal = parseInt(document.getElementById('minVal').value);
            const maxVal = parseInt(document.getElementById('maxVal').value);

            matrix = generateRandomMatrix(rows, cols, minVal, maxVal);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    const data = { matrix };

    if (algorithm === 'block') {
        data.blockSize = parseInt(document.getElementById('blockSize').value) || 64;
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
            <h3>Matrix Transpose Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.complexity}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Size</span>
                    <span class="stat-value">${result.dimensions.original}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Transposed Size</span>
                    <span class="stat-value">${result.dimensions.transposed}</span>
                </div>
    `;

    if (result.swaps !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Swaps</span>
                    <span class="stat-value">${result.swaps.toLocaleString()}</span>
                </div>
        `;
    }

    if (result.blockSize !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Block Size</span>
                    <span class="stat-value">${result.blockSize}</span>
                </div>
        `;
    }

    if (result.blocks !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Blocks</span>
                    <span class="stat-value">${result.blocks}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Display properties
    if (result.properties && result.properties.length > 0) {
        html += `<h4>Matrix Properties</h4><div class="properties-grid">`;
        for (const prop of result.properties) {
            html += `
                <div class="property-item">
                    <span class="property-icon">${prop.icon}</span>
                    <span class="property-name">${prop.name}</span>
                    <span class="property-value">${prop.value}</span>
                </div>
            `;
        }
        html += `</div>`;
    }

    // Display comparison table if available
    if (result.comparison) {
        html += `
            <h4>Performance Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Algorithm</th>
                        <th>Time (ms)</th>
                        <th>Space</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.time}</td>
                        <td>${comp.space}</td>
                    </tr>
            `;
        }
        html += `
                </table>
            </div>
            <p class="verification">${result.verified ? '✓ All results verified identical' : '⚠ Results may differ'}</p>
        `;
    }

    // Display matrices
    const original = result.original;
    const transposed = result.transposed;
    const showFull = original.length <= 8 && original[0].length <= 8;

    html += `
        <div class="matrices-container">
            <div class="matrix-section">
                <h4>Original Matrix A ${showFull ? '' : '(first 8×8)'}</h4>
                ${renderMatrix(original, 8)}
            </div>
            <div class="transpose-arrow">→<br>T</div>
            <div class="matrix-section">
                <h4>Transposed A<sup>T</sup> ${showFull ? '' : '(first 8×8)'}</h4>
                ${renderMatrix(transposed, 8)}
            </div>
        </div>
    `;

    html += `
            <p class="description-text">${result.description}</p>
        </div>
    `;

    resultsDiv.innerHTML = html;
}

function renderMatrix(M, maxSize) {
    const displayRows = Math.min(M.length, maxSize);
    const displayCols = Math.min(M[0].length, maxSize);

    let html = '<div class="matrix-display"><table class="matrix-table">';

    for (let i = 0; i < displayRows; i++) {
        html += '<tr>';
        for (let j = 0; j < displayCols; j++) {
            const val = M[i][j];
            const display = Number.isInteger(val) ? val : val.toFixed(2);
            html += `<td>${display}</td>`;
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

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('algorithm').addEventListener('change', function() {
        document.getElementById('blockSizeGroup').style.display =
            this.value === 'block' ? 'block' : 'none';
    });

    loadSample('square');
});
