/**
 * Main script for Least Squares Solver
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
        case 'linear':
            // y = 2 + 3x (linear regression)
            matrix = '1, 1\n1, 2\n1, 3\n1, 4\n1, 5';
            vector = '5, 8, 11, 14, 17';
            break;
        case 'polynomial':
            // Polynomial fit: y = a + bx + cx²
            matrix = '1, 0, 0\n1, 1, 1\n1, 2, 4\n1, 3, 9\n1, 4, 16';
            vector = '1, 2, 5, 10, 17';
            break;
        case 'overdetermined':
            matrix = '1, 1\n1, 2\n1, 3\n1, 4';
            vector = '6, 5, 7, 10';
            break;
        case 'noisy':
            // Linear with noise
            matrix = '1, 0\n1, 1\n1, 2\n1, 3\n1, 4\n1, 5';
            vector = '2.1, 3.9, 6.2, 7.8, 10.1, 11.9';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
    document.getElementById('vectorInput').value = vector;
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

function parseVector(text) {
    const values = text.split(',').map(v => parseFloat(v.trim()));
    if (values.some(isNaN)) {
        throw new Error('Invalid vector values');
    }
    return values;
}

function generateRandomSystem(rows, cols, noise) {
    // Generate A with first column as ones (intercept)
    const A = [];
    const trueCoeffs = [];

    // Random true coefficients
    for (let j = 0; j < cols; j++) {
        trueCoeffs.push(Math.random() * 10 - 5);
    }

    for (let i = 0; i < rows; i++) {
        A[i] = [];
        A[i][0] = 1; // Intercept
        for (let j = 1; j < cols; j++) {
            A[i][j] = Math.random() * 10;
        }
    }

    // Generate b = A * trueCoeffs + noise
    const b = [];
    for (let i = 0; i < rows; i++) {
        let sum = 0;
        for (let j = 0; j < cols; j++) {
            sum += A[i][j] * trueCoeffs[j];
        }
        b[i] = sum + (Math.random() - 0.5) * 2 * noise;
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
            if (A.length < A[0].length) {
                throw new Error('System must be overdetermined (rows >= columns)');
            }
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const noise = parseFloat(document.getElementById('noise').value);
            if (rows < cols) {
                throw new Error('Rows must be >= columns');
            }
            const system = generateRandomSystem(rows, cols, noise);
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
            <h3>Least Squares Solution</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description || 'min||Ax - b||²'}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">System Size</span>
                    <span class="stat-value">${result.rows}×${result.cols}</span>
                </div>
    `;

    if (result.residualNorm !== undefined) {
        html += `
                <div class="stat-item ${result.residualNorm < 1e-6 ? 'highlight' : ''}">
                    <span class="stat-label">||Residual||</span>
                    <span class="stat-value">${result.residualNorm.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.rSquared !== undefined) {
        html += `
                <div class="stat-item ${result.rSquared > 0.9 ? 'highlight' : ''}">
                    <span class="stat-label">R²</span>
                    <span class="stat-value">${result.rSquared.toFixed(4)}</span>
                </div>
        `;
    }

    if (result.effectiveRank !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Eff. Rank</span>
                    <span class="stat-value">${result.effectiveRank}</span>
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
                        <th>R²</th>
                        <th>Status</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.success ? comp.time : '-'}</td>
                        <td>${comp.success ? comp.residualNorm : '-'}</td>
                        <td>${comp.success ? comp.rSquared : '-'}</td>
                        <td class="${comp.success ? 'success' : 'failed'}">${comp.success ? 'OK' : 'Failed'}</td>
                    </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Solution display
    if (result.solution) {
        html += `<h4>Solution (Coefficients)</h4>`;
        html += `<div class="solution-display">`;

        for (let i = 0; i < result.solution.length; i++) {
            html += `<span class="sol-item">x<sub>${i + 1}</sub> = ${formatNumber(result.solution[i])}</span>`;
        }
        html += `</div>`;
    }

    // Singular values
    if (result.singularValues && result.singularValues.length <= 10) {
        html += `<h4>Singular Values</h4>`;
        html += `<div class="sv-display">`;
        for (let i = 0; i < result.singularValues.length; i++) {
            html += `<span class="sv-item">σ<sub>${i + 1}</sub> = ${formatNumber(result.singularValues[i])}</span>`;
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
    loadSample('linear');
});
