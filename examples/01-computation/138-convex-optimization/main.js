// Convex Optimization - Main Thread

const problemSelect = document.getElementById('problemSelect');
const customProblem = document.getElementById('customProblem');
const problemDescription = document.getElementById('problemDescription');
const muInput = document.getElementById('mu');
const toleranceInput = document.getElementById('tolerance');
const maxOuterInput = document.getElementById('maxOuter');
const maxInnerInput = document.getElementById('maxInner');

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
const outerIterEl = document.getElementById('outerIter');
const newtonStepsEl = document.getElementById('newtonSteps');
const finalTEl = document.getElementById('finalT');
const dualityGapEl = document.getElementById('dualityGap');
const barrierHistory = document.getElementById('barrierHistory');

const convexCanvas = document.getElementById('convexCanvas');
const convexCtx = convexCanvas.getContext('2d');

let worker = null;

const problems = {
    quadratic: {
        name: 'Quadratic with Linear Constraints',
        description: `Minimize: f(x) = x₁² + x₂² - 2x₁ - 2x₂

Subject to:
  x₁ + x₂ ≤ 3
  -x₁ ≤ 0
  -x₂ ≤ 0

Optimal at x* = (1, 1) with f* = -2`,
        objective: {
            type: 'quadratic',
            Q: [[2, 0], [0, 2]],
            c: [-2, -2]
        },
        constraints: [
            { a: [1, 1], b: 3 },
            { a: [-1, 0], b: 0 },
            { a: [0, -1], b: 0 }
        ],
        initial: [0.5, 0.5]
    },
    logistic: {
        name: 'Log-Sum-Exp',
        description: `Minimize: f(x) = log(exp(x₁) + exp(x₂) + exp(-x₁-x₂))

Subject to:
  x₁ + 2x₂ ≤ 4
  2x₁ + x₂ ≤ 4
  -x₁ ≤ 1
  -x₂ ≤ 1

A smooth approximation to max function`,
        objective: {
            type: 'logsumexp',
            A: [[1, 0], [0, 1], [-1, -1]],
            b: [0, 0, 0]
        },
        constraints: [
            { a: [1, 2], b: 4 },
            { a: [2, 1], b: 4 },
            { a: [-1, 0], b: 1 },
            { a: [0, -1], b: 1 }
        ],
        initial: [0.5, 0.5]
    },
    geometric: {
        name: 'Geometric Programming',
        description: `Minimize: f(x) = (x₁-2)² + (x₂-2)²

Subject to:
  x₁ + x₂ ≤ 2.5
  x₁ - x₂ ≤ 1
  -x₁ + x₂ ≤ 1
  -x₁ ≤ 0
  -x₂ ≤ 0

Find closest feasible point to (2,2)`,
        objective: {
            type: 'quadratic',
            Q: [[2, 0], [0, 2]],
            c: [-4, -4],
            target: [2, 2]
        },
        constraints: [
            { a: [1, 1], b: 2.5 },
            { a: [1, -1], b: 1 },
            { a: [-1, 1], b: 1 },
            { a: [-1, 0], b: 0 },
            { a: [0, -1], b: 0 }
        ],
        initial: [0.5, 0.5]
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
    progressText.textContent = `Outer ${data.iteration} | Objective: ${data.objective.toFixed(4)} | Gap: ${data.dualityGap.toExponential(2)}`;
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

    outerIterEl.textContent = data.outerIterations;
    newtonStepsEl.textContent = data.newtonSteps;
    finalTEl.textContent = data.finalT.toExponential(2);
    dualityGapEl.textContent = data.dualityGap !== null ? data.dualityGap.toExponential(2) : '-';

    drawVisualization(data);
    renderBarrierHistory(data.history);
}

function drawVisualization(data) {
    const { problem, solution, path } = data;
    const { constraints } = problem;
    const w = convexCanvas.width, h = convexCanvas.height, p = 50;
    const pw = w - p * 2, ph = h - p * 2;

    convexCtx.fillStyle = '#0f0a1a';
    convexCtx.fillRect(0, 0, w, h);

    // Determine plot bounds
    let minX = -0.5, maxX = 4, minY = -0.5, maxY = 4;
    if (path) {
        for (const pt of path) {
            minX = Math.min(minX, pt[0] - 0.5);
            maxX = Math.max(maxX, pt[0] + 0.5);
            minY = Math.min(minY, pt[1] - 0.5);
            maxY = Math.max(maxY, pt[1] + 0.5);
        }
    }

    const mapX = x => p + ((x - minX) / (maxX - minX)) * pw;
    const mapY = y => h - p - ((y - minY) / (maxY - minY)) * ph;

    // Grid
    convexCtx.strokeStyle = '#1a1525';
    convexCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        convexCtx.beginPath();
        convexCtx.moveTo(p + i / 10 * pw, p);
        convexCtx.lineTo(p + i / 10 * pw, h - p);
        convexCtx.stroke();
        convexCtx.beginPath();
        convexCtx.moveTo(p, p + i / 10 * ph);
        convexCtx.lineTo(w - p, p + i / 10 * ph);
        convexCtx.stroke();
    }

    // Axes
    if (minX < 0 && maxX > 0) {
        convexCtx.strokeStyle = '#4a3a5a';
        convexCtx.lineWidth = 2;
        convexCtx.beginPath();
        convexCtx.moveTo(mapX(0), p);
        convexCtx.lineTo(mapX(0), h - p);
        convexCtx.stroke();
    }
    if (minY < 0 && maxY > 0) {
        convexCtx.beginPath();
        convexCtx.moveTo(p, mapY(0));
        convexCtx.lineTo(w - p, mapY(0));
        convexCtx.stroke();
    }

    // Axes labels
    convexCtx.fillStyle = '#8a7a9a';
    convexCtx.font = '10px monospace';
    convexCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        const xVal = (minX + i / 4 * (maxX - minX)).toFixed(1);
        const yVal = (minY + i / 4 * (maxY - minY)).toFixed(1);
        convexCtx.fillText(xVal, p + i / 4 * pw, h - p + 15);
        convexCtx.textAlign = 'right';
        convexCtx.fillText(yVal, p - 5, h - p - i / 4 * ph + 3);
        convexCtx.textAlign = 'center';
    }
    convexCtx.fillText('x₁', w - 25, mapY(0) + 15);
    convexCtx.fillText('x₂', mapX(0) + 15, 25);

    // Draw constraint boundaries
    const colors = ['#f472b6', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa'];
    for (let i = 0; i < constraints.length; i++) {
        const { a, b: bi } = constraints[i];

        convexCtx.strokeStyle = colors[i % colors.length];
        convexCtx.lineWidth = 1.5;
        convexCtx.setLineDash([5, 5]);
        convexCtx.beginPath();

        if (Math.abs(a[1]) > 1e-10) {
            const y0 = (bi - a[0] * minX) / a[1];
            const y1 = (bi - a[0] * maxX) / a[1];
            convexCtx.moveTo(mapX(minX), mapY(y0));
            convexCtx.lineTo(mapX(maxX), mapY(y1));
        } else if (Math.abs(a[0]) > 1e-10) {
            const x = bi / a[0];
            convexCtx.moveTo(mapX(x), mapY(minY));
            convexCtx.lineTo(mapX(x), mapY(maxY));
        }
        convexCtx.stroke();
    }
    convexCtx.setLineDash([]);

    // Draw contours of objective (simplified)
    drawContours(convexCtx, problem.objective, mapX, mapY, minX, maxX, minY, maxY, solution);

    // Draw feasible region (approximate by shading)
    drawFeasibleRegion(convexCtx, constraints, mapX, mapY, minX, maxX, minY, maxY);

    // Draw optimization path (central path)
    if (path && path.length > 1) {
        // Path gradient from yellow to green
        for (let i = 0; i < path.length - 1; i++) {
            const t = i / (path.length - 1);
            const r = Math.round(245 * (1 - t) + 52 * t);
            const g = Math.round(158 * (1 - t) + 211 * t);
            const b = Math.round(11 * (1 - t) + 153 * t);

            convexCtx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            convexCtx.lineWidth = 2;
            convexCtx.beginPath();
            convexCtx.moveTo(mapX(path[i][0]), mapY(path[i][1]));
            convexCtx.lineTo(mapX(path[i + 1][0]), mapY(path[i + 1][1]));
            convexCtx.stroke();
        }

        // Path points
        for (let i = 0; i < path.length; i++) {
            const t = i / (path.length - 1);
            convexCtx.fillStyle = `rgba(245, 158, 11, ${0.3 + 0.7 * t})`;
            convexCtx.beginPath();
            convexCtx.arc(mapX(path[i][0]), mapY(path[i][1]), 3, 0, Math.PI * 2);
            convexCtx.fill();
        }
    }

    // Draw optimal solution
    if (solution) {
        convexCtx.fillStyle = '#34d399';
        convexCtx.beginPath();
        convexCtx.arc(mapX(solution[0]), mapY(solution[1]), 10, 0, Math.PI * 2);
        convexCtx.fill();
        convexCtx.strokeStyle = '#fff';
        convexCtx.lineWidth = 2;
        convexCtx.stroke();

        convexCtx.fillStyle = '#fff';
        convexCtx.font = '10px sans-serif';
        convexCtx.textAlign = 'left';
        convexCtx.fillText(`(${solution[0].toFixed(3)}, ${solution[1].toFixed(3)})`,
            mapX(solution[0]) + 12, mapY(solution[1]) - 5);
    }

    // Border
    convexCtx.strokeStyle = '#3a2a4a';
    convexCtx.lineWidth = 2;
    convexCtx.strokeRect(p, p, pw, ph);

    // Legend
    convexCtx.font = '9px sans-serif';
    const legendY = h - 20;
    const legendItems = [
        { color: '#f59e0b', label: 'Central Path' },
        { color: '#34d399', label: 'Optimal' }
    ];
    let legendX = 20;
    for (const item of legendItems) {
        convexCtx.fillStyle = item.color;
        convexCtx.beginPath();
        convexCtx.arc(legendX, legendY, 5, 0, Math.PI * 2);
        convexCtx.fill();
        convexCtx.fillStyle = '#fbbf24';
        convexCtx.textAlign = 'left';
        convexCtx.fillText(item.label, legendX + 8, legendY + 3);
        legendX += 80;
    }
}

function drawContours(ctx, objective, mapX, mapY, minX, maxX, minY, maxY, solution) {
    ctx.globalAlpha = 0.2;

    const levels = 8;
    let centerX = solution ? solution[0] : (minX + maxX) / 2;
    let centerY = solution ? solution[1] : (minY + maxY) / 2;

    for (let level = 1; level <= levels; level++) {
        const radius = level * 0.3;

        ctx.strokeStyle = `hsl(${30 + level * 5}, 70%, 50%)`;
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (angle === 0) {
                ctx.moveTo(mapX(x), mapY(y));
            } else {
                ctx.lineTo(mapX(x), mapY(y));
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
}

function drawFeasibleRegion(ctx, constraints, mapX, mapY, minX, maxX, minY, maxY) {
    // Sample points and check feasibility
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';

    const step = (maxX - minX) / 50;
    for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
            let feasible = true;
            for (const c of constraints) {
                if (c.a[0] * x + c.a[1] * y > c.b + 1e-6) {
                    feasible = false;
                    break;
                }
            }
            if (feasible) {
                ctx.fillRect(mapX(x) - step / 2, mapY(y) - step / 2, step * 3, step * 3);
            }
        }
    }
}

function renderBarrierHistory(history) {
    if (!history || history.length === 0) {
        barrierHistory.innerHTML = '<p style="color: #8a7a9a; text-align: center;">No iteration data</p>';
        return;
    }

    let html = '<table><tr><th>Outer</th><th>t</th><th>Objective</th><th>Gap</th><th>Newton</th></tr>';

    for (const h of history) {
        html += `<tr>
            <td>${h.outer}</td>
            <td>${h.t.toExponential(1)}</td>
            <td>${h.objective.toFixed(4)}</td>
            <td>${h.dualityGap.toExponential(1)}</td>
            <td>${h.newtonSteps}</td>
        </tr>`;
    }

    html += '</table>';
    barrierHistory.innerHTML = html;
}

function updateProblemDisplay() {
    const selected = problemSelect.value;

    if (selected === 'custom') {
        customProblem.classList.remove('hidden');
        problemDescription.textContent = 'Enter your custom convex optimization problem above.';
    } else {
        customProblem.classList.add('hidden');
        const prob = problems[selected];
        problemDescription.textContent = prob.description;
    }
}

function getCustomProblem() {
    const targetX = parseFloat(document.getElementById('targetX').value);
    const targetY = parseFloat(document.getElementById('targetY').value);

    return {
        objective: {
            type: 'quadratic',
            Q: [[2, 0], [0, 2]],
            c: [-2 * targetX, -2 * targetY],
            target: [targetX, targetY]
        },
        constraints: [
            { a: [parseFloat(document.getElementById('a11').value), parseFloat(document.getElementById('a12').value)],
              b: parseFloat(document.getElementById('b1').value) },
            { a: [parseFloat(document.getElementById('a21').value), parseFloat(document.getElementById('a22').value)],
              b: parseFloat(document.getElementById('b2').value) },
            { a: [parseFloat(document.getElementById('a31').value), parseFloat(document.getElementById('a32').value)],
              b: parseFloat(document.getElementById('b3').value) }
        ],
        initial: [0.5, 0.5]
    };
}

function solve() {
    const selected = problemSelect.value;
    const problem = selected === 'custom' ? getCustomProblem() : problems[selected];
    const mu = parseFloat(muInput.value);
    const tolerance = parseFloat(toleranceInput.value);
    const maxOuter = parseInt(maxOuterInput.value);
    const maxInner = parseInt(maxInnerInput.value);

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    initWorker();
    worker.postMessage({ problem, mu, tolerance, maxOuter, maxInner });
}

function reset() {
    if (worker) { worker.terminate(); worker = null; }
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    convexCtx.fillStyle = '#0f0a1a';
    convexCtx.fillRect(0, 0, convexCanvas.width, convexCanvas.height);
    convexCtx.fillStyle = '#8a7a9a';
    convexCtx.font = '14px sans-serif';
    convexCtx.textAlign = 'center';
    convexCtx.fillText('Click "Solve" to find optimal solution via Interior Point Method', convexCanvas.width / 2, convexCanvas.height / 2);
}

problemSelect.addEventListener('change', updateProblemDisplay);
solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', reset);

updateProblemDisplay();
reset();
