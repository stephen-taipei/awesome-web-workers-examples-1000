/**
 * Main Thread: PDE Solver
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

function updateOptions() {
    const pdeType = document.getElementById('pdeType').value;
    const groups = ['heat1dGroup', 'heat2dGroup', 'wave1dGroup', 'laplaceGroup', 'poissonGroup', 'advectionGroup'];

    groups.forEach(g => {
        const el = document.getElementById(g);
        if (el) el.style.display = 'none';
    });

    const activeGroup = document.getElementById(pdeType + 'Group');
    if (activeGroup) activeGroup.style.display = 'block';
}

function calculate() {
    const pdeType = document.getElementById('pdeType').value;
    showProgress();

    let data = {};

    switch (pdeType) {
        case 'heat1d':
            data = {
                nx: parseInt(document.getElementById('heat1d_nx').value) || 50,
                nt: parseInt(document.getElementById('heat1d_nt').value) || 1000,
                alpha: parseFloat(document.getElementById('heat1d_alpha').value) || 0.01,
                dx: parseFloat(document.getElementById('heat1d_dx').value) || 0.02,
                dt: parseFloat(document.getElementById('heat1d_dt').value) || 0.01,
                initial: document.getElementById('heat1d_initial').value,
                boundary: document.getElementById('heat1d_boundary').value
            };
            break;
        case 'heat2d':
            data = {
                nx: parseInt(document.getElementById('heat2d_nx').value) || 30,
                ny: parseInt(document.getElementById('heat2d_ny').value) || 30,
                iterations: parseInt(document.getElementById('heat2d_iterations').value) || 500,
                alpha: parseFloat(document.getElementById('heat2d_alpha').value) || 0.1,
                initial: document.getElementById('heat2d_initial').value
            };
            break;
        case 'wave1d':
            data = {
                nx: parseInt(document.getElementById('wave1d_nx').value) || 100,
                nt: parseInt(document.getElementById('wave1d_nt').value) || 500,
                c: parseFloat(document.getElementById('wave1d_c').value) || 1.0,
                dx: parseFloat(document.getElementById('wave1d_dx').value) || 0.01,
                dt: parseFloat(document.getElementById('wave1d_dt').value) || 0.005,
                initial: document.getElementById('wave1d_initial').value,
                initialVelocity: document.getElementById('wave1d_velocity').checked
            };
            break;
        case 'laplace':
            data = {
                nx: parseInt(document.getElementById('laplace_nx').value) || 30,
                ny: parseInt(document.getElementById('laplace_ny').value) || 30,
                boundary: document.getElementById('laplace_boundary').value,
                tolerance: parseFloat(document.getElementById('laplace_tol').value) || 1e-5,
                maxIterations: parseInt(document.getElementById('laplace_maxiter').value) || 5000
            };
            break;
        case 'poisson':
            data = {
                nx: parseInt(document.getElementById('poisson_nx').value) || 30,
                ny: parseInt(document.getElementById('poisson_ny').value) || 30,
                source: document.getElementById('poisson_source').value,
                boundary: 'dirichlet',
                tolerance: parseFloat(document.getElementById('poisson_tol').value) || 1e-5,
                maxIterations: parseInt(document.getElementById('poisson_maxiter').value) || 5000
            };
            break;
        case 'advection':
            data = {
                nx: parseInt(document.getElementById('advection_nx').value) || 100,
                nt: parseInt(document.getElementById('advection_nt').value) || 200,
                velocity: parseFloat(document.getElementById('advection_v').value) || 1.0,
                dx: parseFloat(document.getElementById('advection_dx').value) || 0.01,
                dt: parseFloat(document.getElementById('advection_dt').value) || 0.005,
                initial: document.getElementById('advection_initial').value
            };
            break;
    }

    worker.postMessage({ type: pdeType, data });
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

function displayResult(pdeType, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card">
            <h3>PDE Solution</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">${result.method}</div>
                <div class="method-info">${result.equation}</div>
            </div>
    `;

    if (result.scheme) {
        html += `<div class="formula-box">${result.scheme}</div>`;
    }

    if (result.stability) {
        html += `<div class="stability-info">${result.stability}</div>`;
    }

    // Display stats
    html += '<div class="stat-grid">';

    if (result.nx) html += `<div class="stat-item"><span class="stat-label">Grid X</span><span class="stat-value">${result.nx}</span></div>`;
    if (result.ny) html += `<div class="stat-item"><span class="stat-label">Grid Y</span><span class="stat-value">${result.ny}</span></div>`;
    if (result.nt) html += `<div class="stat-item"><span class="stat-label">Time Steps</span><span class="stat-value">${result.nt}</span></div>`;
    if (result.iterations) html += `<div class="stat-item"><span class="stat-label">Iterations</span><span class="stat-value">${result.iterations}</span></div>`;
    if (result.converged !== undefined) html += `<div class="stat-item ${result.converged ? 'highlight' : 'warning'}"><span class="stat-label">Converged</span><span class="stat-value">${result.converged ? 'Yes' : 'No'}</span></div>`;

    html += '</div>';

    // Add canvas for visualization
    if (pdeType === 'heat2d' || pdeType === 'laplace' || pdeType === 'poisson') {
        html += '<h4>Solution Contour</h4>';
        html += '<div class="chart-container"><canvas id="contourChart" width="500" height="500"></canvas></div>';
    } else {
        html += '<h4>Solution Evolution</h4>';
        html += '<div class="chart-container"><canvas id="evolutionChart" width="800" height="350"></canvas></div>';
    }

    html += '</div>';
    resultsDiv.innerHTML = html;

    // Draw visualization
    setTimeout(() => {
        if (pdeType === 'heat2d' || pdeType === 'laplace' || pdeType === 'poisson') {
            drawContour(result);
        } else {
            drawEvolution(result);
        }
    }, 100);
}

function drawEvolution(result) {
    const canvas = document.getElementById('evolutionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    const snapshots = result.snapshots;
    const nx = result.nx || snapshots[0].length;

    // Find y range
    let minY = Infinity, maxY = -Infinity;
    for (const snap of snapshots) {
        for (const v of snap) {
            minY = Math.min(minY, v);
            maxY = Math.max(maxY, v);
        }
    }
    const rangeY = maxY - minY || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    const scaleX = (i) => padding + (i / (nx - 1)) * (width - 2 * padding);
    const scaleY = (v) => height - padding - ((v - minY) / (maxY - minY)) * (height - 2 * padding);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw y=0 line
    if (minY < 0 && maxY > 0) {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, scaleY(0));
        ctx.lineTo(width - padding, scaleY(0));
        ctx.stroke();
    }

    // Color gradient for time evolution
    const colors = [
        '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'
    ];

    // Draw snapshots
    for (let s = 0; s < snapshots.length; s++) {
        const snap = snapshots[s];
        const color = colors[s % colors.length];
        const alpha = 0.3 + 0.7 * (s / (snapshots.length - 1));

        ctx.strokeStyle = color;
        ctx.lineWidth = s === snapshots.length - 1 ? 3 : 1.5;
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.moveTo(scaleX(0), scaleY(snap[0]));
        for (let i = 1; i < snap.length; i++) {
            ctx.lineTo(scaleX(i), scaleY(snap[i]));
        }
        ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Legend
    ctx.font = '11px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Initial', width - padding - 50, padding + 15);
    ctx.fillStyle = colors[colors.length - 1];
    ctx.fillText('Final', width - padding - 50, padding + 30);

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('x', width / 2, height - 10);

    ctx.font = 'bold 14px Arial';
    ctx.fillText('Solution u(x,t)', width / 2, 20);
}

function drawContour(result) {
    const canvas = document.getElementById('contourChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const padding = 50;

    ctx.clearRect(0, 0, size, size);

    const u = result.solution || result.finalSolution;
    const nx = u.length;
    const ny = u[0].length;

    // Find value range
    let minU = Infinity, maxU = -Infinity;
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            minU = Math.min(minU, u[i][j]);
            maxU = Math.max(maxU, u[i][j]);
        }
    }
    const rangeU = maxU - minU || 1;

    const cellWidth = (size - 2 * padding) / nx;
    const cellHeight = (size - 2 * padding) / ny;

    // Draw heatmap
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const value = (u[i][j] - minU) / rangeU;
            ctx.fillStyle = getHeatColor(value);
            ctx.fillRect(
                padding + i * cellWidth,
                padding + (ny - 1 - j) * cellHeight,
                cellWidth + 1,
                cellHeight + 1
            );
        }
    }

    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, size - 2 * padding, size - 2 * padding);

    // Color bar
    const barWidth = 20;
    const barHeight = size - 2 * padding;
    const barX = size - padding + 10;

    for (let i = 0; i < barHeight; i++) {
        const value = 1 - i / barHeight;
        ctx.fillStyle = getHeatColor(value);
        ctx.fillRect(barX, padding + i, barWidth, 1);
    }

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, padding, barWidth, barHeight);

    // Color bar labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(maxU.toFixed(2), barX + barWidth + 5, padding + 10);
    ctx.fillText(minU.toFixed(2), barX + barWidth + 5, padding + barHeight);

    // Title
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Solution u(x,y)', size / 2, 20);
}

function getHeatColor(value) {
    // Blue -> Cyan -> Green -> Yellow -> Red
    const r = Math.min(255, Math.floor(255 * Math.min(1, 2 * value)));
    const g = Math.min(255, Math.floor(255 * (value < 0.5 ? 2 * value : 2 * (1 - value))));
    const b = Math.min(255, Math.floor(255 * Math.max(0, 1 - 2 * value)));
    return `rgb(${r},${g},${b})`;
}

function displayError(message) {
    document.getElementById('results').innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    updateOptions();
});
