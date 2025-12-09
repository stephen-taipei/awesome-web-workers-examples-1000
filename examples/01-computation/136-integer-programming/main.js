// Integer Programming - Main Thread

const problemSelect = document.getElementById('problemSelect');
const customProblem = document.getElementById('customProblem');
const problemDescription = document.getElementById('problemDescription');
const branchStrategySelect = document.getElementById('branchStrategy');
const maxNodesInput = document.getElementById('maxNodes');

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
const nodesExploredEl = document.getElementById('nodesExplored');
const nodesPrunedEl = document.getElementById('nodesPruned');
const lpBoundEl = document.getElementById('lpBound');
const gapEl = document.getElementById('gap');

const treeCanvas = document.getElementById('treeCanvas');
const treeCtx = treeCanvas.getContext('2d');

let worker = null;

const problems = {
    knapsack: {
        name: 'Knapsack Problem',
        description: `Maximize: z = 5x₁ + 8x₂ (value)

Subject to:
  x₁ + x₂ ≤ 6     (item count)
  5x₁ + 9x₂ ≤ 45  (weight capacity)
  x₁, x₂ ≥ 0, integer`,
        c: [5, 8],
        A: [[1, 1], [5, 9]],
        b: [6, 45],
        maximize: true
    },
    assignment: {
        name: 'Assignment Problem',
        description: `Maximize: z = 7x₁ + 6x₂ (productivity)

Subject to:
  x₁ + x₂ ≤ 5     (workers)
  3x₁ + 2x₂ ≤ 12  (hours)
  2x₁ + 4x₂ ≤ 16  (tasks)
  x₁, x₂ ≥ 0, integer`,
        c: [7, 6],
        A: [[1, 1], [3, 2], [2, 4]],
        b: [5, 12, 16],
        maximize: true
    },
    facility: {
        name: 'Facility Location',
        description: `Maximize: z = 10x₁ + 12x₂ (revenue)

Subject to:
  2x₁ + 3x₂ ≤ 18  (land)
  4x₁ + 2x₂ ≤ 20  (budget)
  x₁ + x₂ ≤ 7     (max facilities)
  x₁, x₂ ≥ 0, integer`,
        c: [10, 12],
        A: [[2, 3], [4, 2], [1, 1]],
        b: [18, 20, 7],
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
    const bestStr = data.bestValue !== null ? data.bestValue.toFixed(2) : 'None';
    progressText.textContent = `Nodes: ${data.nodesExplored} | Best: ${bestStr}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    statusEl.textContent = data.status === 'optimal' ? 'Optimal' : 'Infeasible';
    statusEl.style.color = data.status === 'optimal' ? '#c084fc' : '#ef4444';

    if (data.solution) {
        optX1.textContent = Math.round(data.solution[0]);
        optX2.textContent = Math.round(data.solution[1]);
        optValue.textContent = data.optimalValue.toFixed(2);
    } else {
        optX1.textContent = '-';
        optX2.textContent = '-';
        optValue.textContent = '-';
    }

    nodesExploredEl.textContent = data.nodesExplored;
    nodesPrunedEl.textContent = data.nodesPruned;
    lpBoundEl.textContent = data.lpRelaxation !== null ? data.lpRelaxation.toFixed(2) : '-';
    gapEl.textContent = data.gap.toFixed(2) + '%';

    drawTree(data.tree);
}

function drawTree(tree) {
    const w = treeCanvas.width, h = treeCanvas.height;
    treeCtx.fillStyle = '#0a080f';
    treeCtx.fillRect(0, 0, w, h);

    if (tree.length === 0) return;

    // Calculate tree layout
    const maxDepth = Math.max(...tree.map(n => n.depth));
    const depthCounts = {};
    const depthPositions = {};

    for (const node of tree) {
        depthCounts[node.depth] = (depthCounts[node.depth] || 0) + 1;
    }

    for (const node of tree) {
        if (!depthPositions[node.depth]) depthPositions[node.depth] = 0;
        node.xPos = depthPositions[node.depth]++;
    }

    const levelHeight = Math.min(60, (h - 60) / (maxDepth + 1));
    const nodeRadius = 15;

    // Draw edges first
    treeCtx.strokeStyle = '#4a2a5a';
    treeCtx.lineWidth = 2;
    for (const node of tree) {
        if (node.parentId >= 0) {
            const parent = tree[node.parentId];
            const parentX = 30 + (parent.xPos + 0.5) * (w - 60) / depthCounts[parent.depth];
            const parentY = 30 + parent.depth * levelHeight;
            const nodeX = 30 + (node.xPos + 0.5) * (w - 60) / depthCounts[node.depth];
            const nodeY = 30 + node.depth * levelHeight;

            treeCtx.beginPath();
            treeCtx.moveTo(parentX, parentY + nodeRadius);
            treeCtx.lineTo(nodeX, nodeY - nodeRadius);
            treeCtx.stroke();
        }
    }

    // Draw nodes
    for (const node of tree) {
        const x = 30 + (node.xPos + 0.5) * (w - 60) / depthCounts[node.depth];
        const y = 30 + node.depth * levelHeight;

        // Node color based on type
        let color;
        switch (node.nodeType) {
            case 'optimal':
            case 'integer':
                color = '#22c55e';
                break;
            case 'pruned':
                color = '#ef4444';
                break;
            case 'infeasible':
                color = '#6b7280';
                break;
            case 'branch':
            default:
                color = '#c084fc';
        }

        treeCtx.fillStyle = color;
        treeCtx.beginPath();
        treeCtx.arc(x, y, nodeRadius, 0, Math.PI * 2);
        treeCtx.fill();

        // Node ID
        treeCtx.fillStyle = '#fff';
        treeCtx.font = '10px sans-serif';
        treeCtx.textAlign = 'center';
        treeCtx.fillText(node.id, x, y + 4);

        // LP value label
        if (node.lpValue !== null && node.lpValue !== undefined) {
            treeCtx.fillStyle = '#d8b4fe';
            treeCtx.font = '9px monospace';
            treeCtx.fillText(node.lpValue.toFixed(1), x, y + nodeRadius + 12);
        }
    }

    // Legend
    const legendY = h - 25;
    const legendItems = [
        { color: '#c084fc', label: 'Branch' },
        { color: '#22c55e', label: 'Integer' },
        { color: '#ef4444', label: 'Pruned' },
        { color: '#6b7280', label: 'Infeasible' }
    ];

    treeCtx.font = '10px sans-serif';
    let legendX = 20;
    for (const item of legendItems) {
        treeCtx.fillStyle = item.color;
        treeCtx.beginPath();
        treeCtx.arc(legendX, legendY, 6, 0, Math.PI * 2);
        treeCtx.fill();
        treeCtx.fillStyle = '#d8b4fe';
        treeCtx.textAlign = 'left';
        treeCtx.fillText(item.label, legendX + 10, legendY + 4);
        legendX += 80;
    }
}

function updateProblemDisplay() {
    const selected = problemSelect.value;

    if (selected === 'custom') {
        customProblem.classList.remove('hidden');
        problemDescription.textContent = 'Enter your custom IP problem above.';
    } else {
        customProblem.classList.add('hidden');
        const prob = problems[selected];
        problemDescription.textContent = prob.description;
    }
}

function getCustomProblem() {
    return {
        c: [parseFloat(document.getElementById('c1').value), parseFloat(document.getElementById('c2').value)],
        A: [
            [parseFloat(document.getElementById('a11').value), parseFloat(document.getElementById('a12').value)],
            [parseFloat(document.getElementById('a21').value), parseFloat(document.getElementById('a22').value)]
        ],
        b: [
            parseFloat(document.getElementById('b1').value),
            parseFloat(document.getElementById('b2').value)
        ],
        maximize: true
    };
}

function solve() {
    const selected = problemSelect.value;
    const problem = selected === 'custom' ? getCustomProblem() : problems[selected];
    const branchStrategy = branchStrategySelect.value;
    const maxNodes = parseInt(maxNodesInput.value);

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    initWorker();
    worker.postMessage({ problem, branchStrategy, maxNodes });
}

function reset() {
    if (worker) { worker.terminate(); worker = null; }
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    treeCtx.fillStyle = '#0a080f';
    treeCtx.fillRect(0, 0, treeCanvas.width, treeCanvas.height);
    treeCtx.fillStyle = '#6a5a7a';
    treeCtx.font = '14px sans-serif';
    treeCtx.textAlign = 'center';
    treeCtx.fillText('Click "Solve IP" to find optimal integer solution', treeCanvas.width / 2, treeCanvas.height / 2);
}

problemSelect.addEventListener('change', updateProblemDisplay);
solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', reset);

updateProblemDisplay();
reset();
