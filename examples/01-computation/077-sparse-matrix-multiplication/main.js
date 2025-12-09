/**
 * Main script for Sparse Matrix Multiplication
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
    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let matrix, rows, cols;

    switch (type) {
        case 'identity':
            matrix = '0, 0, 1\n1, 1, 1\n2, 2, 1\n3, 3, 1\n4, 4, 1';
            rows = 5; cols = 5;
            break;
        case 'diagonal':
            matrix = '0, 0, 2\n1, 1, 3\n2, 2, 5\n3, 3, 7\n4, 4, 11';
            rows = 5; cols = 5;
            break;
        case 'tridiagonal':
            matrix = '0, 0, 2\n0, 1, -1\n1, 0, -1\n1, 1, 2\n1, 2, -1\n2, 1, -1\n2, 2, 2\n2, 3, -1\n3, 2, -1\n3, 3, 2\n3, 4, -1\n4, 3, -1\n4, 4, 2';
            rows = 5; cols = 5;
            break;
        case 'random':
            document.getElementById('inputMode').value = 'random';
            toggleInputMode();
            return;
    }

    document.getElementById('matrixInput').value = matrix;
    document.getElementById('rowsManual').value = rows;
    document.getElementById('colsManual').value = cols;
}

function parseSparseMatrix(text) {
    const lines = text.trim().split('\n');
    const rows = [];
    const cols = [];
    const values = [];

    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length !== 3) {
            throw new Error('Each line must have row, col, value');
        }
        const row = parseInt(parts[0]);
        const col = parseInt(parts[1]);
        const val = parseFloat(parts[2]);

        if (isNaN(row) || isNaN(col) || isNaN(val)) {
            throw new Error('Invalid number in sparse matrix input');
        }

        rows.push(row);
        cols.push(col);
        values.push(val);
    }

    return { rows, cols, values };
}

function generateRandomCOO(numRows, numCols, density) {
    const expectedNnz = Math.max(1, Math.floor(numRows * numCols * density / 100));
    const rows = [];
    const cols = [];
    const values = [];

    const seen = new Set();
    let generated = 0;

    while (generated < expectedNnz) {
        const r = Math.floor(Math.random() * numRows);
        const c = Math.floor(Math.random() * numCols);
        const key = r * numCols + c;

        if (!seen.has(key)) {
            seen.add(key);
            rows.push(r);
            cols.push(c);
            values.push(Math.random() * 20 - 10);
            generated++;
        }
    }

    return { rows, cols, values };
}

function calculate() {
    const operation = document.getElementById('operation').value;
    const inputMode = document.getElementById('inputMode').value;

    let coo, numRows, numCols;

    try {
        if (inputMode === 'manual') {
            coo = parseSparseMatrix(document.getElementById('matrixInput').value);
            numRows = parseInt(document.getElementById('rowsManual').value);
            numCols = parseInt(document.getElementById('colsManual').value);

            // Validate indices
            for (let i = 0; i < coo.rows.length; i++) {
                if (coo.rows[i] < 0 || coo.rows[i] >= numRows) {
                    throw new Error(`Row index ${coo.rows[i]} out of bounds [0, ${numRows - 1}]`);
                }
                if (coo.cols[i] < 0 || coo.cols[i] >= numCols) {
                    throw new Error(`Column index ${coo.cols[i]} out of bounds [0, ${numCols - 1}]`);
                }
            }
        } else {
            numRows = parseInt(document.getElementById('rows').value);
            numCols = parseInt(document.getElementById('cols').value);
            const density = parseFloat(document.getElementById('density').value);

            if (numRows < 1 || numCols < 1) {
                throw new Error('Matrix dimensions must be positive');
            }
            if (density <= 0 || density > 100) {
                throw new Error('Density must be between 0 and 100');
            }

            coo = generateRandomCOO(numRows, numCols, density);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    let data;

    switch (operation) {
        case 'multiply':
        case 'transpose':
        case 'benchmark':
            data = { coo, numRows, numCols };
            break;
        case 'matmul':
            // For simplicity, multiply A × A
            data = {
                cooA: coo,
                cooB: coo,
                numRowsA: numRows,
                numColsA: numCols,
                numColsB: numCols
            };
            break;
        case 'add':
            // Generate a second random matrix with same dimensions
            const coo2 = inputMode === 'manual' ? coo : generateRandomCOO(numRows, numCols, parseFloat(document.getElementById('density').value));
            data = {
                cooA: coo,
                cooB: coo2,
                numRows,
                numCols
            };
            break;
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
            <h3>Sparse Matrix Operation</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.operation}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
    `;

    // Add stats based on operation type
    if (result.numRows !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Matrix Size</span>
                <span class="stat-value">${result.numRows}×${result.numCols}</span>
            </div>
        `;
    }

    if (result.matrixA !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Matrix A</span>
                <span class="stat-value">${result.matrixA}</span>
            </div>
        `;
    }

    if (result.matrixSize !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Matrix Size</span>
                <span class="stat-value">${result.matrixSize}</span>
            </div>
        `;
    }

    if (result.nnz !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Non-zeros</span>
                <span class="stat-value">${result.nnz.toLocaleString()}</span>
            </div>
        `;
    }

    if (result.density !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Density</span>
                <span class="stat-value">${result.density}%</span>
            </div>
        `;
    }

    if (result.nnzA !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">nnz(A)</span>
                <span class="stat-value">${result.nnzA.toLocaleString()}</span>
            </div>
        `;
    }

    if (result.nnzB !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">nnz(B)</span>
                <span class="stat-value">${result.nnzB.toLocaleString()}</span>
            </div>
        `;
    }

    if (result.nnzC !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">nnz(C)</span>
                <span class="stat-value">${result.nnzC.toLocaleString()}</span>
            </div>
        `;
    }

    if (result.fillRatio !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Fill Ratio</span>
                <span class="stat-value">${result.fillRatio}×</span>
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

    if (result.originalSize !== undefined) {
        html += `
            <div class="stat-item">
                <span class="stat-label">Original</span>
                <span class="stat-value">${result.originalSize}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Transposed</span>
                <span class="stat-value">${result.transposedSize}</span>
            </div>
        `;
    }

    html += `</div>`;

    // Memory comparison
    if (result.memoryDense !== undefined && typeof result.memoryDense === 'number') {
        html += `
            <h4>Memory Comparison</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Dense Storage</span>
                    <span class="stat-value">${formatBytes(result.memoryDense)}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Sparse Storage</span>
                    <span class="stat-value">${formatBytes(result.memorySparse)}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Savings</span>
                    <span class="stat-value">${((1 - result.memorySparse / result.memoryDense) * 100).toFixed(1)}%</span>
                </div>
            </div>
        `;
    }

    // Memory info for benchmark
    if (result.memorySavings !== undefined) {
        html += `
            <h4>Memory Analysis</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Dense</span>
                    <span class="stat-value">${result.memoryDense}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Sparse (CSR)</span>
                    <span class="stat-value">${result.memorySparse}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Memory Saved</span>
                    <span class="stat-value">${result.memorySavings}%</span>
                </div>
            </div>
        `;
    }

    // Result sample
    if (result.resultSample && result.resultSample.length > 0) {
        html += `<h4>Result Sample (first ${result.resultSample.length} elements of y)</h4>`;
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
                        <th>FLOP/s</th>
                    </tr>
        `;
        for (const bench of result.benchmarks) {
            html += `
                <tr>
                    <td>${bench.name}</td>
                    <td>${bench.time}</td>
                    <td>${bench.flops}</td>
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
        return val.toExponential(4);
    }
    return val.toFixed(6);
}

function formatBytes(bytes) {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
    return bytes + ' B';
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('tridiagonal');
});
