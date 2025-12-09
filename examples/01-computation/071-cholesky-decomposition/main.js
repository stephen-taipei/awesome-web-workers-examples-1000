/**
 * Main script for Cholesky Decomposition
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
            matrix = '4, 12, -16\n12, 37, -43\n-16, -43, 98';
            break;
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'diagonal':
            matrix = '4, 0, 0\n0, 9, 0\n0, 0, 16';
            break;
        case 'hilbert':
            // Modified Hilbert-like SPD matrix
            matrix = '2, 0.5, 0.333\n0.5, 2, 0.25\n0.333, 0.25, 2';
            break;
        case 'covariance':
            // Sample covariance matrix
            matrix = '1, 0.8, 0.3\n0.8, 1, 0.5\n0.3, 0.5, 1';
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

function generateRandomSPD(size, condType) {
    // Generate A = B * B^T where B is random
    // This guarantees SPD
    const B = [];
    let scale;

    switch (condType) {
        case 'low':
            scale = 1;
            break;
        case 'medium':
            scale = 10;
            break;
        case 'high':
            scale = 100;
            break;
        default:
            scale = 1;
    }

    for (let i = 0; i < size; i++) {
        B[i] = [];
        for (let j = 0; j < size; j++) {
            B[i][j] = (Math.random() - 0.5) * 2;
            if (i === j) {
                B[i][j] += scale; // Add to diagonal for conditioning
            }
        }
    }

    // Compute A = B * B^T
    const A = [];
    for (let i = 0; i < size; i++) {
        A[i] = [];
        for (let j = 0; j < size; j++) {
            let sum = 0;
            for (let k = 0; k < size; k++) {
                sum += B[i][k] * B[j][k];
            }
            A[i][j] = sum;
        }
    }

    return A;
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
            const condType = document.getElementById('condNumber').value;
            matrix = generateRandomSPD(size, condType);
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
            <h3>Cholesky Decomposition Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'A = LL^T factorization'}</div>
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

    // Display L matrix
    if (result.L) {
        html += `
            <div class="decomposition-display">
                <h4>Decomposition: ${result.D ? 'A = LDL^T' : 'A = LL^T'}</h4>
                <div class="matrices-row">
                    <div class="matrix-block">
                        <h5>L (Lower Triangular)</h5>
                        ${renderMatrix(result.L, 8)}
                    </div>
        `;

        if (result.Dmatrix) {
            html += `
                    <div class="matrix-block">
                        <h5>D (Diagonal)</h5>
                        ${renderMatrix(result.Dmatrix, 8)}
                    </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    }

    // Display diagonal elements
    if (result.diagonal && result.diagonal.length <= 10) {
        html += `
            <h4>Diagonal Elements</h4>
            <div class="diagonal-display">
        `;
        for (let i = 0; i < result.diagonal.length; i++) {
            html += `<span class="diag-item">${result.D ? 'D' : 'L'}[${i}][${i}] = ${formatNumber(result.diagonal[i])}</span>`;
        }
        html += `</div>`;
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
