const expressionInput = document.getElementById('expression');
const variableInput = document.getElementById('variable');
const xMinInput = document.getElementById('xMin');
const xMaxInput = document.getElementById('xMax');
const evaluateBtn = document.getElementById('evaluateBtn');
const graphBtn = document.getElementById('graphBtn');
const resultEl = document.getElementById('result');
const graphInfoEl = document.getElementById('graphInfo');
const historyEl = document.getElementById('history');
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');

let worker;
let history = [];
let currentGraphData = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, result, error, expression, variables, data, xMin, xMax, yMin, yMax } = e.data;

        if (type === 'result') {
            displayResult(result);
            addToHistory(expression, variables, result);
        } else if (type === 'graph') {
            if (error) {
                displayError(error);
            } else {
                currentGraphData = { data, xMin, xMax, yMin, yMax, expression };
                drawGraph(data, xMin, xMax, yMin, yMax);
            }
        } else if (type === 'error') {
            displayError(error);
        }
    };

    worker.onerror = function(e) {
        displayError('Worker error: ' + e.message);
    };
}

function displayResult(result) {
    resultEl.textContent = typeof result === 'number' ?
        (Number.isInteger(result) ? result : result.toFixed(10).replace(/\.?0+$/, '')) :
        result;
    resultEl.classList.remove('error');
}

function displayError(message) {
    resultEl.textContent = message;
    resultEl.classList.add('error');
}

function addToHistory(expression, variables, result) {
    const varStr = Object.entries(variables)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

    const entry = {
        expression: varStr ? `${expression} (${varStr})` : expression,
        result: typeof result === 'number' ? result.toFixed(6) : result
    };

    history.unshift(entry);
    if (history.length > 10) history.pop();

    renderHistory();
}

function renderHistory() {
    historyEl.innerHTML = history.map(item => `
        <div class="history-item">
            <span class="history-expr">${escapeHtml(item.expression)}</span>
            <span class="history-result">= ${item.result}</span>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function drawGraph(data, xMin, xMax, yMin, yMax) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Map coordinates
    function mapX(x) {
        return padding + (x - xMin) / (xMax - xMin) * plotWidth;
    }

    function mapY(y) {
        return height - padding - (y - yMin) / (yMax - yMin) * plotHeight;
    }

    // Draw grid
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;

    // Vertical grid lines
    const xStep = (xMax - xMin) / 10;
    for (let x = xMin; x <= xMax; x += xStep) {
        const px = mapX(x);
        ctx.beginPath();
        ctx.moveTo(px, padding);
        ctx.lineTo(px, height - padding);
        ctx.stroke();
    }

    // Horizontal grid lines
    const yStep = (yMax - yMin) / 10;
    for (let y = yMin; y <= yMax; y += yStep) {
        const py = mapY(y);
        ctx.beginPath();
        ctx.moveTo(padding, py);
        ctx.lineTo(width - padding, py);
        ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#533483';
    ctx.lineWidth = 2;

    // X-axis (if visible)
    if (yMin <= 0 && yMax >= 0) {
        const y0 = mapY(0);
        ctx.beginPath();
        ctx.moveTo(padding, y0);
        ctx.lineTo(width - padding, y0);
        ctx.stroke();
    }

    // Y-axis (if visible)
    if (xMin <= 0 && xMax >= 0) {
        const x0 = mapX(0);
        ctx.beginPath();
        ctx.moveTo(x0, padding);
        ctx.lineTo(x0, height - padding);
        ctx.stroke();
    }

    // Draw axis labels
    ctx.fillStyle = '#a2a2a2';
    ctx.font = '12px Consolas, Monaco, monospace';
    ctx.textAlign = 'center';

    // X-axis labels
    for (let x = xMin; x <= xMax; x += xStep) {
        const px = mapX(x);
        ctx.fillText(x.toFixed(1), px, height - padding + 20);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let y = yMin; y <= yMax; y += yStep) {
        const py = mapY(y);
        ctx.fillText(y.toFixed(1), padding - 10, py + 4);
    }

    // Draw the function curve
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (const point of data) {
        if (point.y === null || !isFinite(point.y)) {
            started = false;
            continue;
        }

        const px = mapX(point.x);
        const py = mapY(point.y);

        // Clip to plot area
        if (py < padding || py > height - padding) {
            started = false;
            continue;
        }

        if (!started) {
            ctx.moveTo(px, py);
            started = true;
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();

    // Draw border
    ctx.strokeStyle = '#533483';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, plotWidth, plotHeight);
}

// Mouse hover for coordinates
canvas.addEventListener('mousemove', function(e) {
    if (!currentGraphData) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padding = 50;
    const plotWidth = canvas.width - padding * 2;
    const plotHeight = canvas.height - padding * 2;

    const { xMin, xMax, yMin, yMax } = currentGraphData;

    const x = xMin + (mouseX - padding) / plotWidth * (xMax - xMin);
    const y = yMax - (mouseY - padding) / plotHeight * (yMax - yMin);

    if (mouseX >= padding && mouseX <= canvas.width - padding &&
        mouseY >= padding && mouseY <= canvas.height - padding) {
        graphInfoEl.textContent = `x: ${x.toFixed(3)}, y: ${y.toFixed(3)}`;
    } else {
        graphInfoEl.textContent = 'Hover over graph for coordinates';
    }
});

canvas.addEventListener('mouseleave', function() {
    graphInfoEl.textContent = 'Hover over graph for coordinates';
});

evaluateBtn.addEventListener('click', function() {
    const expression = expressionInput.value.trim();
    if (!expression) {
        displayError('Please enter an expression');
        return;
    }

    const x = parseFloat(variableInput.value) || 0;

    worker.postMessage({
        type: 'evaluate',
        expression,
        variables: { x }
    });
});

graphBtn.addEventListener('click', function() {
    const expression = expressionInput.value.trim();
    if (!expression) {
        displayError('Please enter an expression');
        return;
    }

    const xMin = parseFloat(xMinInput.value) || -10;
    const xMax = parseFloat(xMaxInput.value) || 10;

    if (xMin >= xMax) {
        displayError('Invalid range: min must be less than max');
        return;
    }

    worker.postMessage({
        type: 'graph',
        expression,
        xMin,
        xMax
    });
});

// Allow Enter key to evaluate
expressionInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        evaluateBtn.click();
    }
});

variableInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        evaluateBtn.click();
    }
});

// Initialize
initWorker();

// Draw empty graph
ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = '#533483';
ctx.lineWidth = 2;
ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
ctx.fillStyle = '#a2a2a2';
ctx.font = '14px Consolas, Monaco, monospace';
ctx.textAlign = 'center';
ctx.fillText('Click "Plot Graph" to visualize', canvas.width / 2, canvas.height / 2);
