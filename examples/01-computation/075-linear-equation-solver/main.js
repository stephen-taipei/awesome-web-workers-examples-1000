/**
 * Main script for Linear Equation Solver
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

    let matrix, vector;

    switch (type) {
        case 'simple':
            matrix = '3, 2, -1\n2, -2, 4\n-1, 0.5, -1';
            vector = '1, -2, 0';
            break;
        case 'diagonal':
            // Diagonally dominant
            matrix = '10, 2, 1\n1, 10, 2\n2, 1, 10';
            vector = '13, 13, 13';
            break;
        case 'spd':
            // Symmetric positive definite
            matrix = '4, 2, 0\n2, 5, 2\n0, 2, 6';
            vector = '6, 9, 8';
            break;
        case 'illConditioned':
            matrix = '1, 1\n1, 1.0001';
            vector = '2, 2.0001';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
    document.getElementById('vectorInput').value = vector;
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

function parseVector(text) {
    const values = text.split(',').map(v => parseFloat(v.trim()));
    if (values.some(isNaN)) {
        throw new Error('Invalid vector values');
    }
    return values;
}

function generateRandomSystem(size, systemType, range) {
    const A = [];
    const b = [];

    for (let i = 0; i < size; i++) {
        A[i] = [];
        for (let j = 0; j < size; j++) {
            A[i][j] = Math.floor(Math.random() * (2 * range + 1)) - range;
        }
    }

    if (systemType === 'diagonal') {
        // Make diagonally dominant
        for (let i = 0; i < size; i++) {
            let sum = 0;
            for (let j = 0; j < size; j++) {
                if (i !== j) sum += Math.abs(A[i][j]);
            }
            A[i][i] = sum + Math.abs(A[i][i]) + 1;
        }
    } else if (systemType === 'spd') {
        // A = B * B^T to ensure SPD
        const B = A.map(row => [...row]);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                let sum = 0;
                for (let k = 0; k < size; k++) {
                    sum += B[i][k] * B[j][k];
                }
                A[i][j] = sum;
            }
        }
    }

    // Generate random b
    for (let i = 0; i < size; i++) {
        b[i] = Math.floor(Math.random() * (2 * range + 1)) - range;
    }

    return { A, b };
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;

    let A, b;

    try {
        if (inputMode === 'manual') {
            A = parseMatrix(document.getElementById('matrixInput').value);
            b = parseVector(document.getElementById('vectorInput').value);
            if (A.length !== b.length) {
                throw new Error('Matrix rows must equal vector length');
            }
        } else {
            const size = parseInt(document.getElementById('size').value);
            const systemType = document.getElementById('systemType').value;
            const range = parseInt(document.getElementById('range').value);
            const system = generateRandomSystem(size, systemType, range);
            A = system.A;
            b = system.b;
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data: { A, b } });
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
            <h3>Linear System Solution</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'Ax = b solver'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">System Size</span>
                    <span class="stat-value">${result.systemSize}×${result.systemSize}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Method</span>
                    <span class="stat-value">${result.method || '-'}</span>
                </div>
    `;

    if (result.residualNorm !== undefined) {
        html += `
                <div class="stat-item ${result.residualNorm < 1e-8 ? 'highlight' : ''}">
                    <span class="stat-label">||b - Ax||</span>
                    <span class="stat-value">${result.residualNorm.toExponential(2)}</span>
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

    if (result.converged !== undefined) {
        html += `
                <div class="stat-item ${result.converged ? 'highlight' : 'warning'}">
                    <span class="stat-label">Converged</span>
                    <span class="stat-value">${result.converged ? 'Yes' : 'No'}</span>
                </div>
        `;
    }

    if (result.isDiagonallyDominant !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Diag. Dominant</span>
                    <span class="stat-value">${result.isDiagonallyDominant ? 'Yes' : 'No'}</span>
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
                        <th>||Residual||</th>
                        <th>Iterations</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            let status = comp.success ? 'OK' : 'Failed';
            if (comp.converged === false) status = 'No Conv.';
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.success ? comp.time : '-'}</td>
                        <td>${comp.success ? comp.residualNorm : '-'}</td>
                        <td>${comp.iterations || '-'}</td>
                        <td class="${comp.success && comp.converged !== false ? 'success' : 'failed'}">${status}</td>
                    </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Solution display
    if (result.solution) {
        html += `<h4>Solution Vector x</h4>`;
        html += `<div class="solution-display">`;

        const displayCount = Math.min(result.solution.length, 10);
        for (let i = 0; i < displayCount; i++) {
            html += `<span class="sol-item">x<sub>${i + 1}</sub> = ${formatNumber(result.solution[i])}</span>`;
        }
        if (result.solution.length > 10) {
            html += `<span class="sol-item">... (${result.solution.length - 10} more)</span>`;
        }
        html += `</div>`;
    }

    // Convergence history
    if (result.convergenceHistory && result.convergenceHistory.length > 0) {
        html += `<h4>Convergence History (last ${result.convergenceHistory.length} iterations)</h4>`;
        html += `<div class="convergence-display">`;
        for (let i = 0; i < result.convergenceHistory.length; i++) {
            html += `<span class="conv-item">${result.convergenceHistory[i].toExponential(2)}</span>`;
        }
        html += `</div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatNumber(val) {
    if (Math.abs(val) < 1e-10) return '0';
    if (Number.isInteger(val)) return val.toString();
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
    loadSample('simple');
});
