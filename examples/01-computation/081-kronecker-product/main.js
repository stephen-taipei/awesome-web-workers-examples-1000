/**
 * Main script for Kronecker Product
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

function loadSample(type) {
    if (type === 'random') {
        document.getElementById('inputMode').value = 'random';
        toggleInputMode();
        return;
    }

    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let matrixA, matrixB;

    switch (type) {
        case 'identity':
            matrixA = '1, 0\n0, 1';
            matrixB = '1, 0\n0, 1';
            break;
        case 'pauli':
            // Pauli X and Z
            matrixA = '0, 1\n1, 0';
            matrixB = '1, 0\n0, -1';
            break;
        case 'hadamard':
            // Hadamard gate H ⊗ H
            const h = 0.7071067811865476;  // 1/√2
            matrixA = `${h}, ${h}\n${h}, ${-h}`;
            matrixB = `${h}, ${h}\n${h}, ${-h}`;
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

    const cols = matrix[0].length;
    for (const row of matrix) {
        if (row.length !== cols) {
            throw new Error('All rows must have the same number of columns');
        }
    }

    return matrix;
}

function calculate() {
    const operation = document.getElementById('operation').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const A = parseMatrix(document.getElementById('matrixA').value);
            const B = parseMatrix(document.getElementById('matrixB').value);
            data = { A, B, generate: false };
        } else {
            const rowsA = parseInt(document.getElementById('rowsA').value);
            const colsA = parseInt(document.getElementById('colsA').value);
            const rowsB = parseInt(document.getElementById('rowsB').value);
            const colsB = parseInt(document.getElementById('colsB').value);

            // Check result size
            const resultSize = rowsA * rowsB * colsA * colsB;
            if (resultSize > 100000000) {
                throw new Error('Result matrix too large (max 100M elements)');
            }

            data = { rowsA, colsA, rowsB, colsB, generate: true };
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

function displayResults(operation, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card">
            <h3>Kronecker Operation</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.operation}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix A</span>
                    <span class="stat-value">${result.inputA}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Matrix B</span>
                    <span class="stat-value">${result.inputB}</span>
                </div>
    `;

    if (result.outputSize !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Output Size</span>
                    <span class="stat-value">${result.outputSize}</span>
                </div>
        `;
    }

    if (result.totalElements !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Total Elements</span>
                    <span class="stat-value">${result.totalElements.toLocaleString()}</span>
                </div>
        `;
    }

    if (result.frobeniusNorm !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">||Result||_F</span>
                    <span class="stat-value">${result.frobeniusNorm.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.vectorLength !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Vector Length</span>
                    <span class="stat-value">${result.vectorLength}</span>
                </div>
        `;
    }

    if (result.resultLength !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Result Length</span>
                    <span class="stat-value">${result.resultLength}</span>
                </div>
        `;
    }

    if (result.resultNorm !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">||y||</span>
                    <span class="stat-value">${result.resultNorm.toExponential(2)}</span>
                </div>
        `;
    }

    if (result.memorySaved !== undefined) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Memory Saved</span>
                    <span class="stat-value">${result.memorySaved}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Submatrix display
    if (result.submatrix) {
        html += `<h4>Result Preview (top-left corner)</h4>`;
        html += `<div class="matrix-display">`;
        html += `<table class="matrix-table">`;
        for (const row of result.submatrix) {
            html += `<tr>`;
            for (const val of row) {
                html += `<td>${formatNumber(val)}</td>`;
            }
            html += `</tr>`;
        }
        html += `</table>`;
        html += `</div>`;
    }

    // Result sample
    if (result.resultSample && result.resultSample.length > 0) {
        html += `<h4>Result Sample</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.resultSample.length; i++) {
            html += `<span class="sol-item">y[${i}] = ${formatNumber(result.resultSample[i])}</span>`;
        }
        html += `</div>`;
    }

    // Benchmark results
    if (result.benchmarks) {
        html += `
            <h4>Performance Benchmarks</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Operation</th>
                        <th>Time (ms)</th>
                    </tr>
        `;
        for (const bench of result.benchmarks) {
            html += `
                <tr>
                    <td>${bench.name}</td>
                    <td>${bench.time}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatNumber(val) {
    if (Math.abs(val) < 1e-10) return '0';
    if (Math.abs(val) < 0.001 || Math.abs(val) > 10000) {
        return val.toExponential(2);
    }
    return val.toFixed(4);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('identity');
});
