// Batch Parallelism - Main Thread

// DOM Elements
const taskTypeSelect = document.getElementById('taskType');
const totalItemsInput = document.getElementById('totalItems');
const workerCountInput = document.getElementById('workerCount');
const batchSizeInput = document.getElementById('batchSize');
const itemComplexitySelect = document.getElementById('itemComplexity');

const totalBatchesSpan = document.getElementById('totalBatches');
const itemsPerWorkerSpan = document.getElementById('itemsPerWorker');

const runBatchBtn = document.getElementById('runBatchBtn');
const runIndividualBtn = document.getElementById('runIndividualBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const overallProgressBar = document.getElementById('overallProgressBar');
const overallProgressText = document.getElementById('overallProgressText');
const workerProgressGrid = document.getElementById('workerProgressGrid');
const batchesCompletedSpan = document.getElementById('batchesCompleted');
const totalBatchCountSpan = document.getElementById('totalBatchCount');
const currentThroughputSpan = document.getElementById('currentThroughput');

const resultContainer = document.getElementById('resultContainer');

const performanceCanvas = document.getElementById('performanceCanvas');
const ctx = performanceCanvas.getContext('2d');

// State
let workers = [];
let processedItems = 0;
let completedBatches = 0;
let startTime = 0;
let throughputHistory = [];
let batchResults = null;
let individualResults = null;

// Colors for workers
const workerColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16', '#06b6d4'];

// Initialize
function init() {
    totalItemsInput.addEventListener('input', updateBatchInfo);
    workerCountInput.addEventListener('input', updateBatchInfo);
    batchSizeInput.addEventListener('input', updateBatchInfo);

    runBatchBtn.addEventListener('click', runBatchProcessing);
    runIndividualBtn.addEventListener('click', runIndividualProcessing);
    resetBtn.addEventListener('click', reset);

    updateBatchInfo();
    drawEmptyChart();
}

function updateBatchInfo() {
    const totalItems = parseInt(totalItemsInput.value);
    const workerCount = parseInt(workerCountInput.value);
    const batchSize = parseInt(batchSizeInput.value);

    const totalBatches = Math.ceil(totalItems / batchSize);
    const itemsPerWorker = Math.ceil(totalItems / workerCount);

    totalBatchesSpan.textContent = totalBatches;
    itemsPerWorkerSpan.textContent = itemsPerWorker;
}

function generateTestData(count) {
    const items = [];
    for (let i = 0; i < count; i++) {
        items.push({
            id: i,
            value: Math.random() * 255,
            data: Math.floor(Math.random() * 1000000),
            number: Math.random() * 1000
        });
    }
    return items;
}

function createWorkerProgressBars(count) {
    workerProgressGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'worker-progress';
        div.innerHTML = `
            <div class="worker-label">
                <span class="worker-name">Worker ${i + 1}</span>
                <span class="worker-status" id="workerStatus${i}">Idle</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar worker-${i}" id="workerBar${i}" style="width: 0%"></div>
            </div>
        `;
        workerProgressGrid.appendChild(div);
    }
}

// Batch Processing Mode
async function runBatchProcessing() {
    const totalItems = parseInt(totalItemsInput.value);
    const workerCount = parseInt(workerCountInput.value);
    const batchSize = parseInt(batchSizeInput.value);
    const taskType = taskTypeSelect.value;
    const complexity = itemComplexitySelect.value;

    resetState();
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    createWorkerProgressBars(workerCount);

    const items = generateTestData(totalItems);
    const batches = [];

    // Create batches
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }

    totalBatchCountSpan.textContent = batches.length;
    startTime = performance.now();

    // Create worker pool
    const workerPromises = [];
    const batchQueue = [...batches.map((b, i) => ({ batch: b, id: i }))];
    let batchIndex = 0;
    const workerStats = Array(workerCount).fill(null).map(() => ({ itemsProcessed: 0, time: 0 }));

    for (let i = 0; i < workerCount; i++) {
        const promise = new Promise((resolve) => {
            const worker = new Worker('worker.js');
            workers.push(worker);

            const processNextBatch = () => {
                if (batchQueue.length === 0) {
                    resolve();
                    return;
                }

                const { batch, id } = batchQueue.shift();
                worker.postMessage({
                    mode: 'batch',
                    taskType,
                    items: batch,
                    complexity,
                    batchId: id,
                    workerId: i
                });
            };

            worker.onmessage = (e) => {
                const msg = e.data;

                if (msg.type === 'batchProgress') {
                    updateWorkerProgress(msg.workerId, msg.progress * 100);
                } else if (msg.type === 'batchComplete') {
                    processedItems += msg.itemCount;
                    completedBatches++;
                    workerStats[msg.workerId].itemsProcessed += msg.itemCount;
                    workerStats[msg.workerId].time += msg.processingTime;

                    updateOverallProgress();
                    updateThroughput();

                    processNextBatch();
                }
            };

            processNextBatch();
        });
        workerPromises.push(promise);
    }

    await Promise.all(workerPromises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    batchResults = {
        mode: 'Batch',
        totalTime,
        itemsProcessed: processedItems,
        throughput: (processedItems / totalTime) * 1000,
        overhead: calculateOverhead(batches.length, totalTime, processedItems)
    };

    displayResults('batch');
    drawPerformanceChart();

    // Cleanup
    workers.forEach(w => w.terminate());
    workers = [];
}

// Individual Processing Mode
async function runIndividualProcessing() {
    const totalItems = parseInt(totalItemsInput.value);
    const workerCount = parseInt(workerCountInput.value);
    const taskType = taskTypeSelect.value;
    const complexity = itemComplexitySelect.value;

    resetState();
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    createWorkerProgressBars(workerCount);

    const items = generateTestData(totalItems);

    // Distribute items across workers (still batched for distribution, but processed individually)
    const itemsPerWorker = Math.ceil(items.length / workerCount);

    totalBatchCountSpan.textContent = totalItems;
    batchesCompletedSpan.textContent = '0';
    startTime = performance.now();

    const workerPromises = [];

    for (let i = 0; i < workerCount; i++) {
        const workerItems = items.slice(i * itemsPerWorker, (i + 1) * itemsPerWorker);
        if (workerItems.length === 0) continue;

        const promise = new Promise((resolve) => {
            const worker = new Worker('worker.js');
            workers.push(worker);

            let workerProcessed = 0;

            worker.onmessage = (e) => {
                const msg = e.data;

                if (msg.type === 'itemComplete') {
                    processedItems++;
                    workerProcessed++;
                    completedBatches++;

                    // Update progress less frequently to reduce overhead
                    if (workerProcessed % 10 === 0) {
                        updateWorkerProgress(msg.workerId, (workerProcessed / workerItems.length) * 100);
                        updateOverallProgress();
                    }

                    if (processedItems % 50 === 0) {
                        updateThroughput();
                    }
                } else if (msg.type === 'workerComplete') {
                    updateWorkerProgress(msg.workerId, 100);
                    updateOverallProgress();
                    resolve();
                }
            };

            worker.postMessage({
                mode: 'individual',
                taskType,
                items: workerItems,
                complexity,
                workerId: i
            });
        });
        workerPromises.push(promise);
    }

    await Promise.all(workerPromises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    individualResults = {
        mode: 'Individual',
        totalTime,
        itemsProcessed: processedItems,
        throughput: (processedItems / totalTime) * 1000,
        overhead: calculateOverhead(totalItems, totalTime, processedItems)
    };

    displayResults('individual');
    drawPerformanceChart();

    // Cleanup
    workers.forEach(w => w.terminate());
    workers = [];
}

function resetState() {
    processedItems = 0;
    completedBatches = 0;
    throughputHistory = [];
    overallProgressBar.style.width = '0%';
}

function updateWorkerProgress(workerId, percent) {
    const bar = document.getElementById(`workerBar${workerId}`);
    const status = document.getElementById(`workerStatus${workerId}`);
    if (bar) bar.style.width = `${percent}%`;
    if (status) status.textContent = percent >= 100 ? 'Done' : `${percent.toFixed(0)}%`;
}

function updateOverallProgress() {
    const totalItems = parseInt(totalItemsInput.value);
    const percent = (processedItems / totalItems) * 100;
    overallProgressBar.style.width = `${percent}%`;
    overallProgressText.textContent = `${processedItems} / ${totalItems} items processed`;
    batchesCompletedSpan.textContent = completedBatches;
}

function updateThroughput() {
    const elapsed = performance.now() - startTime;
    const throughput = (processedItems / elapsed) * 1000;
    currentThroughputSpan.textContent = throughput.toFixed(0);

    throughputHistory.push({
        time: elapsed,
        throughput,
        items: processedItems
    });
}

function calculateOverhead(messageCount, totalTime, itemsProcessed) {
    // Estimate overhead as time not spent processing
    // More messages = more overhead
    const estimatedProcessingTime = itemsProcessed * 0.5; // baseline per item
    const overhead = Math.max(0, totalTime - estimatedProcessingTime);
    return overhead / totalTime * 100;
}

function displayResults(mode) {
    resultContainer.classList.remove('hidden');

    const result = mode === 'batch' ? batchResults : individualResults;

    document.getElementById('processingMode').textContent = result.mode;
    document.getElementById('totalTime').textContent = `${result.totalTime.toFixed(0)} ms`;
    document.getElementById('throughput').textContent = `${result.throughput.toFixed(0)} items/s`;
    document.getElementById('overhead').textContent = `${result.overhead.toFixed(1)}%`;

    // Update comparison
    if (batchResults) {
        document.getElementById('batchTime').textContent = `${batchResults.totalTime.toFixed(0)} ms`;
        document.getElementById('batchThroughput').textContent = `${batchResults.throughput.toFixed(0)} items/s`;
        document.getElementById('batchOverhead').textContent = `${batchResults.overhead.toFixed(1)}%`;
        document.getElementById('batchResult').classList.add('active');
    }

    if (individualResults) {
        document.getElementById('individualTime').textContent = `${individualResults.totalTime.toFixed(0)} ms`;
        document.getElementById('individualThroughput').textContent = `${individualResults.throughput.toFixed(0)} items/s`;
        document.getElementById('individualOverhead').textContent = `${individualResults.overhead.toFixed(1)}%`;
        document.getElementById('individualResult').classList.add('active');
    }

    // Calculate speedup
    if (batchResults && individualResults) {
        const speedup = individualResults.totalTime / batchResults.totalTime;
        document.getElementById('speedupValue').textContent = `${speedup.toFixed(2)}x`;
        document.getElementById('speedupDisplay').style.display = 'block';
    } else {
        document.getElementById('speedupDisplay').style.display = 'none';
    }
}

function drawEmptyChart() {
    const w = performanceCanvas.width;
    const h = performanceCanvas.height;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run processing to see performance chart', w / 2, h / 2);
}

function drawPerformanceChart() {
    const w = performanceCanvas.width;
    const h = performanceCanvas.height;
    const padding = { top: 50, right: 30, bottom: 60, left: 80 };

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    if (throughputHistory.length < 2) return;

    const chartWidth = w - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Throughput Over Time', w / 2, 25);

    // Find scales
    const maxTime = Math.max(...throughputHistory.map(h => h.time));
    const maxThroughput = Math.max(...throughputHistory.map(h => h.throughput));

    // Draw axes
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = h - padding.bottom - (i / 5) * chartHeight;
        const value = (i / 5 * maxThroughput).toFixed(0);
        ctx.fillText(`${value}`, padding.left - 10, y + 4);

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(42, 90, 58, 0.3)';
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }

    // X-axis labels
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (i / 5) * chartWidth;
        const time = (i / 5 * maxTime).toFixed(0);
        ctx.fillText(`${time}ms`, x, h - padding.bottom + 20);
    }

    // Axis titles
    ctx.fillStyle = '#34d399';
    ctx.font = '11px sans-serif';
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Throughput (items/s)', 0, 0);
    ctx.restore();

    ctx.fillText('Time (ms)', w / 2, h - 10);

    // Draw throughput line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;

    for (let i = 0; i < throughputHistory.length; i++) {
        const point = throughputHistory[i];
        const x = padding.left + (point.time / maxTime) * chartWidth;
        const y = h - padding.bottom - (point.throughput / maxThroughput) * chartHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw area under curve
    ctx.beginPath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.moveTo(padding.left, h - padding.bottom);
    for (let i = 0; i < throughputHistory.length; i++) {
        const point = throughputHistory[i];
        const x = padding.left + (point.time / maxTime) * chartWidth;
        const y = h - padding.bottom - (point.throughput / maxThroughput) * chartHeight;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartWidth, h - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Average throughput line
    const avgThroughput = throughputHistory.reduce((a, b) => a + b.throughput, 0) / throughputHistory.length;
    const avgY = h - padding.bottom - (avgThroughput / maxThroughput) * chartHeight;

    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.setLineDash([5, 5]);
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(w - padding.right, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.fillText(`Avg: ${avgThroughput.toFixed(0)} items/s`, w - padding.right - 100, avgY - 5);
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    processedItems = 0;
    completedBatches = 0;
    throughputHistory = [];
    batchResults = null;
    individualResults = null;

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    document.getElementById('batchResult').classList.remove('active');
    document.getElementById('individualResult').classList.remove('active');

    drawEmptyChart();
}

// Initialize on load
init();
