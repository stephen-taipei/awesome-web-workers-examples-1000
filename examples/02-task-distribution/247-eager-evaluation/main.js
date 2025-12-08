// Eager Evaluation - Main Thread

const scenarioSelect = document.getElementById('scenarioSelect');
const scenarioDescription = document.getElementById('scenarioDescription');
const tableSizeInput = document.getElementById('tableSize');
const accessCountInput = document.getElementById('accessCount');
const computeComplexitySelect = document.getElementById('computeComplexity');
const parallelWorkersInput = document.getElementById('parallelWorkers');

const runEagerBtn = document.getElementById('runEagerBtn');
const compareLazyBtn = document.getElementById('compareLazyBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const valuesComputedEl = document.getElementById('valuesComputed');
const valuesAccessedEl = document.getElementById('valuesAccessed');
const initTimeEl = document.getElementById('initTime');
const accessTimeEl = document.getElementById('accessTime');
const lazyTimeEl = document.getElementById('lazyTime');
const eagerTotalTimeEl = document.getElementById('eagerTotalTime');
const avgLatencyEl = document.getElementById('avgLatency');
const utilizationEl = document.getElementById('utilization');
const accessPattern = document.getElementById('accessPattern');

const canvas = document.getElementById('eagerCanvas');
const ctx = canvas.getContext('2d');

let workers = [];
let computationEvents = [];
let accessEvents = [];
let lookupTable = null;
let eagerStartTime = 0;
let initEndTime = 0;
let lazyTotalTime = null;

const scenarios = {
    lookup: {
        name: 'Lookup Table',
        description: `Pre-compute a lookup table for fast access.
All values computed upfront during initialization.
Access is O(1) after initialization.`
    },
    precompute: {
        name: 'Pre-computed Results',
        description: `Pre-compute expensive function results.
Trade initialization time for instant access.
Ideal for frequently accessed values.`
    },
    cache: {
        name: 'Cache Warming',
        description: `Warm cache with anticipated data.
Load all potential data before it's needed.
Eliminates cache misses at runtime.`
    },
    initialization: {
        name: 'System Initialization',
        description: `Initialize system state eagerly.
All configurations and data loaded at startup.
Ensures consistent system state.`
    }
};

function updateScenarioDisplay() {
    const selected = scenarioSelect.value;
    scenarioDescription.textContent = scenarios[selected].description;
}

function terminateAllWorkers() {
    workers.forEach(w => {
        if (w) w.terminate();
    });
    workers = [];
}

function runEager() {
    const tableSize = parseInt(tableSizeInput.value);
    const accessCount = parseInt(accessCountInput.value);
    const complexity = computeComplexitySelect.value;
    const parallelWorkers = parseInt(parallelWorkersInput.value);
    const scenario = scenarioSelect.value;

    terminateAllWorkers();
    computationEvents = [];
    accessEvents = [];
    lookupTable = null;

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Initializing lookup table (eager computation)...';

    eagerStartTime = performance.now();

    // Create workers for parallel eager computation
    const chunkSize = Math.ceil(tableSize / parallelWorkers);
    let completedWorkers = 0;
    let computedValues = [];

    for (let i = 0; i < parallelWorkers; i++) {
        const worker = new Worker('worker.js');
        workers.push(worker);

        const startIdx = i * chunkSize;
        const endIdx = Math.min(startIdx + chunkSize, tableSize);

        worker.onmessage = (e) => {
            const data = e.data;

            if (data.type === 'progress') {
                const overallProgress = (completedWorkers * chunkSize + data.computed) / tableSize * 100;
                progressBar.style.width = overallProgress + '%';
                progressText.textContent = `Computing: ${Math.round(overallProgress)}% (Worker ${i})`;

                // Track computation events
                computationEvents.push({
                    time: performance.now() - eagerStartTime,
                    workerId: i,
                    index: data.currentIndex,
                    type: 'compute'
                });

                drawVisualization();

            } else if (data.type === 'chunk_complete') {
                completedWorkers++;

                // Store computed values
                data.values.forEach((v, idx) => {
                    computedValues[startIdx + idx] = v;
                });

                if (completedWorkers === parallelWorkers) {
                    initEndTime = performance.now();
                    lookupTable = computedValues;
                    progressText.textContent = 'Initialization complete. Running access test...';

                    // Now run access phase
                    runAccessPhase(accessCount, scenario);
                }
            }
        };

        worker.postMessage({
            type: 'compute_chunk',
            scenario,
            startIdx,
            endIdx,
            complexity,
            workerId: i
        });
    }

    drawVisualization();
}

function runAccessPhase(accessCount, scenario) {
    const accessStartTime = performance.now();
    const accesses = [];
    const tableSize = lookupTable.length;

    // Generate random access pattern
    const accessIndices = [];
    for (let i = 0; i < accessCount; i++) {
        accessIndices.push(Math.floor(Math.random() * tableSize));
    }

    // Perform accesses
    accessIndices.forEach((index, i) => {
        const accessStart = performance.now();
        const value = lookupTable[index]; // O(1) access
        const accessEnd = performance.now();

        const latency = accessEnd - accessStart;
        accesses.push({
            index,
            value,
            latency,
            accessNumber: i + 1
        });

        accessEvents.push({
            time: accessEnd - eagerStartTime,
            index,
            latency,
            type: 'access'
        });
    });

    const accessEndTime = performance.now();

    showResults({
        tableSize,
        accessCount,
        accesses,
        initTime: initEndTime - eagerStartTime,
        accessTime: accessEndTime - accessStartTime,
        totalTime: accessEndTime - eagerStartTime
    });
}

function runLazy() {
    const tableSize = parseInt(tableSizeInput.value);
    const accessCount = parseInt(accessCountInput.value);
    const complexity = computeComplexitySelect.value;
    const scenario = scenarioSelect.value;

    progressContainer.classList.remove('hidden');
    progressText.textContent = 'Running lazy evaluation for comparison...';

    const worker = new Worker('worker.js');
    const lazyStart = performance.now();

    // Generate same random indices
    const accessIndices = [];
    for (let i = 0; i < accessCount; i++) {
        accessIndices.push(Math.floor(Math.random() * tableSize));
    }

    worker.onmessage = (e) => {
        if (e.data.type === 'lazy_complete') {
            lazyTotalTime = performance.now() - lazyStart;
            lazyTimeEl.textContent = lazyTotalTime.toFixed(2) + ' ms';
            worker.terminate();
            progressContainer.classList.add('hidden');

            // Update comparison
            const eagerTotal = parseFloat(eagerTotalTimeEl.textContent);
            if (!isNaN(eagerTotal)) {
                const diff = ((lazyTotalTime - eagerTotal) / lazyTotalTime * 100);
                if (diff > 0) {
                    utilizationEl.textContent = `Eager ${Math.abs(diff).toFixed(1)}% faster`;
                } else {
                    utilizationEl.textContent = `Lazy ${Math.abs(diff).toFixed(1)}% faster`;
                }
            }
        }
    };

    worker.postMessage({
        type: 'lazy_access',
        scenario,
        accessIndices,
        complexity
    });
}

function showResults(stats) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    valuesComputedEl.textContent = stats.tableSize.toLocaleString();
    valuesAccessedEl.textContent = stats.accessCount;
    initTimeEl.textContent = stats.initTime.toFixed(2) + ' ms';
    accessTimeEl.textContent = stats.accessTime.toFixed(4) + ' ms';

    eagerTotalTimeEl.textContent = stats.totalTime.toFixed(2) + ' ms';

    // Calculate average latency
    const avgLatency = stats.accesses.reduce((sum, a) => sum + a.latency, 0) / stats.accesses.length;
    avgLatencyEl.textContent = (avgLatency * 1000).toFixed(3) + ' μs';

    // Calculate utilization (accessed / computed)
    const uniqueAccessed = new Set(stats.accesses.map(a => a.index)).size;
    const utilization = (uniqueAccessed / stats.tableSize * 100).toFixed(1);
    utilizationEl.textContent = utilization + '%';

    if (lazyTotalTime) {
        lazyTimeEl.textContent = lazyTotalTime.toFixed(2) + ' ms';
    }

    renderAccessPattern(stats.accesses);
    drawVisualization();
}

function renderAccessPattern(accesses) {
    const displayAccesses = accesses.slice(0, 20);

    let html = '<table><tr><th>#</th><th>Index</th><th>Value</th><th>Latency</th></tr>';

    displayAccesses.forEach(a => {
        const latencyClass = a.latency < 0.01 ? 'latency-fast' :
                            a.latency < 0.1 ? 'latency-medium' : 'latency-slow';

        const displayValue = typeof a.value === 'number' ?
            a.value.toFixed(4) :
            JSON.stringify(a.value).substring(0, 20);

        html += `<tr>
            <td>${a.accessNumber}</td>
            <td>${a.index}</td>
            <td>${displayValue}</td>
            <td class="${latencyClass}">${(a.latency * 1000).toFixed(3)} μs</td>
        </tr>`;
    });

    if (accesses.length > 20) {
        html += `<tr><td colspan="4" style="color: #888;">... and ${accesses.length - 20} more accesses</td></tr>`;
    }

    html += '</table>';
    accessPattern.innerHTML = html;
}

function drawVisualization() {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#0f0a08';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Eager Evaluation: Init + Access Timeline', w / 2, 25);

    const plotWidth = w - padding * 2;
    const plotHeight = h - padding * 2 - 30;

    // Draw phases
    if (initEndTime > 0) {
        const initDuration = initEndTime - eagerStartTime;
        const totalDuration = Math.max(
            ...computationEvents.map(e => e.time),
            ...accessEvents.map(e => e.time),
            initDuration
        );

        const initWidth = (initDuration / totalDuration) * plotWidth;

        // Init phase background
        ctx.fillStyle = 'rgba(249,115,22,0.1)';
        ctx.fillRect(padding, padding, initWidth, plotHeight);

        // Phase labels
        ctx.fillStyle = '#f97316';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Initialization', padding + initWidth / 2, padding + 15);

        if (accessEvents.length > 0) {
            ctx.fillStyle = '#14b8a6';
            ctx.fillText('Access', padding + initWidth + (plotWidth - initWidth) / 2, padding + 15);
        }

        // Draw computation events
        const workerCount = parseInt(parallelWorkersInput.value);
        const laneHeight = (plotHeight - 30) / workerCount;

        computationEvents.forEach(event => {
            const x = padding + (event.time / totalDuration) * plotWidth;
            const y = padding + 30 + event.workerId * laneHeight + laneHeight / 2;

            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw access events
        accessEvents.forEach((event, idx) => {
            const x = padding + (event.time / totalDuration) * plotWidth;
            const y = padding + 30 + (idx % workerCount) * laneHeight + laneHeight / 2;

            ctx.fillStyle = '#14b8a6';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Worker lane labels
        for (let i = 0; i < workerCount; i++) {
            const y = padding + 30 + i * laneHeight + laneHeight / 2;
            ctx.fillStyle = '#fb923c';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`W${i}`, padding - 5, y + 4);

            // Lane separator
            ctx.strokeStyle = 'rgba(249,115,22,0.1)';
            ctx.beginPath();
            ctx.moveTo(padding, padding + 30 + (i + 1) * laneHeight);
            ctx.lineTo(w - padding, padding + 30 + (i + 1) * laneHeight);
            ctx.stroke();
        }

        // Time axis
        ctx.strokeStyle = 'rgba(249,115,22,0.3)';
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        // Time labels
        for (let i = 0; i <= 5; i++) {
            const x = padding + (i / 5) * plotWidth;
            const time = (i / 5) * totalDuration;

            ctx.fillStyle = '#fb923c';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(time.toFixed(0) + 'ms', x, h - padding + 15);
        }

    } else {
        ctx.fillStyle = '#555';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Click "Run Eager Evaluation" to start', w / 2, h / 2);
    }

    // Legend
    const legendY = h - 5;
    const legendItems = [
        { color: '#f97316', label: 'Compute' },
        { color: '#14b8a6', label: 'Access' }
    ];

    let legendX = padding;
    ctx.font = '10px sans-serif';
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(legendX, legendY - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legendX + 8, legendY);
        legendX += 80;
    });
}

function reset() {
    terminateAllWorkers();
    computationEvents = [];
    accessEvents = [];
    lookupTable = null;
    lazyTotalTime = null;
    initEndTime = 0;

    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    valuesComputedEl.textContent = '-';
    valuesAccessedEl.textContent = '-';
    initTimeEl.textContent = '-';
    accessTimeEl.textContent = '-';
    lazyTimeEl.textContent = '-';
    eagerTotalTimeEl.textContent = '-';
    avgLatencyEl.textContent = '-';
    utilizationEl.textContent = '-';
    accessPattern.innerHTML = '';

    drawVisualization();
}

// Event Listeners
scenarioSelect.addEventListener('change', updateScenarioDisplay);
runEagerBtn.addEventListener('click', runEager);
compareLazyBtn.addEventListener('click', runLazy);
resetBtn.addEventListener('click', reset);

// Initialize
updateScenarioDisplay();
drawVisualization();
