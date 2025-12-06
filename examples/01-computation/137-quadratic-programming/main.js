// Quadratic Programming - Main Thread

const problemSelect = document.getElementById('problemSelect');
const customProblem = document.getElementById('customProblem');
const problemDescription = document.getElementById('problemDescription');
const maxIterInput = document.getElementById('maxIter');
const toleranceInput = document.getElementById('tolerance');

const solveBtn = document.getElementById('solveBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const optX1 = document.getElementById('optX1');
const optX2 = document.getElementById('optX2');
const optValue = document.getElementById('optValue');
const iterationsEl = document.getElementById('iterations');
const activeConstraintsEl = document.getElementById('activeConstraints');
const gradNormEl = document.getElementById('gradNorm');
const kktResidualEl = document.getElementById('kktResidual');
const iterationHistory = document.getElementById('iterationHistory');

const qpCanvas = document.getElementById('qpCanvas');
const qpCtx = qpCanvas.getContext('2d');

let worker = null;

const problems = {
    portfolio: {
        name: 'Portfolio Optimization',
        description: `Minimize: f(x) = x₁² + x₂² - x₁ - x₂ (risk - return)

Subject to:
  x₁ + x₂ ≤ 1      (budget constraint)
  -x₁ ≤ 0          (no short selling)
  -x₂ ≤ 0          (no short selling)

Q = [2, 0; 0, 2], c = [-1, -1]`,
        Q: [[2, 0], [0, 2]],
        c: [-1, -1],
        A: [[1, 1], [-1, 0], [0, -1]],
        b: [1, 0, 0]
    },
    svm: {
        name: 'SVM-like Problem',
        description: `Minimize: f(x) = x₁² + x₂² + 0.5x₁x₂

Subject to:
  x₁ + 2x₂ ≤ 4
  2x₁ + x₂ ≤ 4
  -x₁ ≤ 0
  -x₂ ≤ 0

Q = [2, 0.5; 0.5, 2], c = [0, 0]`,
        Q: [[2, 0.5], [0.5, 2]],
        c: [0, 0],
        A: [[1, 2], [2, 1], [-1, 0], [0, -1]],
        b: [4, 4, 0, 0]
    },
    leastSquares: {
        name: 'Constrained Least Squares',
        description: `Minimize: f(x) = (x₁-2)² + (x₂-2)²

Subject to:
  x₁ + x₂ ≤ 3
  x₁ - x₂ ≤ 1
  -x₁ + x₂ ≤ 1
  -x₁ ≤ 0
  -x₂ ≤ 0

Q = [2, 0; 0, 2], c = [-4, -4]`,
        Q: [[2, 0], [0, 2]],
        c: [-4, -4],
        A: [[1, 1], [1, -1], [-1, 1], [-1, 0], [0, -1]],
        b: [3, 1, 1, 0, 0]
    }
};

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'progress') updateProgress(data);
        else if (data.type === 'result') showResult(data);
    };
}

function updateProgress(data) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = data.percent + '%';
    progressText.textContent = `Iteration ${data.iteration} | Objective: ${data.objective.toFixed(4)}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    statusEl.textContent = data.status === 'optimal' ? 'Optimal' :
                           data.status === 'infeasible' ? 'Infeasible' : 'Max Iterations';
    statusEl.style.color = data.status === 'optimal' ? '#34d399' : '#ef4444';

    if (data.solution) {
        optX1.textContent = data.solution[0].toFixed(6);
        optX2.textContent = data.solution[1].toFixed(6);
        optValue.textContent = data.optimalValue.toFixed(6);
    } else {
        optX1.textContent = '-';
        optX2.textContent = '-';
        optValue.textContent = '-';
    }

    iterationsEl.textContent = data.iterations;
    activeConstraintsEl.textContent = data.activeSet ? data.activeSet.length : '-';
    gradNormEl.textContent = data.gradNorm !== null ? data.gradNorm.toExponential(2) : '-';
    kktResidualEl.textContent = data.kktResidual !== null ? data.kktResidual.toExponential(2) : '-';

    drawVisualization(data);
    renderIterationHistory(data.history);
}

function drawVisualization(data) {
    const { problem, solution, path } = data;
    const { Q, c, A, b } = problem;
    const w = qpCanvas.width, h = qpCanvas.height, p = 50;
    const pw = w - p * 2, ph = h - p * 2;

    qpCtx.fillStyle = '#0a0f1a';
    qpCtx.fillRect(0, 0, w, h);

    // Determine plot bounds
    let maxX = 5, maxY = 5;
    if (solution) {
        maxX = Math.max(maxX, Math.abs(solution[0]) * 1.5);
        maxY = Math.max(maxY, Math.abs(solution[1]) * 1.5);
    }
    for (const pt of path || []) {
        maxX = Math.max(maxX, Math.abs(pt[0]) * 1.2);
        maxY = Math.max(maxY, Math.abs(pt[1]) * 1.2);
    }
    maxX = Math.ceil(maxX);
    maxY = Math.ceil(maxY);

    const mapX = x => p + ((x + maxX) / (2 * maxX)) * pw;
    const mapY = y => h - p - ((y + maxY) / (2 * maxY)) * ph;

    // Grid
    qpCtx.strokeStyle = '#1a2530';
    qpCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        qpCtx.beginPath();
        qpCtx.moveTo(p + i / 10 * pw, p);
        qpCtx.lineTo(p + i / 10 * pw, h - p);
        qpCtx.stroke();
        qpCtx.beginPath();
        qpCtx.moveTo(p, p + i / 10 * ph);
        qpCtx.lineTo(w - p, p + i / 10 * ph);
        qpCtx.stroke();
    }

    // Axes
    qpCtx.strokeStyle = '#3b5068';
    qpCtx.lineWidth = 2;
    qpCtx.beginPath();
    qpCtx.moveTo(mapX(-maxX), mapY(0));
    qpCtx.lineTo(mapX(maxX), mapY(0));
    qpCtx.stroke();
    qpCtx.beginPath();
    qpCtx.moveTo(mapX(0), mapY(-maxY));
    qpCtx.lineTo(mapX(0), mapY(maxY));
    qpCtx.stroke();

    // Axes labels
    qpCtx.fillStyle = '#6b8fa8';
    qpCtx.font = '10px monospace';
    qpCtx.textAlign = 'center';
    for (let i = -Math.floor(maxX); i <= Math.floor(maxX); i += Math.ceil(maxX / 3)) {
        if (i !== 0) qpCtx.fillText(i.toString(), mapX(i), mapY(0) + 15);
    }
    qpCtx.textAlign = 'right';
    for (let i = -Math.floor(maxY); i <= Math.floor(maxY); i += Math.ceil(maxY / 3)) {
        if (i !== 0) qpCtx.fillText(i.toString(), mapX(0) - 5, mapY(i) + 3);
    }
    qpCtx.textAlign = 'center';
    qpCtx.fillText('x₁', w - 25, mapY(0) + 15);
    qpCtx.fillText('x₂', mapX(0) + 15, 25);

    // Draw constraint lines
    const colors = ['#f472b6', '#fbbf24', '#a78bfa', '#4ade80', '#38bdf8'];
    for (let i = 0; i < A.length; i++) {
        const [a1, a2] = A[i];
        const bi = b[i];

        qpCtx.strokeStyle = colors[i % colors.length];
        qpCtx.lineWidth = 1.5;
        qpCtx.setLineDash([5, 5]);
        qpCtx.beginPath();

        if (Math.abs(a2) > 1e-10) {
            const y0 = (bi - a1 * (-maxX)) / a2;
            const y1 = (bi - a1 * maxX) / a2;
            qpCtx.moveTo(mapX(-maxX), mapY(y0));
            qpCtx.lineTo(mapX(maxX), mapY(y1));
        } else if (Math.abs(a1) > 1e-10) {
            const x = bi / a1;
            qpCtx.moveTo(mapX(x), mapY(-maxY));
            qpCtx.lineTo(mapX(x), mapY(maxY));
        }
        qpCtx.stroke();
    }
    qpCtx.setLineDash([]);

    // Draw contours of objective function
    drawContours(qpCtx, Q, c, mapX, mapY, maxX, maxY, solution);

    // Draw optimization path
    if (path && path.length > 1) {
        qpCtx.strokeStyle = '#60a5fa';
        qpCtx.lineWidth = 2;
        qpCtx.beginPath();
        qpCtx.moveTo(mapX(path[0][0]), mapY(path[0][1]));
        for (let i = 1; i < path.length; i++) {
            qpCtx.lineTo(mapX(path[i][0]), mapY(path[i][1]));
        }
        qpCtx.stroke();

        // Path points
        for (let i = 0; i < path.length; i++) {
            const alpha = 0.3 + 0.7 * (i / path.length);
            qpCtx.fillStyle = `rgba(96, 165, 250, ${alpha})`;
            qpCtx.beginPath();
            qpCtx.arc(mapX(path[i][0]), mapY(path[i][1]), 4, 0, Math.PI * 2);
            qpCtx.fill();
        }
    }

    // Draw optimal solution
    if (solution) {
        qpCtx.fillStyle = '#34d399';
        qpCtx.beginPath();
        qpCtx.arc(mapX(solution[0]), mapY(solution[1]), 10, 0, Math.PI * 2);
        qpCtx.fill();
        qpCtx.strokeStyle = '#fff';
        qpCtx.lineWidth = 2;
        qpCtx.stroke();

        qpCtx.fillStyle = '#fff';
        qpCtx.font = '10px sans-serif';
        qpCtx.textAlign = 'left';
        qpCtx.fillText(`(${solution[0].toFixed(2)}, ${solution[1].toFixed(2)})`,
            mapX(solution[0]) + 12, mapY(solution[1]) - 5);
    }

    // Border
    qpCtx.strokeStyle = '#2a4a6a';
    qpCtx.lineWidth = 2;
    qpCtx.strokeRect(p, p, pw, ph);

    // Legend
    qpCtx.font = '9px sans-serif';
    const legendY = h - 20;
    const legendItems = [
        { color: '#60a5fa', label: 'Path' },
        { color: '#34d399', label: 'Optimal' }
    ];
    let legendX = 20;
    for (const item of legendItems) {
        qpCtx.fillStyle = item.color;
        qpCtx.beginPath();
        qpCtx.arc(legendX, legendY, 5, 0, Math.PI * 2);
        qpCtx.fill();
        qpCtx.fillStyle = '#93c5fd';
        qpCtx.textAlign = 'left';
        qpCtx.fillText(item.label, legendX + 8, legendY + 3);
        legendX += 60;
    }
}

function drawContours(ctx, Q, c, mapX, mapY, maxX, maxY, solution) {
    // Draw objective function contours
    const levels = 10;
    let minVal = 0, maxVal = 10;

    if (solution) {
        const optVal = 0.5 * (solution[0] * (Q[0][0] * solution[0] + Q[0][1] * solution[1]) +
                              solution[1] * (Q[1][0] * solution[0] + Q[1][1] * solution[1])) +
                       c[0] * solution[0] + c[1] * solution[1];
        minVal = optVal;
        maxVal = optVal + 5;
    }

    ctx.globalAlpha = 0.3;
    for (let level = 0; level < levels; level++) {
        const targetVal = minVal + (level / levels) * (maxVal - minVal);

        ctx.strokeStyle = `hsl(${200 + level * 10}, 70%, 50%)`;
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Sample contour points
        const pts = [];
        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
            // For f(x) = val, solve for radius
            // Simplified: assume roughly circular contours near optimum
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            // Binary search for radius
            let lo = 0, hi = maxX * 2;
            for (let iter = 0; iter < 20; iter++) {
                const mid = (lo + hi) / 2;
                const x = (solution ? solution[0] : 0) + mid * dx;
                const y = (solution ? solution[1] : 0) + mid * dy;
                const val = 0.5 * (x * (Q[0][0] * x + Q[0][1] * y) +
                                   y * (Q[1][0] * x + Q[1][1] * y)) +
                           c[0] * x + c[1] * y;
                if (val < targetVal) lo = mid;
                else hi = mid;
            }

            const r = (lo + hi) / 2;
            const x = (solution ? solution[0] : 0) + r * dx;
            const y = (solution ? solution[1] : 0) + r * dy;
            pts.push([x, y]);
        }

        if (pts.length > 0) {
            ctx.moveTo(mapX(pts[0][0]), mapY(pts[0][1]));
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(mapX(pts[i][0]), mapY(pts[i][1]));
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1.0;
}

function renderIterationHistory(history) {
    if (!history || history.length === 0) {
        iterationHistory.innerHTML = '<p style="color: #6b8fa8; text-align: center;">No iteration data</p>';
        return;
    }

    let html = '<table><tr><th>Iter</th><th>x₁</th><th>x₂</th><th>Objective</th><th>|∇f|</th><th>Active</th></tr>';

    const showCount = Math.min(history.length, 20);
    const step = Math.max(1, Math.floor(history.length / showCount));

    for (let i = 0; i < history.length; i += step) {
        const h = history[i];
        html += `<tr>
            <td>${h.iteration}</td>
            <td>${h.x[0].toFixed(4)}</td>
            <td>${h.x[1].toFixed(4)}</td>
            <td>${h.objective.toFixed(4)}</td>
            <td>${h.gradNorm.toExponential(1)}</td>
            <td>${h.activeSet.length}</td>
        </tr>`;
    }

    // Always show last iteration
    if (history.length > 1 && (history.length - 1) % step !== 0) {
        const h = history[history.length - 1];
        html += `<tr>
            <td>${h.iteration}</td>
            <td>${h.x[0].toFixed(4)}</td>
            <td>${h.x[1].toFixed(4)}</td>
            <td>${h.objective.toFixed(4)}</td>
            <td>${h.gradNorm.toExponential(1)}</td>
            <td>${h.activeSet.length}</td>
        </tr>`;
    }

    html += '</table>';
    iterationHistory.innerHTML = html;
}

function updateProblemDisplay() {
    const selected = problemSelect.value;

    if (selected === 'custom') {
        customProblem.classList.remove('hidden');
        problemDescription.textContent = 'Enter your custom QP problem above.';
    } else {
        customProblem.classList.add('hidden');
        const prob = problems[selected];
        problemDescription.textContent = prob.description;
    }
}

function getCustomProblem() {
    return {
        Q: [
            [parseFloat(document.getElementById('q11').value), parseFloat(document.getElementById('q12').value)],
            [parseFloat(document.getElementById('q21').value), parseFloat(document.getElementById('q22').value)]
        ],
        c: [parseFloat(document.getElementById('c1').value), parseFloat(document.getElementById('c2').value)],
        A: [
            [parseFloat(document.getElementById('a11').value), parseFloat(document.getElementById('a12').value)],
            [parseFloat(document.getElementById('a21').value), parseFloat(document.getElementById('a22').value)],
            [parseFloat(document.getElementById('a31').value), parseFloat(document.getElementById('a32').value)]
        ],
        b: [
            parseFloat(document.getElementById('b1').value),
            parseFloat(document.getElementById('b2').value),
            parseFloat(document.getElementById('b3').value)
        ]
    };
}

function solve() {
    const selected = problemSelect.value;
    const problem = selected === 'custom' ? getCustomProblem() : problems[selected];
    const maxIter = parseInt(maxIterInput.value);
    const tolerance = parseFloat(toleranceInput.value);

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    initWorker();
    worker.postMessage({ problem, maxIter, tolerance });
}

function reset() {
    if (worker) { worker.terminate(); worker = null; }
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    qpCtx.fillStyle = '#0a0f1a';
    qpCtx.fillRect(0, 0, qpCanvas.width, qpCanvas.height);
    qpCtx.fillStyle = '#6b8fa8';
    qpCtx.font = '14px sans-serif';
    qpCtx.textAlign = 'center';
    qpCtx.fillText('Click "Solve QP" to find optimal solution', qpCanvas.width / 2, qpCanvas.height / 2);
}

problemSelect.addEventListener('change', updateProblemDisplay);
solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', reset);

updateProblemDisplay();
reset();
