/**
 * Main script for Matrix Trace
 */

let worker = null;

function initWorker() {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, operation, result, executionTime, percentage, message } = e.data;

        if (type === 'progress') {
            updateProgress(percentage);
        } else if (type === 'result') {
            hideProgress();
            displayResults(operation, result, executionTime);
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

function updateOperationUI() {
    const operation = document.getElementById('operation').value;
    document.getElementById('matrixBInput').style.display = operation === 'product' ? 'block' : 'none';
    document.getElementById('powersInput').style.display = operation === 'powers' ? 'block' : 'none';
}

function loadSample(type) {
    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let matrixA, matrixB;

    switch (type) {
        case 'simple':
            matrixA = '1, 2, 3\n4, 5, 6\n7, 8, 9';
            matrixB = '9, 8, 7\n6, 5, 4\n3, 2, 1';
            break;
        case 'identity':
            matrixA = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            matrixB = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'diagonal':
            matrixA = '2, 0, 0\n0, 3, 0\n0, 0, 5';
            matrixB = '1, 0, 0\n0, 2, 0\n0, 0, 3';
            break;
        case 'symmetric':
            matrixA = '4, 2, 1\n2, 5, 3\n1, 3, 6';
            matrixB = '1, 2, 3\n2, 4, 5\n3, 5, 6';
            break;
        case 'nilpotent':
            matrixA = '0, 1, 0\n0, 0, 1\n0, 0, 0';
            matrixB = '0, 0, 1\n0, 0, 0\n0, 0, 0';
            break;
        case 'projection':
            // Projection matrix P = A(A^T A)^-1 A^T, simple example
            matrixA = '0.5, 0.5, 0\n0.5, 0.5, 0\n0, 0, 1';
            matrixB = '1, 0, 0\n0, 0.5, 0.5\n0, 0.5, 0.5';
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

    const n = matrix.length;
    for (let i = 0; i < n; i++) {
        if (matrix[i].length !== n) {
            throw new Error('Matrix must be square');
        }
    }

    return matrix;
}

function generateRandomMatrix(size, min, max) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            matrix[i][j] = Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    return matrix;
}

function calculate() {
    const operation = document.getElementById('operation').value;
    const inputMode = document.getElementById('inputMode').value;

    let matrixA, matrixB;

    try {
        if (inputMode === 'manual') {
            matrixA = parseMatrix(document.getElementById('matrixA').value);
            if (operation === 'product') {
                matrixB = parseMatrix(document.getElementById('matrixB').value);
            }
        } else {
            const size = parseInt(document.getElementById('size').value);
            const minVal = parseInt(document.getElementById('minVal').value);
            const maxVal = parseInt(document.getElementById('maxVal').value);
            matrixA = generateRandomMatrix(size, minVal, maxVal);
            if (operation === 'product') {
                matrixB = generateRandomMatrix(size, minVal, maxVal);
            }
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    const data = { matrix: matrixA, matrixA, matrixB };

    if (operation === 'powers') {
        data.maxPower = parseInt(document.getElementById('maxPower').value) || 5;
    }

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

function displayResults(operation, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card">
            <h3>Matrix Trace Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="trace-display">
                <div class="trace-label">tr(A) =</div>
                <div class="trace-value">${formatNumber(result.trace !== undefined ? result.trace : result.traceAB)}</div>
            </div>

            <div class="method-display">
                <div class="method-name">${result.operation}</div>
                <div class="method-info">${result.complexity}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
    `;

    if (result.frobeniusNorm !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Frobenius Norm</span>
                    <span class="stat-value">${formatNumber(result.frobeniusNorm)}</span>
                </div>
        `;
    }

    if (result.traceSquared !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">tr(A²)</span>
                    <span class="stat-value">${formatNumber(result.traceSquared)}</span>
                </div>
        `;
    }

    if (result.isSymmetric !== undefined) {
        html += `
                <div class="stat-item ${result.isSymmetric ? 'highlight' : ''}">
                    <span class="stat-label">Symmetric</span>
                    <span class="stat-value">${result.isSymmetric ? 'Yes' : 'No'}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Special types
    if (result.specialTypes && result.specialTypes.length > 0) {
        html += `
            <h4>Special Matrix Types Detected</h4>
            <div class="special-types">
        `;
        for (const type of result.specialTypes) {
            html += `<span class="type-badge">${type}</span>`;
        }
        html += `</div>`;
    }

    // Diagonal elements
    if (result.diagonalElements) {
        html += `
            <h4>Diagonal Elements ${result.diagonalElements.length < result.matrixSize ? `(first ${result.diagonalElements.length})` : ''}</h4>
            <div class="diagonal-display">
        `;
        result.diagonalElements.forEach((val, i) => {
            html += `<span class="diag-item">a<sub>${i + 1},${i + 1}</sub> = ${formatNumber(val)}</span>`;
        });
        html += `</div>`;
    }

    // Powers trace
    if (result.traces) {
        html += `
            <h4>Trace of Powers</h4>
            <div class="powers-grid">
        `;
        for (const t of result.traces) {
            html += `
                <div class="power-item">
                    <span class="power-label">tr(A<sup>${t.power}</sup>)</span>
                    <span class="power-value">${formatNumber(t.trace)}</span>
                </div>
            `;
        }
        html += `</div>`;
        if (result.note) {
            html += `<p class="note">${result.note}</p>`;
        }
    }

    // Product relationships
    if (result.relationships) {
        html += `
            <h4>Trace Relationships</h4>
            <div class="relationships-grid">
        `;
        for (const rel of result.relationships) {
            html += `
                <div class="rel-item">
                    <span class="rel-formula">${rel.formula}</span>
                    <span class="rel-value">${formatNumber(rel.value)}</span>
                </div>
            `;
        }
        html += `</div>`;

        if (result.cyclicVerified !== undefined) {
            html += `
                <p class="verification ${result.cyclicVerified ? 'valid' : 'invalid'}">
                    ${result.cyclicVerified ? '✓ Cyclic property verified: tr(AB) = tr(BA)' : '⚠ Cyclic property mismatch'}
                </p>
            `;
        }
    }

    html += `
            <p class="description-text">${result.description}</p>
        </div>
    `;

    resultsDiv.innerHTML = html;
}

function formatNumber(val) {
    if (Math.abs(val) < 1e-10) return '0';
    if (Number.isInteger(val)) return val.toLocaleString();
    if (Math.abs(val) < 0.001 || Math.abs(val) > 100000) {
        return val.toExponential(4);
    }
    return val.toFixed(4);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('operation').addEventListener('change', updateOperationUI);
    updateOperationUI();
    loadSample('simple');
});
