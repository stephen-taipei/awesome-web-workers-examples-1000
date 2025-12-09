/**
 * Main script for Eigenvalue Calculator
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
            matrix = '4, -1, 1\n-1, 3, -2\n1, -2, 3';
            break;
        case 'symmetric':
            matrix = '2, 1, 0\n1, 3, 1\n0, 1, 2';
            break;
        case 'diagonal':
            matrix = '5, 0, 0\n0, 3, 0\n0, 0, 1';
            break;
        case 'defective':
            // Has repeated eigenvalue with incomplete eigenvectors
            matrix = '1, 1\n0, 1';
            break;
        case 'complex':
            // Will have complex eigenvalues
            matrix = '0, -1\n1, 0';
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
    } else if (matrixType === 'diagonal') {
        // Make diagonally dominant
        for (let i = 0; i < size; i++) {
            let rowSum = 0;
            for (let j = 0; j < size; j++) {
                if (i !== j) rowSum += Math.abs(matrix[i][j]);
            }
            matrix[i][i] = rowSum + Math.abs(matrix[i][i]) + 1;
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
            <h3>Eigenvalue Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'Eigenvalue computation'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
    `;

    if (result.trace !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Trace(A)</span>
                    <span class="stat-value">${formatNumber(result.trace)}</span>
                </div>
        `;
    }

    if (result.sumEigenvalues !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Sum(λ)</span>
                    <span class="stat-value">${formatNumber(result.sumEigenvalues)}</span>
                </div>
        `;
    }

    if (result.verification) {
        html += `
                <div class="stat-item ${result.verification.traceMatch ? 'highlight' : 'warning'}">
                    <span class="stat-label">Trace Error</span>
                    <span class="stat-value">${result.verification.traceError.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.dominantEigenvalue !== undefined) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Dominant λ</span>
                    <span class="stat-value">${formatNumber(result.dominantEigenvalue)}</span>
                </div>
        `;
    }

    if (result.smallestEigenvalue !== undefined) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Smallest λ</span>
                    <span class="stat-value">${formatNumber(result.smallestEigenvalue)}</span>
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

    // Eigenvalues display
    if (result.eigenvalues && result.eigenvalues.length > 0) {
        html += `
            <h4>Eigenvalues (λ)</h4>
            <div class="eigenvalue-list">
        `;
        const displayCount = Math.min(result.eigenvalues.length, 15);
        for (let i = 0; i < displayCount; i++) {
            const eig = result.eigenvalues[i];
            let eigStr;
            if (Math.abs(eig.imag) < 1e-10) {
                eigStr = formatNumber(eig.real);
            } else {
                const sign = eig.imag >= 0 ? '+' : '-';
                eigStr = `${formatNumber(eig.real)} ${sign} ${formatNumber(Math.abs(eig.imag))}i`;
            }
            html += `<span class="eig-item">λ<sub>${i + 1}</sub> = ${eigStr}</span>`;
        }
        if (result.eigenvalues.length > 15) {
            html += `<span class="eig-item">... (${result.eigenvalues.length - 15} more)</span>`;
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
                        <th>Result</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            let resultStr = '-';
            if (comp.success) {
                if (comp.count !== undefined) {
                    resultStr = `${comp.count} eigenvalues`;
                } else if (comp.dominant !== undefined) {
                    resultStr = `λ_max = ${comp.dominant}`;
                } else if (comp.smallest !== undefined) {
                    resultStr = `λ_min = ${comp.smallest}`;
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

    // Eigenvector display
    if (result.eigenvector) {
        html += `
            <h4>Eigenvector (for ${result.dominantEigenvalue !== undefined ? 'dominant' : 'smallest'} λ)</h4>
            <div class="eigenvector-display">
                [${result.eigenvector.map(v => formatNumber(v)).join(', ')}]
            </div>
        `;
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
