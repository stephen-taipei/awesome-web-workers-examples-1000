// Pipeline Parallelism - Main Thread

// DOM Elements
const pipelineTypeSelect = document.getElementById('pipelineType');
const stageDescription = document.getElementById('stageDescription');
const itemCountInput = document.getElementById('itemCount');
const stageDelayInput = document.getElementById('stageDelay');

const runPipelineBtn = document.getElementById('runPipelineBtn');
const runSequentialBtn = document.getElementById('runSequentialBtn');
const resetBtn = document.getElementById('resetBtn');

const pipelineVisualization = document.getElementById('pipelineVisualization');
const pipelineStages = document.getElementById('pipelineStages');
const pipelineItems = document.getElementById('pipelineItems');
const itemsInPipelineSpan = document.getElementById('itemsInPipeline');
const itemsCompletedSpan = document.getElementById('itemsCompleted');
const totalItemsSpan = document.getElementById('totalItems');
const currentThroughputSpan = document.getElementById('currentThroughput');

const resultContainer = document.getElementById('resultContainer');
const stageMetricsContainer = document.getElementById('stageMetrics');

const timelineCanvas = document.getElementById('timelineCanvas');
const ctx = timelineCanvas.getContext('2d');

// Pipeline configurations
const pipelineConfigs = {
    imageProcess: {
        name: 'Image Processing',
        stages: ['load', 'resize', 'filter', 'encode'],
        stageNames: ['Load', 'Resize', 'Filter', 'Encode'],
        description: 'Load image → Resize to target → Apply filters → Encode output'
    },
    dataETL: {
        name: 'Data ETL',
        stages: ['extract', 'validate', 'transform', 'load'],
        stageNames: ['Extract', 'Validate', 'Transform', 'Load'],
        description: 'Extract data → Validate records → Transform format → Load to destination'
    },
    textProcess: {
        name: 'Text Processing',
        stages: ['tokenize', 'normalize', 'analyze', 'index'],
        stageNames: ['Tokenize', 'Normalize', 'Analyze', 'Index'],
        description: 'Tokenize text → Normalize tokens → Analyze content → Index for search'
    }
};

// State
let stageWorkers = [];
let itemStates = {};
let stageQueues = [];
let completedItems = 0;
let startTime = 0;
let itemTimings = [];
let stageTimings = [];
let pipelineResults = null;
let sequentialResults = null;

const stageColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

// Initialize
function init() {
    pipelineTypeSelect.addEventListener('change', updateStageDescription);
    runPipelineBtn.addEventListener('click', runPipeline);
    runSequentialBtn.addEventListener('click', runSequential);
    resetBtn.addEventListener('click', reset);

    updateStageDescription();
    drawEmptyTimeline();
}

function updateStageDescription() {
    const config = pipelineConfigs[pipelineTypeSelect.value];

    let html = '';
    config.stageNames.forEach((name, i) => {
        html += `<div class="stage-item">
            <span class="stage-num">${i + 1}</span>
            <span>${name}</span>
            ${i < config.stageNames.length - 1 ? '<span class="stage-arrow">→</span>' : ''}
        </div>`;
    });

    stageDescription.innerHTML = html;
}

function createStageDisplay(config) {
    pipelineStages.innerHTML = '';
    config.stageNames.forEach((name, i) => {
        const div = document.createElement('div');
        div.className = 'pipeline-stage';
        div.id = `stage${i}`;
        div.innerHTML = `
            <span class="stage-name">${name}</span>
            <span class="stage-count" id="stageCount${i}">0</span>
        `;
        pipelineStages.appendChild(div);
    });
}

function createItemDisplay(count) {
    pipelineItems.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'pipeline-item waiting';
        div.id = `item${i}`;
        div.textContent = i + 1;
        pipelineItems.appendChild(div);
    }
}

async function runPipeline() {
    const config = pipelineConfigs[pipelineTypeSelect.value];
    const itemCount = parseInt(itemCountInput.value);
    const stageDelay = parseInt(stageDelayInput.value);

    resetState();
    pipelineVisualization.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    createStageDisplay(config);
    createItemDisplay(itemCount);
    totalItemsSpan.textContent = itemCount;

    // Initialize stage queues
    stageQueues = config.stages.map(() => []);
    stageTimings = config.stages.map(() => ({ totalTime: 0, itemCount: 0 }));

    // Create one worker per stage
    stageWorkers = config.stages.map((stage, index) => {
        const worker = new Worker('worker.js');

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'stageComplete') {
                handleStageComplete(msg, config);
            }
        };

        return worker;
    });

    startTime = performance.now();
    itemTimings = [];

    // Initialize all items
    for (let i = 0; i < itemCount; i++) {
        itemStates[i] = {
            id: i,
            currentStage: -1,
            startTime: 0,
            stageStartTimes: [],
            stageEndTimes: []
        };
    }

    // Start feeding items into the pipeline
    // Add items to the first stage queue
    for (let i = 0; i < itemCount; i++) {
        stageQueues[0].push(itemStates[i]);
    }

    // Process the pipeline
    await processPipelineQueues(config, stageDelay);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    pipelineResults = {
        mode: 'Pipeline',
        totalTime,
        itemCount,
        throughput: (itemCount / totalTime) * 1000,
        avgLatency: itemTimings.reduce((a, b) => a + b, 0) / itemTimings.length,
        stageTimings: stageTimings.map(s => s.totalTime / s.itemCount)
    };

    displayResults('pipeline');
    drawTimeline(config);

    // Cleanup
    stageWorkers.forEach(w => w.terminate());
    stageWorkers = [];
}

async function processPipelineQueues(config, stageDelay) {
    const itemCount = Object.keys(itemStates).length;

    return new Promise((resolve) => {
        const processNextInQueues = () => {
            // Process each stage queue
            for (let stageIndex = 0; stageIndex < config.stages.length; stageIndex++) {
                const worker = stageWorkers[stageIndex];
                const queue = stageQueues[stageIndex];

                // If worker is available and queue has items
                if (queue.length > 0 && !worker.busy) {
                    const item = queue.shift();
                    worker.busy = true;

                    item.currentStage = stageIndex;
                    item.stageStartTimes[stageIndex] = performance.now() - startTime;

                    if (stageIndex === 0) {
                        item.startTime = performance.now() - startTime;
                    }

                    updateItemDisplay(item.id, stageIndex);
                    updateStageCount();

                    worker.postMessage({
                        stage: config.stages[stageIndex],
                        stageIndex,
                        item,
                        pipelineType: pipelineTypeSelect.value,
                        stageDelay
                    });
                }
            }

            updateThroughput();

            // Continue processing if not done
            if (completedItems < itemCount) {
                setTimeout(processNextInQueues, 10);
            } else {
                resolve();
            }
        };

        processNextInQueues();
    });
}

function handleStageComplete(msg, config) {
    const { stageIndex, itemId, result, processingTime } = msg;

    stageWorkers[stageIndex].busy = false;

    // Update timing
    stageTimings[stageIndex].totalTime += processingTime;
    stageTimings[stageIndex].itemCount++;

    const item = itemStates[itemId];
    item.stageEndTimes[stageIndex] = performance.now() - startTime;

    // Move to next stage or complete
    if (stageIndex < config.stages.length - 1) {
        // Add to next stage queue
        const nextItem = { ...item, ...result };
        itemStates[itemId] = nextItem;
        stageQueues[stageIndex + 1].push(nextItem);
    } else {
        // Item completed all stages
        completedItems++;
        const latency = item.stageEndTimes[stageIndex] - item.startTime;
        itemTimings.push(latency);

        updateItemDisplay(itemId, 'completed');
        itemsCompletedSpan.textContent = completedItems;
    }

    updateStageCount();
}

function updateItemDisplay(itemId, stage) {
    const itemEl = document.getElementById(`item${itemId}`);
    if (!itemEl) return;

    itemEl.className = 'pipeline-item';
    if (stage === 'completed') {
        itemEl.classList.add('completed');
    } else if (typeof stage === 'number') {
        itemEl.classList.add(`stage-${stage}`);
    }
}

function updateStageCount() {
    const config = pipelineConfigs[pipelineTypeSelect.value];

    let inPipeline = 0;
    config.stages.forEach((_, i) => {
        const count = stageQueues[i].length + (stageWorkers[i]?.busy ? 1 : 0);
        document.getElementById(`stageCount${i}`).textContent = count;
        document.getElementById(`stage${i}`).classList.toggle('active', count > 0);
        inPipeline += count;
    });

    itemsInPipelineSpan.textContent = inPipeline;
}

function updateThroughput() {
    const elapsed = performance.now() - startTime;
    if (elapsed > 0 && completedItems > 0) {
        const throughput = (completedItems / elapsed) * 1000;
        currentThroughputSpan.textContent = throughput.toFixed(1);
    }
}

async function runSequential() {
    const config = pipelineConfigs[pipelineTypeSelect.value];
    const itemCount = parseInt(itemCountInput.value);
    const stageDelay = parseInt(stageDelayInput.value);

    resetState();
    pipelineVisualization.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    createStageDisplay(config);
    createItemDisplay(itemCount);
    totalItemsSpan.textContent = itemCount;

    startTime = performance.now();
    itemTimings = [];
    stageTimings = config.stages.map(() => ({ totalTime: 0, itemCount: 0 }));

    // Process each item completely before starting the next
    for (let i = 0; i < itemCount; i++) {
        const itemStartTime = performance.now();
        let item = { id: i };

        for (let stageIndex = 0; stageIndex < config.stages.length; stageIndex++) {
            updateItemDisplay(i, stageIndex);
            updateStageDisplay(stageIndex, true);

            // Process stage
            const stageStart = performance.now();
            await processStageSequential(config.stages[stageIndex], stageIndex, item, stageDelay);
            const stageEnd = performance.now();

            stageTimings[stageIndex].totalTime += stageEnd - stageStart;
            stageTimings[stageIndex].itemCount++;

            updateStageDisplay(stageIndex, false);
        }

        completedItems++;
        itemsCompletedSpan.textContent = completedItems;
        updateItemDisplay(i, 'completed');

        const itemLatency = performance.now() - itemStartTime;
        itemTimings.push(itemLatency);

        updateThroughput();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    sequentialResults = {
        mode: 'Sequential',
        totalTime,
        itemCount,
        throughput: (itemCount / totalTime) * 1000,
        avgLatency: itemTimings.reduce((a, b) => a + b, 0) / itemTimings.length,
        stageTimings: stageTimings.map(s => s.totalTime / s.itemCount)
    };

    displayResults('sequential');
    drawTimeline(config);
}

function processStageSequential(stage, stageIndex, item, stageDelay) {
    return new Promise((resolve) => {
        const worker = new Worker('worker.js');

        worker.onmessage = (e) => {
            worker.terminate();
            resolve(e.data.result);
        };

        worker.postMessage({
            stage,
            stageIndex,
            item,
            pipelineType: pipelineTypeSelect.value,
            stageDelay
        });
    });
}

function updateStageDisplay(stageIndex, active) {
    const stageEl = document.getElementById(`stage${stageIndex}`);
    if (stageEl) {
        stageEl.classList.toggle('active', active);
        document.getElementById(`stageCount${stageIndex}`).textContent = active ? '1' : '0';
    }
}

function resetState() {
    stageWorkers.forEach(w => w.terminate());
    stageWorkers = [];
    itemStates = {};
    stageQueues = [];
    completedItems = 0;
    itemTimings = [];
    stageTimings = [];

    itemsCompletedSpan.textContent = '0';
    itemsInPipelineSpan.textContent = '0';
    currentThroughputSpan.textContent = '0';
}

function displayResults(mode) {
    resultContainer.classList.remove('hidden');

    const result = mode === 'pipeline' ? pipelineResults : sequentialResults;
    const config = pipelineConfigs[pipelineTypeSelect.value];

    document.getElementById('processingMode').textContent = result.mode;
    document.getElementById('totalTime').textContent = `${result.totalTime.toFixed(0)} ms`;
    document.getElementById('throughput').textContent = `${result.throughput.toFixed(2)} items/s`;
    document.getElementById('avgLatency').textContent = `${result.avgLatency.toFixed(0)} ms`;

    // Update comparison bars
    if (pipelineResults) {
        document.getElementById('pipelineTimeValue').textContent = `${pipelineResults.totalTime.toFixed(0)} ms`;
    }
    if (sequentialResults) {
        document.getElementById('sequentialTimeValue').textContent = `${sequentialResults.totalTime.toFixed(0)} ms`;
    }

    if (pipelineResults && sequentialResults) {
        const maxTime = Math.max(pipelineResults.totalTime, sequentialResults.totalTime);
        document.getElementById('pipelineBar').style.width = `${(pipelineResults.totalTime / maxTime) * 100}%`;
        document.getElementById('sequentialBar').style.width = `${(sequentialResults.totalTime / maxTime) * 100}%`;

        const speedup = sequentialResults.totalTime / pipelineResults.totalTime;
        document.getElementById('speedupValue').textContent = `${speedup.toFixed(2)}x`;
    } else {
        document.getElementById('pipelineBar').style.width = mode === 'pipeline' ? '100%' : '0%';
        document.getElementById('sequentialBar').style.width = mode === 'sequential' ? '100%' : '0%';
        document.getElementById('speedupValue').textContent = '-';
    }

    // Stage metrics
    stageMetricsContainer.innerHTML = '';
    result.stageTimings.forEach((time, i) => {
        const div = document.createElement('div');
        div.className = `metric-item stage-${i}`;
        div.innerHTML = `
            <span class="metric-name">${config.stageNames[i]}</span>
            <span class="metric-value">${time.toFixed(0)} ms avg</span>
        `;
        stageMetricsContainer.appendChild(div);
    });
}

function drawEmptyTimeline() {
    const w = timelineCanvas.width;
    const h = timelineCanvas.height;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run processing to see pipeline timeline', w / 2, h / 2);
}

function drawTimeline(config) {
    const w = timelineCanvas.width;
    const h = timelineCanvas.height;
    const padding = { top: 60, right: 30, bottom: 50, left: 60 };

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const result = pipelineResults || sequentialResults;
    if (!result) return;

    const chartWidth = w - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;
    const itemCount = Math.min(result.itemCount, 15); // Show max 15 items for clarity

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${result.mode} Processing Timeline`, w / 2, 25);

    const rowHeight = chartHeight / (itemCount + 1);
    const maxTime = result.totalTime;

    // Draw stage legend
    ctx.font = '10px sans-serif';
    let legendX = padding.left;
    config.stageNames.forEach((name, i) => {
        ctx.fillStyle = stageColors[i];
        ctx.fillRect(legendX, 40, 12, 12);
        ctx.fillStyle = '#a7f3d0';
        ctx.textAlign = 'left';
        ctx.fillText(name, legendX + 16, 50);
        legendX += 100;
    });

    // Draw items timeline
    const items = Object.values(itemStates).slice(0, itemCount);

    items.forEach((item, i) => {
        const y = padding.top + (i + 1) * rowHeight;

        // Item label
        ctx.fillStyle = '#4a7a5a';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Item ${item.id + 1}`, padding.left - 10, y + 4);

        // Draw each stage
        if (item.stageStartTimes && item.stageEndTimes) {
            for (let s = 0; s < config.stages.length; s++) {
                const start = item.stageStartTimes[s];
                const end = item.stageEndTimes[s];

                if (start !== undefined && end !== undefined) {
                    const x1 = padding.left + (start / maxTime) * chartWidth;
                    const x2 = padding.left + (end / maxTime) * chartWidth;

                    ctx.fillStyle = stageColors[s];
                    ctx.fillRect(x1, y - rowHeight * 0.3, Math.max(x2 - x1, 2), rowHeight * 0.6);
                }
            }
        }
    });

    // Time axis
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Time ticks
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (i / 5) * chartWidth;
        const time = (i / 5 * maxTime).toFixed(0);

        ctx.beginPath();
        ctx.moveTo(x, h - padding.bottom);
        ctx.lineTo(x, h - padding.bottom + 5);
        ctx.stroke();

        ctx.fillText(`${time}ms`, x, h - padding.bottom + 18);
    }

    // Pipeline overlap indicator
    if (result.mode === 'Pipeline' && items.length > 1) {
        ctx.fillStyle = '#10b981';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('↑ Overlapping execution', w - padding.right, h - 10);
    }
}

function reset() {
    resetState();
    pipelineResults = null;
    sequentialResults = null;

    pipelineVisualization.classList.add('hidden');
    resultContainer.classList.add('hidden');

    document.getElementById('pipelineBar').style.width = '0%';
    document.getElementById('sequentialBar').style.width = '0%';

    drawEmptyTimeline();
}

// Initialize on load
init();
