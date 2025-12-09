/**
 * Main script for Matrix Power
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
    let power = 10;

    switch (type) {
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            power = 100;
            break;
        case 'fibonacci':
            // [[1,1],[1,0]]^n gives Fibonacci numbers
            matrix = '1, 1\n1, 0';
            power = 20;
            break;
        case 'rotation':
            // Rotation by 45 degrees
            const angle = Math.PI / 4;
            const c = Math.cos(angle).toFixed(6);
            const s = Math.sin(angle).toFixed(6);
            matrix = `${c}, ${-s}\n${s}, ${c}`;
            power = 8; // 8 rotations = 360 degrees
            break;
        case 'nilpotent':
            // A^3 = 0
            matrix = '0, 1, 0\n0, 0, 1\n0, 0, 0';
            power = 3;
            break;
    }

    document.getElementById('matrixInput').value = matrix;
    document.getElementById('power').value = power;
}

function parseMatrix(text) {
    const lines = text.trim().split('\n');
    const n = lines.length;
    const matrix = new Float64Array(n * n);

    for (let i = 0; i < n; i++) {
        const values = lines[i].split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN) || values.length !== n) {
            throw new Error('Matrix must be square with valid numbers');
        }
        for (let j = 0; j < n; j++) {
            matrix[i * n + j] = values[j];
        }
    }

    return { data: matrix, n };
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;
    const power = parseInt(document.getElementById('power').value);

    if (power < 0 || power > 10000) {
        displayError('Power must be between 0 and 10000');
        return;
    }

    let data;

    try {
        if (inputMode === 'manual') {
            const parsed = parseMatrix(document.getElementById('matrixInput').value);
            data = { A: parsed.data, n: parsed.n, power, generate: false };
        } else {
            const size = parseInt(document.getElementById('size').value);
            const matrixType = document.getElementById('matrixType').value;

            if (size < 2 || size > 200) {
                throw new Error('Matrix size must be between 2 and 200');
            }

            data = { size, matrixType, power, generate: true };
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data });
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
            <h3>Matrix Power A^${result.power}</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Power (n)</span>
                    <span class="stat-value">${result.power}</span>
                </div>
    `;

    if (result.multiplications !== undefined) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Multiplications</span>
                    <span class="stat-value">${result.multiplications}</span>
                </div>
        `;
    }

    if (result.resultNorm !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">||A^n||_F</span>
                    <span class="stat-value">${formatNumber(result.resultNorm)}</span>
                </div>
        `;
    }

    if (result.executionTime !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Compute Time</span>
                    <span class="stat-value">${result.executionTime.toFixed(1)}ms</span>
                </div>
        `;
    }

    html += `</div>`;

    // Eigenvalues (for diagonalization)
    if (result.eigenvalues && result.eigenvalues.length > 0) {
        html += `<h4>Eigenvalues (top 5)</h4>`;
        html += `<div class="eigenvalues">`;
        for (let i = 0; i < result.eigenvalues.length; i++) {
            html += `<span class="ev-item">λ${i+1} = ${formatNumber(result.eigenvalues[i])}</span>`;
        }
        html += `</div>`;
    }

    // Comparison table
    if (result.comparison) {
        html += `
            <h4>Method Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Method</th>
                        <th>Time (ms)</th>
                        <th>Multiplications</th>
                        <th>||A^n||</th>
                        <th>Diff from Binary</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                <tr>
                    <td>${comp.method}</td>
                    <td>${comp.time}</td>
                    <td>${comp.multiplications}</td>
                    <td>${comp.norm}</td>
                    <td>${comp.diff || '-'}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
    }

    // Input matrix preview
    if (result.inputSubmatrix) {
        html += `<h4>Input Matrix A (preview)</h4>`;
        html += `<div class="matrix-display">`;
        html += `<table class="matrix-table">`;
        for (const row of result.inputSubmatrix) {
            html += `<tr>`;
            for (const val of row) {
                html += `<td>${formatNumber(val)}</td>`;
            }
            html += `</tr>`;
        }
        html += `</table>`;
        html += `</div>`;
    }

    // Result matrix preview
    if (result.submatrix) {
        html += `<h4>Result A^${result.power} (preview)</h4>`;
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

    html += `</div>`;

    resultsDiv.innerHTML = html;
}

function formatNumber(val) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-10) return '0';
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
    loadSample('fibonacci');
});
