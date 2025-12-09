/**
 * Main script for Symmetric Matrix Operations
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

    let matrix, vector;

    switch (type) {
        case 'spd3':
            // 3×3 SPD matrix
            matrix = '4, 2, 1\n5, 2\n6';
            vector = '7, 9, 8';
            break;
        case 'covariance':
            // 4×4 Covariance-like matrix
            matrix = '1.0, 0.5, 0.3, 0.1\n1.0, 0.4, 0.2\n1.0, 0.3\n1.0';
            vector = '1, 2, 3, 4';
            break;
        case 'laplacian':
            // 5×5 Graph Laplacian (SPD)
            matrix = '2, -1, 0, 0, 0\n2, -1, 0, 0\n2, -1, 0\n2, -1\n1';
            vector = '1, 0, 0, 0, -1';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
    document.getElementById('vectorInput').value = vector;
}

function parseUpperTriangular(text) {
    const lines = text.trim().split('\n');
    const n = lines.length;

    // Parse upper triangle
    const upperTriangle = [];
    for (let i = 0; i < n; i++) {
        const values = lines[i].split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN)) {
            throw new Error('Invalid matrix values on line ' + (i + 1));
        }
        if (values.length !== n - i) {
            throw new Error(`Line ${i + 1} should have ${n - i} values`);
        }
        upperTriangle.push(values);
    }

    // Create packed symmetric matrix
    const size = n * (n + 1) / 2;
    const data = new Float64Array(size);

    let idx = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            data[idx++] = upperTriangle[i][j - i];
        }
    }

    return { data, n };
}

function parseVector(text) {
    const values = text.split(',').map(v => parseFloat(v.trim()));
    if (values.some(isNaN)) {
        throw new Error('Invalid vector values');
    }
    return new Float64Array(values);
}

function calculate() {
    const operation = document.getElementById('operation').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const sym = parseUpperTriangular(document.getElementById('matrixInput').value);
            const b = parseVector(document.getElementById('vectorInput').value);

            if (b.length !== sym.n) {
                throw new Error(`Vector should have ${sym.n} elements`);
            }

            data = { sym, b, generate: false };
        } else {
            const n = parseInt(document.getElementById('size').value);
            const matrixType = document.getElementById('matrixType').value;

            if (n < 2) throw new Error('Matrix size must be at least 2');
            if (n > 2000) throw new Error('Matrix size too large (max 2000)');

            data = { n, matrixType, generate: true };
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
            <h3>Symmetric Matrix Operation</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.operation}</div>
                <div class="method-info">${result.description}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
    `;

    if (result.packedSize !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Packed Elements</span>
                    <span class="stat-value">${result.packedSize.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Dense Elements</span>
                    <span class="stat-value">${result.denseSize.toLocaleString()}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Memory Saved</span>
                    <span class="stat-value">${result.savings}%</span>
                </div>
        `;
    }

    if (result.residualNorm !== undefined) {
        html += `
                <div class="stat-item ${result.residualNorm < 1e-8 ? 'highlight' : ''}">
                    <span class="stat-label">||Ax - b||</span>
                    <span class="stat-value">${result.residualNorm.toExponential(2)}</span>
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

    if (result.eigenvalue !== undefined) {
        html += `
                <div class="stat-item ${result.converged ? 'highlight' : 'warning'}">
                    <span class="stat-label">Eigenvalue</span>
                    <span class="stat-value">${formatNumber(result.eigenvalue)}</span>
                </div>
                <div class="stat-item ${result.converged ? 'highlight' : 'warning'}">
                    <span class="stat-label">Converged</span>
                    <span class="stat-value">${result.converged ? 'Yes' : 'No'}</span>
                </div>
        `;
    }

    html += `</div>`;

    // Solution/result samples
    if (result.solutionSample && result.solutionSample.length > 0) {
        html += `<h4>Solution Sample</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.solutionSample.length; i++) {
            html += `<span class="sol-item">x[${i}] = ${formatNumber(result.solutionSample[i])}</span>`;
        }
        html += `</div>`;
    }

    if (result.resultSample && result.resultSample.length > 0) {
        html += `<h4>Result Sample</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.resultSample.length; i++) {
            html += `<span class="sol-item">y[${i}] = ${formatNumber(result.resultSample[i])}</span>`;
        }
        html += `</div>`;
    }

    if (result.diagSample && result.diagSample.length > 0) {
        html += `<h4>Diagonal of L</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.diagSample.length; i++) {
            html += `<span class="sol-item">L[${i},${i}] = ${formatNumber(result.diagSample[i])}</span>`;
        }
        html += `</div>`;
    }

    if (result.diagD && result.diagD.length > 0) {
        html += `<h4>Diagonal D</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.diagD.length; i++) {
            html += `<span class="sol-item">D[${i}] = ${formatNumber(result.diagD[i])}</span>`;
        }
        html += `</div>`;
    }

    if (result.eigenvectorSample && result.eigenvectorSample.length > 0) {
        html += `<h4>Eigenvector Sample</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.eigenvectorSample.length; i++) {
            html += `<span class="sol-item">v[${i}] = ${formatNumber(result.eigenvectorSample[i])}</span>`;
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
    loadSample('spd3');
});
