// Nonlinear Programming - Main Thread

const problemSelect = document.getElementById('problemSelect');
const problemDescription = document.getElementById('problemDescription');
const maxIterInput = document.getElementById('maxIter');
const toleranceInput = document.getElementById('tolerance');
const penaltyInitInput = document.getElementById('penaltyInit');
const hessianUpdateSelect = document.getElementById('hessianUpdate');

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
const qpSolvesEl = document.getElementById('qpSolves');
const constraintViolEl = document.getElementById('constraintViol');
const kktResidualEl = document.getElementById('kktResidual');
const convergenceHistory = document.getElementById('convergenceHistory');

const nlpCanvas = document.getElementById('nlpCanvas');
const nlpCtx = nlpCanvas.getContext('2d');

let worker = null;

// Problem definitions with eval and grad functions (serialized)
const problems = {
    rosenbrock: {
        name: 'Constrained Rosenbrock',
        description: `Minimize: f(x) = (1-x₁)² + 100(x₂-x₁²)²

Subject to:
  x₁² + x₂² ≤ 2    (circle constraint)
  x₁ + x₂ ≥ 0      (linear constraint)

Optimal near x* ≈ (0.786, 0.618)`,
        objective: {
            evalStr: '(1-x[0])*(1-x[0]) + 100*(x[1]-x[0]*x[0])*(x[1]-x[0]*x[0])',
            gradStr: '[-2*(1-x[0]) - 400*x[0]*(x[1]-x[0]*x[0]), 200*(x[1]-x[0]*x[0])]'
        },
        equalityConstraints: [],
        inequalityConstraints: [
            { evalStr: 'x[0]*x[0] + x[1]*x[1] - 2', gradStr: '[2*x[0], 2*x[1]]' },
            { evalStr: '-x[0] - x[1]', gradStr: '[-1, -1]' }
        ],
        initial: [0.5, 0.5],
        bounds: { lower: [-2, -2], upper: [2, 2] },
        plotBounds: { xMin: -1.5, xMax: 2, yMin: -1, yMax: 2 }
    },
    himmelblau: {
        name: 'Constrained Himmelblau',
        description: `Minimize: f(x) = (x₁² + x₂ - 11)² + (x₁ + x₂² - 7)²

Subject to:
  x₁ + x₂ ≤ 6
  x₁² + x₂² ≤ 25
  x₁ ≥ 0, x₂ ≥ 0

Has multiple local minima`,
        objective: {
            evalStr: 'Math.pow(x[0]*x[0]+x[1]-11, 2) + Math.pow(x[0]+x[1]*x[1]-7, 2)',
            gradStr: '[4*x[0]*(x[0]*x[0]+x[1]-11) + 2*(x[0]+x[1]*x[1]-7), 2*(x[0]*x[0]+x[1]-11) + 4*x[1]*(x[0]+x[1]*x[1]-7)]'
        },
        equalityConstraints: [],
        inequalityConstraints: [
            { evalStr: 'x[0] + x[1] - 6', gradStr: '[1, 1]' },
            { evalStr: 'x[0]*x[0] + x[1]*x[1] - 25', gradStr: '[2*x[0], 2*x[1]]' },
            { evalStr: '-x[0]', gradStr: '[-1, 0]' },
            { evalStr: '-x[1]', gradStr: '[0, -1]' }
        ],
        initial: [1.0, 1.0],
        bounds: { lower: [0, 0], upper: [5, 5] },
        plotBounds: { xMin: -0.5, xMax: 5.5, yMin: -0.5, yMax: 5.5 }
    },
    circle: {
        name: 'Circle Packing',
        description: `Minimize: f(x) = -x₁ - x₂  (max coverage)

Subject to:
  x₁² + x₂² ≤ 4          (outer circle)
  (x₁-1)² + (x₂-1)² ≥ 1  (avoid inner circle)
  x₁ ≥ 0, x₂ ≥ 0

Find optimal position in annular region`,
        objective: {
            evalStr: '-x[0] - x[1]',
            gradStr: '[-1, -1]'
        },
        equalityConstraints: [],
        inequalityConstraints: [
            { evalStr: 'x[0]*x[0] + x[1]*x[1] - 4', gradStr: '[2*x[0], 2*x[1]]' },
            { evalStr: '1 - (x[0]-1)*(x[0]-1) - (x[1]-1)*(x[1]-1)', gradStr: '[2*(x[0]-1), 2*(x[1]-1)]' },
            { evalStr: '-x[0]', gradStr: '[-1, 0]' },
            { evalStr: '-x[1]', gradStr: '[0, -1]' }
        ],
        initial: [0.5, 1.5],
        bounds: { lower: [0, 0], upper: [2, 2] },
        plotBounds: { xMin: -0.5, xMax: 2.5, yMin: -0.5, yMax: 2.5 }
    },
    engineering: {
        name: 'Engineering Design',
        description: `Minimize: f(x) = x₁² + x₂² + x₁x₂ - 3x₁ - 3x₂

Subject to:
  x₁ + 2x₂ ≤ 4    (resource 1)
  2x₁ + x₂ ≤ 4    (resource 2)
  x₁, x₂ ≥ 0      (non-negativity)

Classic engineering optimization`,
        objective: {
            evalStr: 'x[0]*x[0] + x[1]*x[1] + x[0]*x[1] - 3*x[0] - 3*x[1]',
            gradStr: '[2*x[0] + x[1] - 3, 2*x[1] + x[0] - 3]'
        },
        equalityConstraints: [],
        inequalityConstraints: [
            { evalStr: 'x[0] + 2*x[1] - 4', gradStr: '[1, 2]' },
            { evalStr: '2*x[0] + x[1] - 4', gradStr: '[2, 1]' },
            { evalStr: '-x[0]', gradStr: '[-1, 0]' },
            { evalStr: '-x[1]', gradStr: '[0, -1]' }
        ],
        initial: [0.5, 0.5],
        bounds: { lower: [0, 0], upper: [3, 3] },
        plotBounds: { xMin: -0.5, xMax: 3, yMin: -0.5, yMax: 3 }
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
    progressText.textContent = `Iteration ${data.iteration} | f(x): ${data.objective.toFixed(4)} | Violation: ${data.violation.toExponential(2)}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    statusEl.textContent = data.status === 'optimal' ? 'Optimal' : 'Max Iterations';
    statusEl.style.color = data.status === 'optimal' ? '#34d399' : '#fbbf24';

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
    qpSolvesEl.textContent = data.qpSolves;
    constraintViolEl.textContent = data.constraintViolation.toExponential(2);
    kktResidualEl.textContent = data.kktResidual.toExponential(2);

    drawVisualization(data);
    renderConvergenceHistory(data.history);
}

function drawVisualization(data) {
    const { problem, solution, path } = data;
    const selected = problemSelect.value;
    const probDef = problems[selected];
    const { xMin, xMax, yMin, yMax } = probDef.plotBounds;

    const w = nlpCanvas.width, h = nlpCanvas.height, p = 50;
    const pw = w - p * 2, ph = h - p * 2;

    nlpCtx.fillStyle = '#080f08';
    nlpCtx.fillRect(0, 0, w, h);

    const mapX = x => p + ((x - xMin) / (xMax - xMin)) * pw;
    const mapY = y => h - p - ((y - yMin) / (yMax - yMin)) * ph;

    // Grid
    nlpCtx.strokeStyle = '#0f1a0f';
    nlpCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        nlpCtx.beginPath();
        nlpCtx.moveTo(p + i / 10 * pw, p);
        nlpCtx.lineTo(p + i / 10 * pw, h - p);
        nlpCtx.stroke();
        nlpCtx.beginPath();
        nlpCtx.moveTo(p, p + i / 10 * ph);
        nlpCtx.lineTo(w - p, p + i / 10 * ph);
        nlpCtx.stroke();
    }

    // Axes labels
    nlpCtx.fillStyle = '#4a7a5a';
    nlpCtx.font = '10px monospace';
    nlpCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        const xVal = (xMin + i / 4 * (xMax - xMin)).toFixed(1);
        const yVal = (yMin + i / 4 * (yMax - yMin)).toFixed(1);
        nlpCtx.fillText(xVal, p + i / 4 * pw, h - p + 15);
        nlpCtx.textAlign = 'right';
        nlpCtx.fillText(yVal, p - 5, h - p - i / 4 * ph + 3);
        nlpCtx.textAlign = 'center';
    }
    nlpCtx.fillText('x₁', w - 25, h - p + 15);
    nlpCtx.fillText('x₂', p + 15, p - 10);

    // Draw objective contours
    drawContours(nlpCtx, probDef, mapX, mapY, xMin, xMax, yMin, yMax);

    // Draw constraint boundaries
    drawConstraints(nlpCtx, probDef, mapX, mapY, xMin, xMax, yMin, yMax);

    // Draw optimization path
    if (path && path.length > 1) {
        // Gradient from red to green
        for (let i = 0; i < path.length - 1; i++) {
            const t = i / (path.length - 1);
            const r = Math.round(239 * (1 - t) + 16 * t);
            const g = Math.round(68 * (1 - t) + 185 * t);
            const b = Math.round(68 * (1 - t) + 129 * t);

            nlpCtx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            nlpCtx.lineWidth = 2;
            nlpCtx.beginPath();
            nlpCtx.moveTo(mapX(path[i][0]), mapY(path[i][1]));
            nlpCtx.lineTo(mapX(path[i + 1][0]), mapY(path[i + 1][1]));
            nlpCtx.stroke();
        }

        // Path points
        for (let i = 0; i < path.length; i++) {
            const t = i / (path.length - 1);
            nlpCtx.fillStyle = `rgba(16, 185, 129, ${0.3 + 0.7 * t})`;
            nlpCtx.beginPath();
            nlpCtx.arc(mapX(path[i][0]), mapY(path[i][1]), 3, 0, Math.PI * 2);
            nlpCtx.fill();
        }
    }

    // Draw optimal solution
    if (solution) {
        nlpCtx.fillStyle = '#10b981';
        nlpCtx.beginPath();
        nlpCtx.arc(mapX(solution[0]), mapY(solution[1]), 10, 0, Math.PI * 2);
        nlpCtx.fill();
        nlpCtx.strokeStyle = '#fff';
        nlpCtx.lineWidth = 2;
        nlpCtx.stroke();

        nlpCtx.fillStyle = '#fff';
        nlpCtx.font = '10px sans-serif';
        nlpCtx.textAlign = 'left';
        nlpCtx.fillText(`(${solution[0].toFixed(3)}, ${solution[1].toFixed(3)})`,
            mapX(solution[0]) + 12, mapY(solution[1]) - 5);
    }

    // Border
    nlpCtx.strokeStyle = '#2a5a3a';
    nlpCtx.lineWidth = 2;
    nlpCtx.strokeRect(p, p, pw, ph);

    // Legend
    nlpCtx.font = '9px sans-serif';
    const legendY = h - 20;
    const legendItems = [
        { color: '#10b981', label: 'SQP Path' },
        { color: '#f472b6', label: 'Constraints' }
    ];
    let legendX = 20;
    for (const item of legendItems) {
        nlpCtx.fillStyle = item.color;
        nlpCtx.beginPath();
        nlpCtx.arc(legendX, legendY, 5, 0, Math.PI * 2);
        nlpCtx.fill();
        nlpCtx.fillStyle = '#34d399';
        nlpCtx.textAlign = 'left';
        nlpCtx.fillText(item.label, legendX + 8, legendY + 3);
        legendX += 80;
    }
}

function drawContours(ctx, probDef, mapX, mapY, xMin, xMax, yMin, yMax) {
    const evalFn = new Function('x', 'return ' + probDef.objective.evalStr);

    // Find value range
    let minVal = Infinity, maxVal = -Infinity;
    const step = (xMax - xMin) / 30;
    for (let x = xMin; x <= xMax; x += step) {
        for (let y = yMin; y <= yMax; y += step) {
            try {
                const val = evalFn([x, y]);
                if (isFinite(val)) {
                    minVal = Math.min(minVal, val);
                    maxVal = Math.max(maxVal, val);
                }
            } catch (e) {}
        }
    }

    // Draw contours
    ctx.globalAlpha = 0.3;
    const levels = 12;
    for (let level = 0; level < levels; level++) {
        const targetVal = minVal + (level / levels) * Math.min(maxVal - minVal, 100);

        ctx.strokeStyle = `hsl(${140 - level * 8}, 60%, ${40 + level * 3}%)`;
        ctx.lineWidth = 1;

        // Simple marching squares approximation
        const gridStep = (xMax - xMin) / 50;
        for (let x = xMin; x < xMax; x += gridStep) {
            for (let y = yMin; y < yMax; y += gridStep) {
                try {
                    const v00 = evalFn([x, y]);
                    const v10 = evalFn([x + gridStep, y]);
                    const v01 = evalFn([x, y + gridStep]);
                    const v11 = evalFn([x + gridStep, y + gridStep]);

                    // Check if contour passes through this cell
                    const below = [v00 < targetVal, v10 < targetVal, v01 < targetVal, v11 < targetVal];
                    const numBelow = below.filter(b => b).length;

                    if (numBelow > 0 && numBelow < 4) {
                        ctx.beginPath();
                        ctx.arc(mapX(x + gridStep / 2), mapY(y + gridStep / 2), 1, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } catch (e) {}
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function drawConstraints(ctx, probDef, mapX, mapY, xMin, xMax, yMin, yMax) {
    const colors = ['#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#4ade80'];

    probDef.inequalityConstraints.forEach((c, idx) => {
        const evalFn = new Function('x', 'return ' + c.evalStr);

        ctx.strokeStyle = colors[idx % colors.length];
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        // Draw constraint boundary (g(x) = 0)
        const gridStep = (xMax - xMin) / 100;
        ctx.beginPath();

        for (let x = xMin; x <= xMax; x += gridStep) {
            for (let y = yMin; y <= yMax; y += gridStep) {
                try {
                    const v = evalFn([x, y]);
                    const vRight = evalFn([x + gridStep, y]);
                    const vUp = evalFn([x, y + gridStep]);

                    // Check for sign change
                    if ((v * vRight < 0) || (v * vUp < 0)) {
                        ctx.moveTo(mapX(x), mapY(y));
                        ctx.lineTo(mapX(x) + 1, mapY(y) + 1);
                    }
                } catch (e) {}
            }
        }
        ctx.stroke();
    });

    ctx.setLineDash([]);
}

function renderConvergenceHistory(history) {
    if (!history || history.length === 0) {
        convergenceHistory.innerHTML = '<p style="color: #4a7a5a; text-align: center;">No iteration data</p>';
        return;
    }

    let html = '<table><tr><th>Iter</th><th>f(x)</th><th>Violation</th><th>KKT</th><th>α</th></tr>';

    const showCount = Math.min(history.length, 15);
    const step = Math.max(1, Math.floor(history.length / showCount));

    for (let i = 0; i < history.length; i += step) {
        const h = history[i];
        html += `<tr>
            <td>${h.iteration}</td>
            <td>${h.objective.toFixed(4)}</td>
            <td>${h.constraintViol.toExponential(1)}</td>
            <td>${h.kktResidual.toExponential(1)}</td>
            <td>${h.stepSize.toFixed(3)}</td>
        </tr>`;
    }

    // Always show last
    if (history.length > 1 && (history.length - 1) % step !== 0) {
        const h = history[history.length - 1];
        html += `<tr>
            <td>${h.iteration}</td>
            <td>${h.objective.toFixed(4)}</td>
            <td>${h.constraintViol.toExponential(1)}</td>
            <td>${h.kktResidual.toExponential(1)}</td>
            <td>${h.stepSize.toFixed(3)}</td>
        </tr>`;
    }

    html += '</table>';
    convergenceHistory.innerHTML = html;
}

function updateProblemDisplay() {
    const selected = problemSelect.value;
    const prob = problems[selected];
    problemDescription.textContent = prob.description;
}

function prepareProblem(probDef) {
    // Convert string expressions to executable functions
    return {
        objective: {
            eval: new Function('x', 'return ' + probDef.objective.evalStr),
            grad: new Function('x', 'return ' + probDef.objective.gradStr)
        },
        equalityConstraints: probDef.equalityConstraints.map(c => ({
            eval: new Function('x', 'return ' + c.evalStr),
            grad: new Function('x', 'return ' + c.gradStr)
        })),
        inequalityConstraints: probDef.inequalityConstraints.map(c => ({
            eval: new Function('x', 'return ' + c.evalStr),
            grad: new Function('x', 'return ' + c.gradStr)
        })),
        initial: probDef.initial.slice(),
        bounds: probDef.bounds
    };
}

function solve() {
    const selected = problemSelect.value;
    const probDef = problems[selected];
    const problem = prepareProblem(probDef);

    const maxIter = parseInt(maxIterInput.value);
    const tolerance = parseFloat(toleranceInput.value);
    const penaltyInit = parseFloat(penaltyInitInput.value);
    const hessianUpdate = hessianUpdateSelect.value;

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    initWorker();
    worker.postMessage({ problem, maxIter, tolerance, penaltyInit, hessianUpdate });
}

function reset() {
    if (worker) { worker.terminate(); worker = null; }
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    nlpCtx.fillStyle = '#080f08';
    nlpCtx.fillRect(0, 0, nlpCanvas.width, nlpCanvas.height);
    nlpCtx.fillStyle = '#4a7a5a';
    nlpCtx.font = '14px sans-serif';
    nlpCtx.textAlign = 'center';
    nlpCtx.fillText('Click "Solve NLP" to optimize using SQP', nlpCanvas.width / 2, nlpCanvas.height / 2);
}

problemSelect.addEventListener('change', updateProblemDisplay);
solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', reset);

updateProblemDisplay();
reset();
