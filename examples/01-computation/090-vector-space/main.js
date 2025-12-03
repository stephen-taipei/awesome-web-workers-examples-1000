/**
 * Main script for Vector Space
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
        case 'independent':
            // Full rank 3x3
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'dependent':
            // Rank deficient: row 3 = row 1 + row 2
            matrix = '1, 2, 3\n4, 5, 6\n5, 7, 9';
            break;
        case 'tall':
            // More rows than columns
            matrix = '1, 2\n3, 4\n5, 6\n7, 8';
            break;
        case 'wide':
            // More columns than rows
            matrix = '1, 2, 3, 4\n5, 6, 7, 8';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
}

function parseMatrix(text) {
    const lines = text.trim().split('\n');
    const m = lines.length;
    const A = [];
    let n = 0;

    for (let i = 0; i < m; i++) {
        const values = lines[i].split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN)) {
            throw new Error('Invalid number in matrix');
        }
        if (i === 0) {
            n = values.length;
        } else if (values.length !== n) {
            throw new Error('All rows must have the same number of columns');
        }
        A.push(values);
    }

    return { A, m, n };
}

function calculate() {
    const operation = document.getElementById('operation').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const parsed = parseMatrix(document.getElementById('matrixInput').value);
            data = { A: parsed.A, m: parsed.m, n: parsed.n, generate: false };
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const matrixType = document.getElementById('matrixType').value;

            if (rows < 2 || rows > 100 || cols < 2 || cols > 100) {
                throw new Error('Matrix dimensions must be between 2 and 100');
            }

            data = { rows, cols, matrixType, generate: true };
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: operation, data });
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
            <h3>Vector Space Analysis</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.operation}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.inputSize}</span>
                </div>
    `;

    if (result.rank !== undefined) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Rank</span>
                    <span class="stat-value">${result.rank}</span>
                </div>
        `;
    }

    if (result.nullity !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Nullity</span>
                    <span class="stat-value">${result.nullity}</span>
                </div>
        `;
    }

    if (result.dimension !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Dimension</span>
                    <span class="stat-value">${result.dimension}</span>
                </div>
        `;
    }

    if (result.rankNullityVerified !== undefined) {
        const verified = result.rankNullityVerified ? '✓' : '✗';
        html += `
                <div class="stat-item ${result.rankNullityVerified ? 'highlight' : ''}">
                    <span class="stat-label">Rank-Nullity</span>
                    <span class="stat-value">${verified}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Pivot columns
    if (result.pivotColumns && result.pivotColumns.length > 0) {
        html += `<h4>Pivot Columns</h4>`;
        html += `<div class="columns-list">`;
        html += result.pivotColumns.map(c => `<span class="col-item">col ${c + 1}</span>`).join('');
        html += `</div>`;
    }

    // Free variables
    if (result.freeVariables && result.freeVariables.length > 0) {
        html += `<h4>Free Variables</h4>`;
        html += `<div class="columns-list">`;
        html += result.freeVariables.map(c => `<span class="col-item free">x${c + 1}</span>`).join('');
        html += `</div>`;
    }

    // Basis vectors display
    if (result.basisVectors && result.basisVectors.length > 0) {
        html += `<h4>Basis Vectors (${result.basisVectors.length})</h4>`;
        html += `<div class="basis-container">`;
        for (let i = 0; i < Math.min(5, result.basisVectors.length); i++) {
            html += `<div class="basis-vector">`;
            html += `<span class="basis-label">v${i + 1}</span>`;
            html += `<div class="vector-values">`;
            const vec = result.basisVectors[i];
            for (let j = 0; j < Math.min(6, vec.length); j++) {
                html += `<span>${formatNumber(vec[j])}</span>`;
            }
            if (vec.length > 6) html += `<span>...</span>`;
            html += `</div></div>`;
        }
        if (result.basisVectors.length > 5) {
            html += `<div class="more-vectors">... and ${result.basisVectors.length - 5} more</div>`;
        }
        html += `</div>`;
    }

    // Column space basis
    if (result.columnSpaceBasis && result.columnSpaceBasis.length > 0) {
        html += `<h4>Column Space Basis (dim = ${result.columnSpaceBasis.length})</h4>`;
        html += displayBasisVectors(result.columnSpaceBasis, 'c');
    }

    // Null space basis
    if (result.nullSpaceBasis && result.nullSpaceBasis.length > 0) {
        html += `<h4>Null Space Basis (dim = ${result.nullSpaceBasis.length})</h4>`;
        html += displayBasisVectors(result.nullSpaceBasis, 'n');
    }

    // Row space basis
    if (result.rowSpaceBasis && result.rowSpaceBasis.length > 0) {
        html += `<h4>Row Space Basis (dim = ${result.rowSpaceBasis.length})</h4>`;
        html += displayBasisVectors(result.rowSpaceBasis, 'r');
    }

    // Input matrix preview
    if (result.inputMatrix) {
        html += `<h4>Input Matrix A</h4>`;
        html += displayMatrix(result.inputMatrix);
    }

    // RREF matrix
    if (result.rrefMatrix) {
        html += `<h4>Row Reduced Echelon Form</h4>`;
        html += displayMatrix(result.rrefMatrix);
    }

    // Output matrix
    if (result.outputMatrix) {
        html += `<h4>RREF Result</h4>`;
        html += displayMatrix(result.outputMatrix);
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function displayBasisVectors(vectors, prefix) {
    let html = `<div class="basis-container">`;
    for (let i = 0; i < Math.min(4, vectors.length); i++) {
        html += `<div class="basis-vector">`;
        html += `<span class="basis-label">${prefix}${i + 1}</span>`;
        html += `<div class="vector-values">`;
        const vec = vectors[i];
        for (let j = 0; j < Math.min(5, vec.length); j++) {
            html += `<span>${formatNumber(vec[j])}</span>`;
        }
        if (vec.length > 5) html += `<span>...</span>`;
        html += `</div></div>`;
    }
    if (vectors.length > 4) {
        html += `<div class="more-vectors">... and ${vectors.length - 4} more</div>`;
    }
    html += `</div>`;
    return html;
}

function displayMatrix(matrix) {
    let html = `<div class="matrix-display"><table class="matrix-table">`;
    for (const row of matrix) {
        html += `<tr>`;
        for (const val of row) {
            html += `<td>${formatNumber(val)}</td>`;
        }
        html += `</tr>`;
    }
    html += `</table></div>`;
    return html;
}

function formatNumber(val) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-10) return '0';
    if (Math.abs(val) < 0.001 || Math.abs(val) > 1000) {
        return val.toExponential(2);
    }
    if (Number.isInteger(val)) return val.toString();
    return val.toFixed(3);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('dependent');
});
