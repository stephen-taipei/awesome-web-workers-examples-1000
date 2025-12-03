/**
 * Main script for Hadamard Product
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
        case 'simple':
            matrixA = '1, 2, 3\n4, 5, 6\n7, 8, 9';
            matrixB = '9, 8, 7\n6, 5, 4\n3, 2, 1';
            break;
        case 'mask':
            // Binary mask application
            matrixA = '1, 2, 3, 4\n5, 6, 7, 8\n9, 10, 11, 12';
            matrixB = '1, 0, 1, 0\n0, 1, 0, 1\n1, 1, 0, 0';
            break;
        case 'weights':
            // Weighted combination
            matrixA = '10, 20, 30\n40, 50, 60\n70, 80, 90';
            matrixB = '0.1, 0.2, 0.3\n0.4, 0.5, 0.6\n0.7, 0.8, 0.9';
            break;
    }

    document.getElementById('matrixA').value = matrixA;
    document.getElementById('matrixB').value = matrixB;
}

function parseMatrix(text) {
    const lines = text.trim().split('\n');
    const matrix = [];

    for (const line of lines) {
        const values = line.split(',').map(v => parseFloat(v.trim()));
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

function matrixToTypedArray(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const data = new Float64Array(rows * cols);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            data[i * cols + j] = matrix[i][j];
        }
    }

    return { data, rows, cols };
}

function calculate() {
    const operation = document.getElementById('operation').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const matrixA = parseMatrix(document.getElementById('matrixA').value);
            const matrixB = parseMatrix(document.getElementById('matrixB').value);
            const power = parseFloat(document.getElementById('powerManual').value);

            if (matrixA.length !== matrixB.length || matrixA[0].length !== matrixB[0].length) {
                throw new Error('Matrices must have the same dimensions');
            }

            const A = matrixToTypedArray(matrixA);
            const B = matrixToTypedArray(matrixB);

            data = {
                A: A.data,
                B: B.data,
                rows: A.rows,
                cols: A.cols,
                power,
                generate: false
            };
        } else {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const power = parseFloat(document.getElementById('power').value);

            if (rows * cols > 25000000) {
                throw new Error('Matrix too large (max 25M elements)');
            }

            data = { rows, cols, power, generate: true };
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
            <h3>Hadamard Operation</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.operation}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Dimensions</span>
                    <span class="stat-value">${result.rows}×${result.cols}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Elements</span>
                    <span class="stat-value">${result.totalElements.toLocaleString()}</span>
                </div>
    `;

    if (result.power !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Power</span>
                    <span class="stat-value">${result.power}</span>
                </div>
        `;
    }

    if (result.throughput !== undefined) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Throughput</span>
                    <span class="stat-value">${result.throughput} M/s</span>
                </div>
        `;
    }

    html += `</div>`;

    // Statistics
    if (result.stats) {
        html += `
            <h4>Result Statistics</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Min</span>
                    <span class="stat-value">${formatNumber(result.stats.min)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Max</span>
                    <span class="stat-value">${formatNumber(result.stats.max)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mean</span>
                    <span class="stat-value">${formatNumber(result.stats.mean)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Std Dev</span>
                    <span class="stat-value">${formatNumber(result.stats.std)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">||C||_F</span>
                    <span class="stat-value">${formatNumber(result.stats.frobeniusNorm)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Non-zeros</span>
                    <span class="stat-value">${result.stats.nonZeroCount.toLocaleString()}</span>
                </div>
            </div>
        `;
    }

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

    // Benchmark results
    if (result.benchmarks) {
        html += `
            <h4>Performance Benchmarks</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Operation</th>
                        <th>Time (ms)</th>
                        <th>Throughput (M elem/s)</th>
                    </tr>
        `;
        for (const bench of result.benchmarks) {
            html += `
                <tr>
                    <td>${bench.name}</td>
                    <td>${bench.time}</td>
                    <td>${bench.throughput}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
    }

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatNumber(val) {
    if (!isFinite(val)) return val.toString();
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
    loadSample('simple');
});
