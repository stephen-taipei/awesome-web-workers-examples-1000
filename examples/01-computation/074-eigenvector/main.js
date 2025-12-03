/**
 * Main script for Eigenvector Calculator
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

document.getElementById('algorithm').addEventListener('change', function() {
    const showTarget = this.value === 'inverseIteration';
    document.getElementById('targetEigenvalueGroup').style.display = showTarget ? 'block' : 'none';
});

function loadSample(type) {
    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let matrix;

    switch (type) {
        case 'simple':
            matrix = '4, -1, 1\n-1, 3, -2\n1, -2, 3';
            break;
        case 'symmetric':
            matrix = '2, 1, 0\n1, 3, 1\n0, 1, 2';
            break;
        case 'diagonal':
            matrix = '5, 0, 0\n0, 3, 0\n0, 0, 1';
            break;
        case 'orthogonal':
            // Symmetric matrix with orthogonal eigenvectors
            matrix = '2, 1, 1\n1, 2, 1\n1, 1, 2';
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

function generateRandomMatrix(size, matrixType, range) {
    const matrix = [];

    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            matrix[i][j] = Math.floor(Math.random() * (2 * range + 1)) - range;
        }
    }

    if (matrixType === 'symmetric') {
        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                matrix[j][i] = matrix[i][j];
            }
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
            const matrixType = document.getElementById('matrixType').value;
            const range = parseInt(document.getElementById('range').value);
            matrix = generateRandomMatrix(size, matrixType, range);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    const targetEigenvalue = parseFloat(document.getElementById('targetEigenvalue').value) || 0;

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data: { matrix, targetEigenvalue } });
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
            <h3>Eigenvector Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'Eigenvector computation'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
    `;

    if (result.eigenvalues) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Eigenpairs Found</span>
                    <span class="stat-value">${result.eigenvalues.length}</span>
                </div>
        `;
    }

    if (result.verification) {
        html += `
                <div class="stat-item ${result.verification.isValid ? 'highlight' : 'warning'}">
                    <span class="stat-label">Max ||Av-λv||</span>
                    <span class="stat-value">${result.verification.maxError.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.residual !== undefined) {
        html += `
                <div class="stat-item ${result.residual < 1e-8 ? 'highlight' : ''}">
                    <span class="stat-label">Residual</span>
                    <span class="stat-value">${result.residual.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.iterations !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Iterations</span>
                    <span class="stat-value">${result.iterations}</span>
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
                        <th>Result</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            let resultStr = '-';
            if (comp.success) {
                if (comp.maxError !== undefined) {
                    resultStr = `Error: ${comp.maxError}`;
                } else if (comp.eigenvalue !== undefined) {
                    resultStr = `λ = ${comp.eigenvalue}`;
                }
            }
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.success ? comp.time : '-'}</td>
                        <td>${resultStr}</td>
                        <td class="${comp.success ? 'success' : 'failed'}">${comp.success ? 'OK' : 'Failed'}</td>
                    </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Eigenpairs display
    if (result.eigenvalues && result.eigenvectors) {
        html += `<h4>Eigenpairs (λ, v)</h4>`;

        const displayCount = Math.min(result.eigenvalues.length, 8);
        for (let i = 0; i < displayCount; i++) {
            const lambda = result.eigenvalues[i];
            const v = result.eigenvectors[i];

            html += `
                <div class="eigenpair">
                    <div class="eigenvalue-box">
                        <span class="eig-label">λ<sub>${i + 1}</sub> = </span>
                        <span class="eig-value">${formatNumber(lambda)}</span>
                    </div>
                    <div class="eigenvector-box">
                        <span class="vec-label">v<sub>${i + 1}</sub> = </span>
                        <span class="vec-value">[${v.slice(0, 6).map(x => formatNumber(x)).join(', ')}${v.length > 6 ? ', ...' : ''}]</span>
                    </div>
                </div>
            `;
        }

        if (result.eigenvalues.length > 8) {
            html += `<p class="more-info">... and ${result.eigenvalues.length - 8} more eigenpairs</p>`;
        }
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
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
