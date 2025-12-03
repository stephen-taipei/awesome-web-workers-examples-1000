/**
 * Main script for Matrix Rank
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
        case 'fullRank':
            matrix = '1, 2, 3\n4, 5, 6\n7, 8, 10';
            break;
        case 'deficient':
            matrix = '1, 2, 3\n4, 5, 6\n7, 8, 9';
            break;
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'zero':
            matrix = '0, 0, 0\n0, 0, 0\n0, 0, 0';
            break;
        case 'rectangular':
            matrix = '1, 2, 3, 4\n5, 6, 7, 8\n9, 10, 11, 12';
            break;
        case 'nearSingular':
            matrix = '1, 2, 3\n4, 5, 6\n7, 8, 9.0001';
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

function generateRandomMatrix(rows, cols, targetRank) {
    if (targetRank === 0 || targetRank > Math.min(rows, cols)) {
        // Random full-rank-ish matrix
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                matrix[i][j] = Math.floor(Math.random() * 21) - 10;
            }
        }
        return matrix;
    }

    // Generate matrix with specific rank
    // A = U * V^T where U is rows x rank and V is cols x rank
    const U = [];
    const V = [];

    for (let i = 0; i < rows; i++) {
        U[i] = [];
        for (let j = 0; j < targetRank; j++) {
            U[i][j] = Math.random() * 10 - 5;
        }
    }

    for (let i = 0; i < cols; i++) {
        V[i] = [];
        for (let j = 0; j < targetRank; j++) {
            V[i][j] = Math.random() * 10 - 5;
        }
    }

    const matrix = [];
    for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
            let sum = 0;
            for (let k = 0; k < targetRank; k++) {
                sum += U[i][k] * V[j][k];
            }
            matrix[i][j] = Math.round(sum * 100) / 100;
        }
    }

    return matrix;
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;
    const tolerance = parseFloat(document.getElementById('tolerance').value);

    let matrix;

    try {
        if (inputMode === 'manual') {
            matrix = parseMatrix(document.getElementById('matrixInput').value);
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const targetRank = parseInt(document.getElementById('targetRank').value);
            matrix = generateRandomMatrix(rows, cols, targetRank);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data: { matrix, tolerance } });
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
            <h3>Matrix Rank Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="rank-display ${result.isFullRank ? 'full-rank' : 'deficient'}">
                <div class="rank-label">rank(A) =</div>
                <div class="rank-value">${result.rank}</div>
                <div class="rank-status">${result.isFullRank ? 'Full Rank' : 'Rank Deficient'}</div>
            </div>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.complexity}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Dimensions</span>
                    <span class="stat-value">${result.dimensions.rows} × ${result.dimensions.cols}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Max Possible Rank</span>
                    <span class="stat-value">${result.maxPossibleRank}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Nullity (dim ker)</span>
                    <span class="stat-value">${result.nullity}</span>
                </div>
                <div class="stat-item ${result.isFullRank ? 'highlight' : 'warning'}">
                    <span class="stat-label">Status</span>
                    <span class="stat-value">${result.isFullRank ? 'Full Rank' : 'Rank Deficient'}</span>
                </div>
    `;

    if (result.conditionNumber !== undefined) {
        const condDisplay = result.conditionNumber === Infinity ? '∞' :
            result.conditionNumber.toExponential(2);
        html += `
                <div class="stat-item">
                    <span class="stat-label">Condition Number</span>
                    <span class="stat-value">${condDisplay}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Singular values
    if (result.singularValues && result.singularValues.length > 0) {
        html += `
            <h4>Singular Values (top ${result.singularValues.length})</h4>
            <div class="sv-grid">
        `;
        result.singularValues.forEach((sv, i) => {
            const isZero = sv < result.tolerance;
            html += `
                <div class="sv-item ${isZero ? 'zero' : ''}">
                    <span class="sv-index">σ<sub>${i + 1}</sub></span>
                    <span class="sv-value">${sv.toExponential(4)}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    // Diagonal R elements
    if (result.diagonalR && result.diagonalR.length > 0) {
        html += `
            <h4>Diagonal of R (QR)</h4>
            <div class="sv-grid">
        `;
        result.diagonalR.forEach((val, i) => {
            const isZero = val < result.tolerance;
            html += `
                <div class="sv-item ${isZero ? 'zero' : ''}">
                    <span class="sv-index">R<sub>${i + 1},${i + 1}</sub></span>
                    <span class="sv-value">${val.toExponential(4)}</span>
                </div>
            `;
        });
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
                        <th>Computed Rank</th>
                        <th>Time (ms)</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td>${comp.rank}</td>
                        <td>${comp.time}</td>
                    </tr>
            `;
        }
        html += `</table></div>`;
        html += `<p class="agreement ${result.allAgree ? 'agree' : 'disagree'}">
            ${result.allAgree ? '✓ All methods agree on rank' : '⚠ Methods disagree - check tolerance'}
        </p>`;
    }

    // Rank-Nullity Theorem
    html += `
        <div class="theorem-box">
            <h4>Rank-Nullity Theorem</h4>
            <p>rank(A) + nullity(A) = ${result.rank} + ${result.nullity} = ${result.rank + result.nullity} = n (columns)</p>
        </div>
    `;

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
    loadSample('fullRank');
});
