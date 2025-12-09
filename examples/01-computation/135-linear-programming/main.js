// Linear Programming - Main Thread

const problemSelect = document.getElementById('problemSelect');
const customProblem = document.getElementById('customProblem');
const problemDescription = document.getElementById('problemDescription');

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
const tableauHistory = document.getElementById('tableauHistory');

const lpCanvas = document.getElementById('lpCanvas');
const lpCtx = lpCanvas.getContext('2d');

let worker = null;
let currentProblem = null;

const problems = {
    production: {
        name: 'Production Planning',
        description: `Maximize: z = 3x₁ + 2x₂ (profit)

Subject to:
  x₁ + x₂ ≤ 4    (Machine A hours)
  2x₁ + x₂ ≤ 6   (Machine B hours)
  x₁ + 2x₂ ≤ 5   (Raw material)
  x₁, x₂ ≥ 0`,
        c: [3, 2],
        A: [[1, 1], [2, 1], [1, 2]],
        b: [4, 6, 5],
        maximize: true
    },
    diet: {
        name: 'Diet Problem',
        description: `Maximize: z = 4x₁ + 3x₂ (nutrition)

Subject to:
  2x₁ + x₂ ≤ 8   (Calories limit)
  x₁ + 2x₂ ≤ 7   (Fat limit)
  x₁ + x₂ ≤ 5    (Protein limit)
  x₁, x₂ ≥ 0`,
        c: [4, 3],
        A: [[2, 1], [1, 2], [1, 1]],
        b: [8, 7, 5],
        maximize: true
    },
    transportation: {
        name: 'Transportation',
        description: `Maximize: z = 5x₁ + 4x₂ (revenue)

Subject to:
  x₁ + x₂ ≤ 6    (Supply limit)
  2x₁ + x₂ ≤ 10  (Route A capacity)
  x₁ + 3x₂ ≤ 9   (Route B capacity)
  x₁, x₂ ≥ 0`,
        c: [5, 4],
        A: [[1, 1], [2, 1], [1, 3]],
        b: [6, 10, 9],
        maximize: true
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
    progressText.textContent = `Iteration ${data.iteration}...`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    statusEl.textContent = data.status === 'optimal' ? 'Optimal' :
                           data.status === 'unbounded' ? 'Unbounded' : 'Max Iterations';
    statusEl.style.color = data.status === 'optimal' ? '#34d399' : '#ef4444';

    optX1.textContent = data.solution[0].toFixed(4);
    optX2.textContent = data.solution[1].toFixed(4);
    optValue.textContent = data.optimalValue.toFixed(4);

    drawFeasibleRegion(data);
    renderTableauHistory(data.history);
}

function drawFeasibleRegion(data) {
    const { problem, solution, optimalValue } = data;
    const { c, A, b } = problem;
    const w = lpCanvas.width, h = lpCanvas.height, p = 50;
    const pw = w - p * 2, ph = h - p * 2;

    lpCtx.fillStyle = '#080f0a';
    lpCtx.fillRect(0, 0, w, h);

    // Determine plot bounds
    const maxX = Math.max(8, ...b.map((bi, i) => A[i][0] > 0 ? bi / A[i][0] : 0)) * 1.2;
    const maxY = Math.max(8, ...b.map((bi, i) => A[i][1] > 0 ? bi / A[i][1] : 0)) * 1.2;

    const mapX = x => p + (x / maxX) * pw;
    const mapY = y => h - p - (y / maxY) * ph;

    // Grid
    lpCtx.strokeStyle = '#0f1a10';
    lpCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        lpCtx.beginPath();
        lpCtx.moveTo(p + i / 10 * pw, p);
        lpCtx.lineTo(p + i / 10 * pw, h - p);
        lpCtx.stroke();
        lpCtx.beginPath();
        lpCtx.moveTo(p, p + i / 10 * ph);
        lpCtx.lineTo(w - p, p + i / 10 * ph);
        lpCtx.stroke();
    }

    // Axes labels
    lpCtx.fillStyle = '#5a8a6a';
    lpCtx.font = '10px monospace';
    lpCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        const xVal = (i / 4 * maxX).toFixed(1);
        const yVal = (i / 4 * maxY).toFixed(1);
        lpCtx.fillText(xVal, p + i / 4 * pw, h - p + 15);
        lpCtx.textAlign = 'right';
        lpCtx.fillText(yVal, p - 5, h - p - i / 4 * ph + 3);
        lpCtx.textAlign = 'center';
    }
    lpCtx.fillText('x₁', w / 2, h - 10);
    lpCtx.save();
    lpCtx.translate(15, h / 2);
    lpCtx.rotate(-Math.PI / 2);
    lpCtx.fillText('x₂', 0, 0);
    lpCtx.restore();

    // Find feasible region vertices
    const vertices = findVertices(A, b, maxX, maxY);

    // Draw feasible region
    if (vertices.length > 2) {
        lpCtx.fillStyle = 'rgba(52, 211, 153, 0.2)';
        lpCtx.beginPath();
        lpCtx.moveTo(mapX(vertices[0][0]), mapY(vertices[0][1]));
        for (let i = 1; i < vertices.length; i++) {
            lpCtx.lineTo(mapX(vertices[i][0]), mapY(vertices[i][1]));
        }
        lpCtx.closePath();
        lpCtx.fill();
    }

    // Draw constraint lines
    const colors = ['#f472b6', '#60a5fa', '#fbbf24', '#a78bfa'];
    for (let i = 0; i < A.length; i++) {
        const [a1, a2] = A[i];
        const bi = b[i];

        lpCtx.strokeStyle = colors[i % colors.length];
        lpCtx.lineWidth = 2;
        lpCtx.beginPath();

        if (Math.abs(a2) > 1e-10) {
            // y = (b - a1*x) / a2
            const x0 = 0, y0 = bi / a2;
            const x1 = maxX, y1 = (bi - a1 * maxX) / a2;
            lpCtx.moveTo(mapX(x0), mapY(Math.max(0, y0)));
            lpCtx.lineTo(mapX(x1), mapY(Math.max(0, y1)));
        } else if (Math.abs(a1) > 1e-10) {
            // Vertical line x = b/a1
            const x = bi / a1;
            lpCtx.moveTo(mapX(x), mapY(0));
            lpCtx.lineTo(mapX(x), mapY(maxY));
        }
        lpCtx.stroke();
    }

    // Draw vertices
    for (const v of vertices) {
        lpCtx.fillStyle = '#6ee7b7';
        lpCtx.beginPath();
        lpCtx.arc(mapX(v[0]), mapY(v[1]), 5, 0, Math.PI * 2);
        lpCtx.fill();
    }

    // Draw optimal solution
    lpCtx.fillStyle = '#34d399';
    lpCtx.beginPath();
    lpCtx.arc(mapX(solution[0]), mapY(solution[1]), 10, 0, Math.PI * 2);
    lpCtx.fill();
    lpCtx.strokeStyle = '#fff';
    lpCtx.lineWidth = 2;
    lpCtx.stroke();

    // Draw objective function gradient direction
    const gradLen = 30;
    const gradNorm = Math.sqrt(c[0] * c[0] + c[1] * c[1]);
    lpCtx.strokeStyle = '#34d399';
    lpCtx.lineWidth = 2;
    lpCtx.setLineDash([5, 5]);
    lpCtx.beginPath();
    lpCtx.moveTo(mapX(solution[0]), mapY(solution[1]));
    lpCtx.lineTo(
        mapX(solution[0]) + gradLen * c[0] / gradNorm,
        mapY(solution[1]) - gradLen * c[1] / gradNorm
    );
    lpCtx.stroke();
    lpCtx.setLineDash([]);

    // Border
    lpCtx.strokeStyle = '#2a4a3a';
    lpCtx.lineWidth = 2;
    lpCtx.strokeRect(p, p, pw, ph);

    // Legend
    lpCtx.font = '10px sans-serif';
    for (let i = 0; i < A.length; i++) {
        lpCtx.fillStyle = colors[i % colors.length];
        lpCtx.fillText(`C${i + 1}`, w - p + 5, p + 15 + i * 15);
    }
    lpCtx.fillStyle = '#34d399';
    lpCtx.fillText('Optimal', w - p + 5, p + 15 + A.length * 15);
}

function findVertices(A, b, maxX, maxY) {
    const vertices = [];
    const m = A.length;

    // Add origin if feasible
    if (b.every(bi => bi >= 0)) {
        vertices.push([0, 0]);
    }

    // Intersections with axes
    for (let i = 0; i < m; i++) {
        const [a1, a2] = A[i];
        const bi = b[i];

        // x-axis (y=0): a1*x = b
        if (Math.abs(a1) > 1e-10) {
            const x = bi / a1;
            if (x >= 0 && x <= maxX && isFeasible([x, 0], A, b)) {
                vertices.push([x, 0]);
            }
        }

        // y-axis (x=0): a2*y = b
        if (Math.abs(a2) > 1e-10) {
            const y = bi / a2;
            if (y >= 0 && y <= maxY && isFeasible([0, y], A, b)) {
                vertices.push([0, y]);
            }
        }
    }

    // Intersections between constraints
    for (let i = 0; i < m; i++) {
        for (let j = i + 1; j < m; j++) {
            const pt = lineIntersection(A[i], b[i], A[j], b[j]);
            if (pt && pt[0] >= 0 && pt[1] >= 0 && isFeasible(pt, A, b)) {
                vertices.push(pt);
            }
        }
    }

    // Sort vertices by angle for polygon drawing
    if (vertices.length > 2) {
        const cx = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
        const cy = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;
        vertices.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    }

    return vertices;
}

function lineIntersection(a1, b1, a2, b2) {
    const det = a1[0] * a2[1] - a1[1] * a2[0];
    if (Math.abs(det) < 1e-10) return null;
    const x = (b1 * a2[1] - b2 * a1[1]) / det;
    const y = (a1[0] * b2 - a2[0] * b1) / det;
    return [x, y];
}

function isFeasible(pt, A, b) {
    for (let i = 0; i < A.length; i++) {
        if (A[i][0] * pt[0] + A[i][1] * pt[1] > b[i] + 1e-6) {
            return false;
        }
    }
    return true;
}

function renderTableauHistory(history) {
    tableauHistory.innerHTML = '';

    for (const h of history) {
        const div = document.createElement('div');
        div.className = 'iteration';

        let html = `<strong>Iteration ${h.iteration}</strong>`;
        if (h.entering >= 0) {
            html += ` (Enter: x${h.entering + 1}, Leave: row ${h.leaving + 1})`;
        }
        html += '<table><tr><th></th>';

        const numVars = h.tableau[0].length - 1;
        for (let j = 0; j < numVars; j++) {
            html += `<th>x${j + 1}</th>`;
        }
        html += '<th>RHS</th></tr>';

        for (let i = 0; i < h.tableau.length; i++) {
            const isObjRow = i === h.tableau.length - 1;
            html += `<tr><td>${isObjRow ? 'z' : 'x' + (h.basic[i] + 1)}</td>`;
            for (let j = 0; j <= numVars; j++) {
                const isPivot = i === h.leaving && j === h.entering;
                const cls = isPivot ? ' class="pivot"' : '';
                html += `<td${cls}>${h.tableau[i][j].toFixed(3)}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';

        div.innerHTML = html;
        tableauHistory.appendChild(div);
    }
}

function updateProblemDisplay() {
    const selected = problemSelect.value;

    if (selected === 'custom') {
        customProblem.classList.remove('hidden');
        problemDescription.textContent = 'Enter your custom LP problem above.';
    } else {
        customProblem.classList.add('hidden');
        const prob = problems[selected];
        problemDescription.textContent = prob.description;
        currentProblem = prob;
    }
}

function getCustomProblem() {
    return {
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
        ],
        maximize: true
    };
}

function solve() {
    const selected = problemSelect.value;
    const problem = selected === 'custom' ? getCustomProblem() : problems[selected];

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    initWorker();
    worker.postMessage({ problem });
}

function reset() {
    if (worker) { worker.terminate(); worker = null; }
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    lpCtx.fillStyle = '#080f0a';
    lpCtx.fillRect(0, 0, lpCanvas.width, lpCanvas.height);
    lpCtx.fillStyle = '#5a8a6a';
    lpCtx.font = '14px sans-serif';
    lpCtx.textAlign = 'center';
    lpCtx.fillText('Click "Solve LP" to find optimal solution', lpCanvas.width / 2, lpCanvas.height / 2);
}

problemSelect.addEventListener('change', updateProblemDisplay);
solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', reset);

updateProblemDisplay();
reset();
