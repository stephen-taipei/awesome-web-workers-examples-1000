/**
 * Main script for Banded Matrix Operations
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
        case 'tridiagonal':
            // Tridiagonal: -1, 2, -1
            matrix = '-1, -1, -1, -1\n2, 2, 2, 2, 2\n-1, -1, -1, -1';
            vector = '1, 0, 0, 0, 1';
            break;
        case 'pentadiagonal':
            // Pentadiagonal: 1, -4, 6, -4, 1
            matrix = '1, 1, 1, 1, 1\n-4, -4, -4, -4, -4, -4\n6, 6, 6, 6, 6, 6, 6\n-4, -4, -4, -4, -4, -4\n1, 1, 1, 1, 1';
            vector = '1, 0, 0, 0, 0, 0, 1';
            break;
        case 'heatEquation':
            // 1D Heat equation discretization
            matrix = '-1, -1, -1, -1\n2.5, 2.5, 2.5, 2.5, 2.5\n-1, -1, -1, -1';
            vector = '1, 0, 0, 0, 1';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
    document.getElementById('vectorInput').value = vector;
}

function parseBandedMatrix(text, vectorText) {
    const lines = text.trim().split('\n');
    const numBands = lines.length;
    const bands = [];

    for (const line of lines) {
        const values = line.split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN)) {
            throw new Error('Invalid matrix values');
        }
        bands.push(new Float64Array(values));
    }

    // Determine matrix size from main diagonal (middle band)
    const mainDiagIdx = Math.floor(numBands / 2);
    const n = bands[mainDiagIdx].length;

    // Determine bandwidths
    const lowerBand = mainDiagIdx;
    const upperBand = numBands - 1 - mainDiagIdx;

    // Validate band lengths
    for (let d = 0; d < numBands; d++) {
        const offset = d - lowerBand;
        const expectedLen = n - Math.abs(offset);
        if (bands[d].length !== expectedLen) {
            throw new Error(`Band ${d} should have ${expectedLen} elements, got ${bands[d].length}`);
        }
    }

    // Parse vector b
    const b = vectorText.split(',').map(v => parseFloat(v.trim()));
    if (b.some(isNaN) || b.length !== n) {
        throw new Error(`Vector b should have ${n} elements`);
    }

    return {
        banded: { bands, n, lowerBand, upperBand },
        b: new Float64Array(b)
    };
}

function calculate() {
    const operation = document.getElementById('operation').value;
    const inputMode = document.getElementById('inputMode').value;

    let data;

    try {
        if (inputMode === 'manual') {
            const matrixText = document.getElementById('matrixInput').value;
            const vectorText = document.getElementById('vectorInput').value;
            const parsed = parseBandedMatrix(matrixText, vectorText);
            data = {
                banded: parsed.banded,
                b: parsed.b,
                generate: false
            };
        } else {
            const n = parseInt(document.getElementById('size').value);
            const lowerBand = parseInt(document.getElementById('lowerBand').value);
            const upperBand = parseInt(document.getElementById('upperBand').value);

            if (n < 3) throw new Error('Matrix size must be at least 3');
            if (lowerBand < 0 || upperBand < 0) throw new Error('Bandwidths must be non-negative');
            if (lowerBand >= n || upperBand >= n) throw new Error('Bandwidth cannot exceed matrix size');

            data = {
                n,
                lowerBand,
                upperBand,
                generate: true
            };
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
            <h3>Banded Matrix Operation</h3>
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
                <div class="stat-item">
                    <span class="stat-label">Bandwidth</span>
                    <span class="stat-value">${result.bandwidth}</span>
                </div>
    `;

    if (result.totalBandwidth !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Total Bandwidth</span>
                    <span class="stat-value">${result.totalBandwidth}</span>
                </div>
        `;
    }

    if (result.nonZeros !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Non-zeros</span>
                    <span class="stat-value">${result.nonZeros.toLocaleString()}</span>
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

    if (result.flops !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">FLOPs</span>
                    <span class="stat-value">${result.flops.toLocaleString()}</span>
                </div>
        `;
    }

    if (result.lBandwidth !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">L Bandwidth</span>
                    <span class="stat-value">${result.lBandwidth}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">U Bandwidth</span>
                    <span class="stat-value">${result.uBandwidth}</span>
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
                    <span class="stat-label">Banded Storage</span>
                    <span class="stat-value">${formatBytes(result.memoryBanded)}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Savings</span>
                    <span class="stat-value">${((1 - result.memoryBanded / result.memoryDense) * 100).toFixed(1)}%</span>
                </div>
            </div>
        `;
    }

    // Benchmark memory info
    if (result.memorySavings !== undefined) {
        html += `
            <h4>Memory Analysis</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Dense</span>
                    <span class="stat-value">${result.memoryDense}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Banded</span>
                    <span class="stat-value">${result.memoryBanded}</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-label">Memory Saved</span>
                    <span class="stat-value">${result.memorySavings}%</span>
                </div>
            </div>
        `;
    }

    // Solution sample
    if (result.solutionSample && result.solutionSample.length > 0) {
        html += `<h4>Solution Sample (first ${result.solutionSample.length} elements)</h4>`;
        html += `<div class="solution-display">`;
        for (let i = 0; i < result.solutionSample.length; i++) {
            html += `<span class="sol-item">x[${i}] = ${formatNumber(result.solutionSample[i])}</span>`;
        }
        html += `</div>`;
    }

    // Result sample
    if (result.resultSample && result.resultSample.length > 0) {
        html += `<h4>Result Sample (first ${result.resultSample.length} elements)</h4>`;
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
