// Lazy Evaluation - Main Thread

const scenarioSelect = document.getElementById('scenarioSelect');
const scenarioDescription = document.getElementById('scenarioDescription');
const requestCountInput = document.getElementById('requestCount');
const batchSizeInput = document.getElementById('batchSize');
const delayMsInput = document.getElementById('delayMs');
const cacheEnabledSelect = document.getElementById('cacheEnabled');

const runLazyBtn = document.getElementById('runLazyBtn');
const compareEagerBtn = document.getElementById('compareEagerBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const valuesComputedEl = document.getElementById('valuesComputed');
const valuesRequestedEl = document.getElementById('valuesRequested');
const cacheHitsEl = document.getElementById('cacheHits');
const lazyTimeEl = document.getElementById('lazyTime');
const eagerTimeEl = document.getElementById('eagerTime');
const memorySavedEl = document.getElementById('memorySaved');
const computationsSavedEl = document.getElementById('computationsSaved');
const efficiencyEl = document.getElementById('efficiency');
const valuesList = document.getElementById('valuesList');

const canvas = document.getElementById('lazyCanvas');
const ctx = canvas.getContext('2d');

let worker = null;
let evaluationEvents = [];
let lazyStartTime = 0;
let eagerTime = null;
let receivedValues = [];

const scenarios = {
    fibonacci: {
        name: 'Infinite Fibonacci',
        description: `Generate Fibonacci numbers on demand.
Only compute the numbers actually requested.
Demonstrates lazy infinite sequence handling.`
    },
    primes: {
        name: 'Prime Number Stream',
        description: `Generate prime numbers lazily.
Avoid computing primes beyond what's needed.
Shows computational savings with lazy evaluation.`
    },
    datastream: {
        name: 'Lazy Data Processing',
        description: `Process data stream items on demand.
Filter, map, and reduce without materializing.
Demonstrates chained lazy operations.`
    },
    tree: {
        name: 'Lazy Tree Traversal',
        description: `Traverse tree structure on demand.
Only expand nodes when visited.
Shows memory savings with lazy loading.`
    }
};

function updateScenarioDisplay() {
    const selected = scenarioSelect.value;
    scenarioDescription.textContent = scenarios[selected].description;
}

function terminateWorker() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
}

function runLazy() {
    const requestCount = parseInt(requestCountInput.value);
    const batchSize = parseInt(batchSizeInput.value);
    const delayMs = parseInt(delayMsInput.value);
    const cacheEnabled = cacheEnabledSelect.value === 'true';
    const scenario = scenarioSelect.value;

    terminateWorker();
    evaluationEvents = [];
    receivedValues = [];

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting lazy evaluation...';

    worker = new Worker('worker.js');
    lazyStartTime = performance.now();

    worker.onmessage = (e) => {
        const data = e.data;

        if (data.type === 'value') {
            receivedValues.push({
                index: data.index,
                value: data.value,
                cached: data.cached,
                computeTime: data.computeTime
            });

            evaluationEvents.push({
                time: performance.now() - lazyStartTime,
                type: data.cached ? 'cache_hit' : 'compute',
                index: data.index,
                value: data.value
            });

            const progress = (receivedValues.length / requestCount) * 100;
            progressBar.style.width = progress + '%';
            progressText.textContent = `Received ${receivedValues.length}/${requestCount} values`;

            drawVisualization();

        } else if (data.type === 'complete') {
            showResults(data.stats);
        }
    };

    worker.postMessage({
        type: 'lazy',
        scenario,
        requestCount,
        batchSize,
        delayMs,
        cacheEnabled
    });

    drawVisualization();
}

function runEager() {
    const requestCount = parseInt(requestCountInput.value);
    const scenario = scenarioSelect.value;

    progressContainer.classList.remove('hidden');
    progressText.textContent = 'Running eager evaluation for comparison...';

    const eagerWorker = new Worker('worker.js');
    const eagerStart = performance.now();

    eagerWorker.onmessage = (e) => {
        if (e.data.type === 'eager_complete') {
            eagerTime = performance.now() - eagerStart;
            eagerTimeEl.textContent = eagerTime.toFixed(2) + ' ms';
            eagerWorker.terminate();
            progressContainer.classList.add('hidden');

            // Update efficiency comparison
            const lazyTimeVal = parseFloat(lazyTimeEl.textContent);
            if (!isNaN(lazyTimeVal) && lazyTimeVal > 0) {
                const saved = ((eagerTime - lazyTimeVal) / eagerTime * 100).toFixed(1);
                computationsSavedEl.textContent = saved + '%';
            }
        }
    };

    eagerWorker.postMessage({
        type: 'eager',
        scenario,
        totalCount: requestCount * 2 // Eager computes more than needed
    });
}

function showResults(stats) {
    const lazyTime = performance.now() - lazyStartTime;

    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    valuesComputedEl.textContent = stats.computed;
    valuesRequestedEl.textContent = stats.requested;
    cacheHitsEl.textContent = stats.cacheHits;
    lazyTimeEl.textContent = lazyTime.toFixed(2) + ' ms';

    if (eagerTime) {
        eagerTimeEl.textContent = eagerTime.toFixed(2) + ' ms';
    }

    // Memory saved estimate
    const memorySaved = ((stats.potentialCompute - stats.computed) / stats.potentialCompute * 100).toFixed(1);
    memorySavedEl.textContent = memorySaved + '%';

    // Efficiency
    const efficiency = (stats.cacheHits > 0) ?
        ((stats.cacheHits / (stats.cacheHits + stats.computed)) * 100).toFixed(1) :
        '0.0';
    efficiencyEl.textContent = efficiency + '%';

    renderValuesList();
    drawVisualization();
}

function renderValuesList() {
    let html = '';

    receivedValues.forEach((v, idx) => {
        const className = v.cached ? 'value-item cached' : 'value-item computed';
        const displayValue = typeof v.value === 'number' ?
            (v.value > 1e10 ? v.value.toExponential(2) : v.value.toLocaleString()) :
            v.value;
        html += `<span class="${className}" title="Index: ${v.index}, Time: ${v.computeTime.toFixed(1)}ms">${displayValue}</span>`;
    });

    valuesList.innerHTML = html;
}

function drawVisualization() {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#0a0f0d';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#14b8a6';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lazy Evaluation Timeline', w / 2, 25);

    if (evaluationEvents.length === 0) {
        ctx.fillStyle = '#555';
        ctx.font = '14px sans-serif';
        ctx.fillText('Click "Run Lazy Evaluation" to start', w / 2, h / 2);
        return;
    }

    const plotWidth = w - padding * 2;
    const plotHeight = h - padding * 2 - 40;

    // Find time range
    const maxTime = Math.max(...evaluationEvents.map(e => e.time), 1);

    // Draw axes
    ctx.strokeStyle = 'rgba(20,184,166,0.3)';
    ctx.lineWidth = 1;

    // X axis
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#2dd4bf';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time (ms)', w / 2, h - 15);

    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Value Index', 0, 0);
    ctx.restore();

    // Time ticks
    for (let i = 0; i <= 5; i++) {
        const x = padding + (i / 5) * plotWidth;
        const time = (i / 5) * maxTime;

        ctx.fillStyle = '#2dd4bf';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(time.toFixed(0), x, h - padding + 15);

        ctx.strokeStyle = 'rgba(20,184,166,0.1)';
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, h - padding);
        ctx.stroke();
    }

    // Draw events
    const maxIndex = Math.max(...evaluationEvents.map(e => e.index), 1);

    evaluationEvents.forEach((event, idx) => {
        const x = padding + (event.time / maxTime) * plotWidth;
        const y = h - padding - (event.index / maxIndex) * plotHeight;

        // Point
        ctx.fillStyle = event.type === 'cache_hit' ? '#f97316' : '#14b8a6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Connect to previous
        if (idx > 0) {
            const prev = evaluationEvents[idx - 1];
            const prevX = padding + (prev.time / maxTime) * plotWidth;
            const prevY = h - padding - (prev.index / maxIndex) * plotHeight;

            ctx.strokeStyle = 'rgba(20,184,166,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    });

    // Legend
    const legendY = 50;
    const legendItems = [
        { color: '#14b8a6', label: 'Computed' },
        { color: '#f97316', label: 'Cache Hit' }
    ];

    let legendX = w - 150;
    ctx.font = '10px sans-serif';
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(legendX, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2dd4bf';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legendX + 10, legendY + 4);
        legendX += 70;
    });

    // Stats summary
    const computed = evaluationEvents.filter(e => e.type === 'compute').length;
    const cached = evaluationEvents.filter(e => e.type === 'cache_hit').length;

    ctx.fillStyle = '#99f6e4';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Computed: ${computed} | Cached: ${cached}`, padding, h - 5);
}

function reset() {
    terminateWorker();
    evaluationEvents = [];
    receivedValues = [];
    eagerTime = null;

    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    valuesComputedEl.textContent = '-';
    valuesRequestedEl.textContent = '-';
    cacheHitsEl.textContent = '-';
    lazyTimeEl.textContent = '-';
    eagerTimeEl.textContent = '-';
    memorySavedEl.textContent = '-';
    computationsSavedEl.textContent = '-';
    efficiencyEl.textContent = '-';
    valuesList.innerHTML = '';

    drawVisualization();
}

// Event Listeners
scenarioSelect.addEventListener('change', updateScenarioDisplay);
runLazyBtn.addEventListener('click', runLazy);
compareEagerBtn.addEventListener('click', runEager);
resetBtn.addEventListener('click', reset);

// Initialize
updateScenarioDisplay();
drawVisualization();
