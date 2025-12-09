/**
 * Main Thread: Eigenvalue Problem Solver
 * Handles UI and communicates with Web Worker
 */

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { type, calculationType, result, executionTime, message, percentage } = e.data;

    if (type === 'progress') {
        updateProgress(percentage);
    } else if (type === 'result') {
        hideProgress();
        displayResult(calculationType, result, executionTime);
    } else if (type === 'error') {
        hideProgress();
        displayError(message);
    }
};

function loadSample(type) {
    let matrix;
    switch (type) {
        case 'symmetric':
            matrix = [
                [4, 1, 1],
                [1, 3, 2],
                [1, 2, 5]
            ];
            break;
        case 'diagonal':
            matrix = [
                [5, 0, 0],
                [0, 3, 0],
                [0, 0, 1]
            ];
            break;
        case 'hilbert':
            // 3x3 Hilbert matrix
            matrix = [
                [1, 1/2, 1/3],
                [1/2, 1/3, 1/4],
                [1/3, 1/4, 1/5]
            ];
            break;
        case 'rotation':
            const theta = Math.PI / 4;
            matrix = [
                [Math.cos(theta), -Math.sin(theta), 0],
                [Math.sin(theta), Math.cos(theta), 0],
                [0, 0, 1]
            ];
            break;
        case 'stochastic':
            matrix = [
                [0.7, 0.2, 0.1],
                [0.1, 0.6, 0.3],
                [0.2, 0.2, 0.6]
            ];
            break;
        case 'large':
            // 5x5 symmetric
            matrix = [
                [10, 2, 1, 0, 0],
                [2, 8, 3, 1, 0],
                [1, 3, 6, 2, 1],
                [0, 1, 2, 5, 2],
                [0, 0, 1, 2, 4]
            ];
            break;
    }

    document.getElementById('matrixInput').value = matrixToString(matrix);
}

function matrixToString(matrix) {
    return matrix.map(row => row.map(v => v.toFixed(4)).join(', ')).join('\n');
}

function parseMatrix(str) {
    const rows = str.trim().split('\n');
    return rows.map(row =>
        row.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
    ).filter(row => row.length > 0);
}

function calculate() {
    const method = document.getElementById('method').value;
    const matrixStr = document.getElementById('matrixInput').value;
    const matrix = parseMatrix(matrixStr);

    if (matrix.length === 0) {
        displayError('Please enter a valid matrix');
        return;
    }

    // Check square matrix
    const n = matrix.length;
    for (const row of matrix) {
        if (row.length !== n) {
            displayError('Matrix must be square');
            return;
        }
    }

    const tolerance = parseFloat(document.getElementById('tolerance').value) || 1e-10;
    const maxIterations = parseInt(document.getElementById('maxIterations').value) || 1000;
    const shift = parseFloat(document.getElementById('shift').value) || 0;

    showProgress();

    worker.postMessage({
        type: method,
        data: { matrix, tolerance, maxIterations, shift, initialVector: null }
    });
}

function showProgress() {
    document.getElementById('progress').style.display = 'block';
    document.getElementById('calculateBtn').disabled = true;
    updateProgress(0);
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
    document.getElementById('calculateBtn').disabled = false;
}

function updateProgress(percentage) {
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Processing... ${percentage}%`;
}

function displayResult(methodType, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card">
            <h3>Eigenvalue Solution</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.method}</div>
                <div class="method-info">${result.description || ''}</div>
            </div>
    `;

    // Stats
    html += '<div class="stat-grid">';
    html += `<div class="stat-item"><span class="stat-label">Matrix Size</span><span class="stat-value">${result.matrixSize}×${result.matrixSize}</span></div>`;

    if (result.iterations) {
        html += `<div class="stat-item"><span class="stat-label">Iterations</span><span class="stat-value">${result.iterations}</span></div>`;
    }

    if (result.converged !== undefined) {
        html += `<div class="stat-item ${result.converged ? 'highlight' : 'warning'}"><span class="stat-label">Converged</span><span class="stat-value">${result.converged ? 'Yes' : 'No'}</span></div>`;
    }

    html += '</div>';

    if (methodType === 'compare') {
        html += displayComparison(result);
    } else if (result.eigenvalues) {
        html += displayMultipleEigenvalues(result);
    } else {
        html += displaySingleEigenvalue(result);
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw visualization
    if (result.convergenceHistory) {
        setTimeout(() => drawConvergenceChart(result.convergenceHistory), 100);
    }
}

function displaySingleEigenvalue(result) {
    let html = `
        <h4>Dominant Eigenvalue</h4>
        <div class="eigenvalue-box">
            <span class="eigenvalue-label">λ =</span>
            <span class="eigenvalue-value">${formatNumber(result.eigenvalue)}</span>
        </div>
    `;

    if (result.eigenvector) {
        html += '<h4>Corresponding Eigenvector</h4>';
        html += '<div class="vector-display">[';
        html += result.eigenvector.map(v => formatNumber(v)).join(', ');
        html += ']</div>';
    }

    if (result.convergenceHistory) {
        html += '<h4>Convergence History</h4>';
        html += '<div class="chart-container"><canvas id="convergenceChart" width="800" height="250"></canvas></div>';
    }

    return html;
}

function displayMultipleEigenvalues(result) {
    let html = '<h4>All Eigenvalues</h4>';
    html += '<div class="eigenvalues-list">';

    result.eigenvalues.forEach((lambda, i) => {
        html += `
            <div class="eigenvalue-item">
                <span class="eigenvalue-index">λ${i+1}</span>
                <span class="eigenvalue-value">${formatNumber(lambda)}</span>
            </div>
        `;
    });

    html += '</div>';

    if (result.eigenvectors) {
        html += '<h4>Eigenvectors</h4>';
        html += '<div class="table-container"><table class="method-table">';
        html += '<tr><th>Index</th><th>Eigenvalue</th><th>Eigenvector</th></tr>';

        for (let i = 0; i < result.eigenvalues.length; i++) {
            html += `<tr>
                <td>v${i+1}</td>
                <td>${formatNumber(result.eigenvalues[i])}</td>
                <td>[${result.eigenvectors[i].map(v => formatNumber(v)).join(', ')}]</td>
            </tr>`;
        }
        html += '</table></div>';
    }

    return html;
}

function displayComparison(result) {
    let html = '<h4>Method Comparison</h4>';
    html += '<table class="method-table">';
    html += '<tr><th>Method</th><th>Eigenvalue(s)</th><th>Iterations</th></tr>';

    const methods = ['power', 'inverse', 'qr', 'jacobi', 'rayleigh'];
    for (const m of methods) {
        const data = result.results[m];
        if (data) {
            let eigenStr;
            if (data.eigenvalues) {
                eigenStr = data.eigenvalues.slice(0, 3).map(v => formatNumber(v)).join(', ');
                if (data.eigenvalues.length > 3) eigenStr += '...';
            } else {
                eigenStr = formatNumber(data.eigenvalue);
            }
            html += `<tr>
                <td>${data.method}</td>
                <td>${eigenStr}</td>
                <td>${data.iterations}</td>
            </tr>`;
        }
    }

    html += '</table>';
    return html;
}

function drawConvergenceChart(history) {
    const canvas = document.getElementById('convergenceChart');
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    // Extract errors (use log scale)
    const errors = history.map(h => Math.max(h.error, 1e-16));
    const logErrors = errors.map(e => Math.log10(e));

    const minLog = Math.min(...logErrors);
    const maxLog = Math.max(...logErrors);
    const rangeLog = maxLog - minLog || 1;

    const scaleX = (i) => padding + (i / (history.length - 1)) * (width - 2 * padding);
    const scaleY = (log) => height - padding - ((log - minLog) / rangeLog) * (height - 2 * padding);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * (height - 2 * padding);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // Draw error curve
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(logErrors[0]));
    for (let i = 1; i < logErrors.length; i++) {
        ctx.lineTo(scaleX(i), scaleY(logErrors[i]));
    }
    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#d35400';
    for (let i = 0; i < logErrors.length; i++) {
        ctx.beginPath();
        ctx.arc(scaleX(i), scaleY(logErrors[i]), 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Iteration', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('log₁₀(Error)', 0, 0);
    ctx.restore();

    ctx.font = 'bold 14px Arial';
    ctx.fillText('Convergence History', width / 2, 20);
}

function displayError(message) {
    document.getElementById('results').innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    if (Math.abs(num) < 1e-10) return '0';
    if (Math.abs(num) < 0.0001 || Math.abs(num) >= 10000) {
        return num.toExponential(4);
    }
    return num.toFixed(6);
}

function updateOptions() {
    const method = document.getElementById('method').value;
    const shiftGroup = document.getElementById('shiftGroup');
    shiftGroup.style.display = method === 'inversePower' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    loadSample('symmetric');
    updateOptions();
});
