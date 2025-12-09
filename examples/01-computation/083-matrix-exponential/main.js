/**
 * Main script for Matrix Exponential
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
    if (type === 'random') {
        document.getElementById('inputMode').value = 'random';
        toggleInputMode();
        return;
    }

    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let matrix;

    switch (type) {
        case 'nilpotent':
            // Nilpotent: A^2 = 0, so e^A = I + A
            matrix = '0, 1\n0, 0';
            break;
        case 'rotation':
            // Skew-symmetric → rotation matrix
            // e^[[0,-θ],[θ,0]] = [[cos θ, -sin θ],[sin θ, cos θ]]
            const theta = Math.PI / 4;  // 45 degrees
            matrix = `0, ${-theta}\n${theta}, 0`;
            break;
        case 'diagonal':
            // Diagonal: e^diag(a,b,c) = diag(e^a, e^b, e^c)
            matrix = '1, 0, 0\n0, 2, 0\n0, 0, 3';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
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

    let data;

    try {
        if (inputMode === 'manual') {
            const parsed = parseMatrix(document.getElementById('matrixInput').value);
            data = { A: parsed.data, n: parsed.n, generate: false };
        } else {
            const n = parseInt(document.getElementById('size').value);
            const matrixType = document.getElementById('matrixType').value;
            const scale = parseFloat(document.getElementById('scale').value);

            if (n < 2 || n > 200) {
                throw new Error('Matrix size must be between 2 and 200');
            }

            data = { n, matrixType, scale, generate: true };
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
            <h3>Matrix Exponential e^A</h3>
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
                    <span class="stat-label">||A||₁</span>
                    <span class="stat-value">${formatNumber(result.inputNorm)}</span>
                </div>
    `;

    if (result.outputNorm !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">||e^A||_F</span>
                    <span class="stat-value">${formatNumber(result.outputNorm)}</span>
                </div>
        `;
    }

    if (result.traceA !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">tr(A)</span>
                    <span class="stat-value">${formatNumber(result.traceA)}</span>
                </div>
        `;
    }

    if (result.expectedDet !== undefined && result.actualDet !== null) {
        const detError = Math.abs(result.expectedDet - result.actualDet);
        html += `
                <div class="stat-item">
                    <span class="stat-label">e^tr(A)</span>
                    <span class="stat-value">${formatNumber(result.expectedDet)}</span>
                </div>
                <div class="stat-item ${detError < 0.01 ? 'highlight' : ''}">
                    <span class="stat-label">det(e^A)</span>
                    <span class="stat-value">${formatNumber(result.actualDet)}</span>
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

    // Comparison table
    if (result.comparison) {
        html += `
            <h4>Algorithm Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Algorithm</th>
                        <th>Time (ms)</th>
                        <th>||Result||</th>
                        <th>Diff from Padé</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            html += `
                <tr>
                    <td>${comp.algorithm}</td>
                    <td>${comp.time}</td>
                    <td>${comp.norm}</td>
                    <td>${comp.diff || '-'}</td>
                </tr>
            `;
        }
        html += `</table></div>`;
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
    loadSample('nilpotent');
});
