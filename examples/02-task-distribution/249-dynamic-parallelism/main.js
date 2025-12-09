// Dynamic Parallelism - Main Thread

const scalingStrategySelect = document.getElementById('scalingStrategy');
const minWorkersInput = document.getElementById('minWorkers');
const maxWorkersInput = document.getElementById('maxWorkers');
const taskCountInput = document.getElementById('taskCount');
const taskVariabilitySelect = document.getElementById('taskVariability');
const scalingIntervalInput = document.getElementById('scalingInterval');
const targetLatencyInput = document.getElementById('targetLatency');

const runBtn = document.getElementById('runBtn');
const runStaticBtn = document.getElementById('runStaticBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const activeWorkersEl = document.getElementById('activeWorkers');
const queueLengthEl = document.getElementById('queueLength');
const currentThroughputEl = document.getElementById('currentThroughput');
const avgLatencyEl = document.getElementById('avgLatency');

const resultContainer = document.getElementById('resultContainer');
const totalTimeEl = document.getElementById('totalTime');
const tasksCompletedEl = document.getElementById('tasksCompleted');
const avgThroughputEl = document.getElementById('avgThroughput');
const peakWorkersEl = document.getElementById('peakWorkers');
const avgWorkersEl = document.getElementById('avgWorkers');
const scalingEventsEl = document.getElementById('scalingEvents');
const finalLatencyEl = document.getElementById('finalLatency');
const efficiencyScoreEl = document.getElementById('efficiencyScore');

const comparisonContainer = document.getElementById('comparisonContainer');
const comparisonResults = document.getElementById('comparisonResults');

const scalingCanvas = document.getElementById('scalingCanvas');
const scalingCtx = scalingCanvas.getContext('2d');
const historyCanvas = document.getElementById('historyCanvas');
const historyCtx = historyCanvas.getContext('2d');

// State
let workers = [];
let taskQueue = [];
let completedTasks = [];
let scalingHistory = [];
let metricsHistory = [];
let isRunning = false;
let scalingTimer = null;
let metricsTimer = null;
let startTime = 0;

// Configuration
let config = {
    minWorkers: 1,
    maxWorkers: 8,
    strategy: 'efficiency',
    targetLatency: 100,
    scalingInterval: 200
};

function generateTasks(count, variability) {
    const tasks = [];

    for (let i = 0; i < count; i++) {
        let complexity;

        switch (variability) {
            case 'uniform':
                complexity = 500;
                break;
            case 'normal':
                // Normal distribution around 500
                complexity = Math.round(gaussianRandom(500, 150));
                break;
            case 'bimodal':
                // Mix of light and heavy tasks
                complexity = Math.random() < 0.7 ? Math.round(gaussianRandom(200, 50)) : Math.round(gaussianRandom(800, 100));
                break;
            case 'heavy_tail':
                // Mostly light with occasional very heavy tasks
                complexity = Math.random() < 0.9 ? Math.round(100 + Math.random() * 200) : Math.round(1000 + Math.random() * 1000);
                break;
            default:
                complexity = 500;
        }

        tasks.push({
            id: i,
            complexity: Math.max(50, Math.min(2000, complexity)),
            createdAt: 0,
            startedAt: null,
            completedAt: null
        });
    }

    return tasks;
}

function gaussianRandom(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}

function createWorker(id) {
    const worker = new Worker('worker.js');
    worker.id = id;
    worker.busy = false;
    worker.currentTask = null;
    worker.tasksCompleted = 0;

    worker.onmessage = (e) => {
        if (e.data.type === 'result') {
            handleTaskComplete(worker, e.data);
        }
    };

    return worker;
}

function handleTaskComplete(worker, result) {
    const task = worker.currentTask;
    if (task) {
        task.completedAt = performance.now() - startTime;
        task.latency = task.completedAt - task.startedAt;
        completedTasks.push(task);
    }

    worker.busy = false;
    worker.currentTask = null;
    worker.tasksCompleted++;

    updateProgress();
    assignNextTask(worker);
}

function assignNextTask(worker) {
    if (!isRunning || taskQueue.length === 0) return;

    const task = taskQueue.shift();
    task.startedAt = performance.now() - startTime;

    worker.busy = true;
    worker.currentTask = task;

    worker.postMessage({
        type: 'process',
        taskId: task.id,
        complexity: task.complexity
    });
}

function scaleWorkers() {
    if (!isRunning) return;

    const currentWorkers = workers.length;
    const busyWorkers = workers.filter(w => w.busy).length;
    const queueLength = taskQueue.length;
    const recentLatencies = completedTasks.slice(-20).map(t => t.latency);
    const avgLatency = recentLatencies.length > 0 ? recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length : 0;

    let targetWorkers = currentWorkers;

    switch (config.strategy) {
        case 'throughput':
            // Maximize throughput: scale up if queue is building
            if (queueLength > currentWorkers * 2 && currentWorkers < config.maxWorkers) {
                targetWorkers = Math.min(config.maxWorkers, currentWorkers + 2);
            } else if (queueLength === 0 && busyWorkers < currentWorkers / 2) {
                targetWorkers = Math.max(config.minWorkers, currentWorkers - 1);
            }
            break;

        case 'latency':
            // Meet latency target: scale based on latency
            if (avgLatency > config.targetLatency && currentWorkers < config.maxWorkers) {
                targetWorkers = Math.min(config.maxWorkers, currentWorkers + 1);
            } else if (avgLatency < config.targetLatency * 0.5 && currentWorkers > config.minWorkers) {
                targetWorkers = Math.max(config.minWorkers, currentWorkers - 1);
            }
            break;

        case 'efficiency':
            // Balance throughput and resource usage
            const utilization = busyWorkers / currentWorkers;
            if (utilization > 0.9 && queueLength > currentWorkers && currentWorkers < config.maxWorkers) {
                targetWorkers = currentWorkers + 1;
            } else if (utilization < 0.5 && currentWorkers > config.minWorkers) {
                targetWorkers = currentWorkers - 1;
            }
            break;

        case 'aggressive':
            // Aggressively scale to match queue
            if (queueLength > 0) {
                targetWorkers = Math.min(config.maxWorkers, Math.max(config.minWorkers, Math.ceil(queueLength / 3)));
            } else {
                targetWorkers = config.minWorkers;
            }
            break;
    }

    if (targetWorkers !== currentWorkers) {
        adjustWorkers(targetWorkers);
        scalingHistory.push({
            time: performance.now() - startTime,
            from: currentWorkers,
            to: targetWorkers,
            reason: config.strategy,
            queueLength,
            avgLatency
        });
    }

    // Record metrics
    metricsHistory.push({
        time: performance.now() - startTime,
        workers: workers.length,
        busyWorkers,
        queueLength,
        avgLatency,
        throughput: calculateThroughput()
    });
}

function adjustWorkers(targetCount) {
    const currentCount = workers.length;

    if (targetCount > currentCount) {
        // Scale up
        for (let i = currentCount; i < targetCount; i++) {
            const worker = createWorker(i);
            workers.push(worker);
            assignNextTask(worker);
        }
    } else if (targetCount < currentCount) {
        // Scale down - remove idle workers first
        const idleWorkers = workers.filter(w => !w.busy);
        const toRemove = currentCount - targetCount;

        for (let i = 0; i < Math.min(toRemove, idleWorkers.length); i++) {
            const worker = idleWorkers[i];
            worker.terminate();
            workers = workers.filter(w => w !== worker);
        }
    }
}

function calculateThroughput() {
    const elapsed = performance.now() - startTime;
    if (elapsed < 100) return 0;
    return (completedTasks.length / elapsed) * 1000;
}

function updateProgress() {
    const total = completedTasks.length + taskQueue.length;
    const percent = total > 0 ? (completedTasks.length / total) * 100 : 0;

    progressBar.style.width = `${percent}%`;
    progressText.textContent = `Completed ${completedTasks.length} / ${total} tasks`;
}

function updateMetricsDisplay() {
    if (!isRunning) return;

    const busyWorkers = workers.filter(w => w.busy).length;
    const recentLatencies = completedTasks.slice(-10).map(t => t.latency);
    const avgLatency = recentLatencies.length > 0 ? recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length : 0;

    activeWorkersEl.textContent = workers.length;
    queueLengthEl.textContent = taskQueue.length;
    currentThroughputEl.textContent = `${calculateThroughput().toFixed(1)}/s`;
    avgLatencyEl.textContent = `${avgLatency.toFixed(0)}ms`;

    drawScalingChart();
}

function drawScalingChart() {
    const w = scalingCanvas.width;
    const h = scalingCanvas.height;
    const padding = 40;

    scalingCtx.fillStyle = '#080f08';
    scalingCtx.fillRect(0, 0, w, h);

    if (metricsHistory.length < 2) {
        scalingCtx.fillStyle = '#4a7a5a';
        scalingCtx.font = '14px sans-serif';
        scalingCtx.textAlign = 'center';
        scalingCtx.fillText('Metrics will appear here during execution', w / 2, h / 2);
        return;
    }

    const maxTime = Math.max(...metricsHistory.map(m => m.time), 1);
    const maxWorkers = config.maxWorkers + 1;
    const maxQueue = Math.max(...metricsHistory.map(m => m.queueLength), 10);

    const timeScale = (w - padding * 2) / maxTime;
    const workerScale = (h - padding * 2) / maxWorkers;
    const queueScale = (h - padding * 2) / maxQueue;

    // Grid
    scalingCtx.strokeStyle = '#1a3a2a';
    scalingCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + i * (h - padding * 2) / 5;
        scalingCtx.beginPath();
        scalingCtx.moveTo(padding, y);
        scalingCtx.lineTo(w - padding, y);
        scalingCtx.stroke();
    }

    // Worker count line (green)
    scalingCtx.strokeStyle = '#10b981';
    scalingCtx.lineWidth = 2;
    scalingCtx.beginPath();
    metricsHistory.forEach((m, i) => {
        const x = padding + m.time * timeScale;
        const y = h - padding - m.workers * workerScale;
        if (i === 0) scalingCtx.moveTo(x, y);
        else scalingCtx.lineTo(x, y);
    });
    scalingCtx.stroke();

    // Queue length line (orange)
    scalingCtx.strokeStyle = '#f59e0b';
    scalingCtx.lineWidth = 2;
    scalingCtx.beginPath();
    metricsHistory.forEach((m, i) => {
        const x = padding + m.time * timeScale;
        const y = h - padding - m.queueLength * queueScale;
        if (i === 0) scalingCtx.moveTo(x, y);
        else scalingCtx.lineTo(x, y);
    });
    scalingCtx.stroke();

    // Legend
    scalingCtx.font = '10px sans-serif';
    scalingCtx.fillStyle = '#10b981';
    scalingCtx.fillRect(w - 120, 10, 10, 10);
    scalingCtx.fillText('Workers', w - 105, 18);
    scalingCtx.fillStyle = '#f59e0b';
    scalingCtx.fillRect(w - 120, 25, 10, 10);
    scalingCtx.fillText('Queue', w - 105, 33);

    // Axes labels
    scalingCtx.fillStyle = '#4a7a5a';
    scalingCtx.textAlign = 'center';
    scalingCtx.fillText('Time (ms)', w / 2, h - 5);
}

function drawHistoryChart() {
    const w = historyCanvas.width;
    const h = historyCanvas.height;
    const padding = 40;

    historyCtx.fillStyle = '#080f08';
    historyCtx.fillRect(0, 0, w, h);

    if (metricsHistory.length < 2) return;

    const maxTime = Math.max(...metricsHistory.map(m => m.time), 1);
    const maxThroughput = Math.max(...metricsHistory.map(m => m.throughput), 1);
    const maxLatency = Math.max(...metricsHistory.filter(m => m.avgLatency > 0).map(m => m.avgLatency), 100);

    const timeScale = (w - padding * 2) / maxTime;
    const throughputScale = (h - padding * 2) / maxThroughput;
    const latencyScale = (h - padding * 2) / maxLatency;

    // Throughput line (cyan)
    historyCtx.strokeStyle = '#06b6d4';
    historyCtx.lineWidth = 2;
    historyCtx.beginPath();
    metricsHistory.forEach((m, i) => {
        const x = padding + m.time * timeScale;
        const y = h - padding - m.throughput * throughputScale;
        if (i === 0) historyCtx.moveTo(x, y);
        else historyCtx.lineTo(x, y);
    });
    historyCtx.stroke();

    // Latency line (pink)
    historyCtx.strokeStyle = '#ec4899';
    historyCtx.lineWidth = 2;
    historyCtx.beginPath();
    let started = false;
    metricsHistory.forEach((m) => {
        if (m.avgLatency > 0) {
            const x = padding + m.time * timeScale;
            const y = h - padding - m.avgLatency * latencyScale;
            if (!started) { historyCtx.moveTo(x, y); started = true; }
            else historyCtx.lineTo(x, y);
        }
    });
    historyCtx.stroke();

    // Scaling events markers
    historyCtx.fillStyle = '#8b5cf6';
    scalingHistory.forEach(event => {
        const x = padding + event.time * timeScale;
        historyCtx.beginPath();
        historyCtx.arc(x, padding + 10, 4, 0, Math.PI * 2);
        historyCtx.fill();
    });

    // Legend
    historyCtx.font = '10px sans-serif';
    historyCtx.fillStyle = '#06b6d4';
    historyCtx.fillRect(w - 130, 10, 10, 10);
    historyCtx.fillText('Throughput', w - 115, 18);
    historyCtx.fillStyle = '#ec4899';
    historyCtx.fillRect(w - 130, 25, 10, 10);
    historyCtx.fillText('Latency', w - 115, 33);
    historyCtx.fillStyle = '#8b5cf6';
    historyCtx.fillRect(w - 130, 40, 10, 10);
    historyCtx.fillText('Scale Event', w - 115, 48);
}

function displayResults(totalTime, isDynamic) {
    resultContainer.classList.remove('hidden');

    const latencies = completedTasks.map(t => t.latency).filter(l => l > 0);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const avgThroughput = completedTasks.length / (totalTime / 1000);

    const workerCounts = metricsHistory.map(m => m.workers);
    const peakWorkers = Math.max(...workerCounts);
    const avgWorkers = workerCounts.reduce((a, b) => a + b, 0) / workerCounts.length;

    // Efficiency = throughput / avg workers
    const efficiencyScore = avgThroughput / avgWorkers;

    totalTimeEl.textContent = `${totalTime.toFixed(0)} ms`;
    tasksCompletedEl.textContent = completedTasks.length;
    avgThroughputEl.textContent = `${avgThroughput.toFixed(1)}/s`;
    peakWorkersEl.textContent = peakWorkers;
    avgWorkersEl.textContent = avgWorkers.toFixed(1);
    scalingEventsEl.textContent = scalingHistory.length;
    finalLatencyEl.textContent = `${avgLatency.toFixed(0)} ms`;
    efficiencyScoreEl.textContent = efficiencyScore.toFixed(2);

    drawHistoryChart();

    return {
        totalTime,
        tasksCompleted: completedTasks.length,
        avgThroughput,
        peakWorkers,
        avgWorkers,
        scalingEvents: scalingHistory.length,
        avgLatency,
        efficiencyScore,
        isDynamic
    };
}

async function run(dynamic = true) {
    // Reset state
    cleanup();
    isRunning = true;

    config = {
        minWorkers: parseInt(minWorkersInput.value),
        maxWorkers: parseInt(maxWorkersInput.value),
        strategy: scalingStrategySelect.value,
        targetLatency: parseInt(targetLatencyInput.value),
        scalingInterval: parseInt(scalingIntervalInput.value)
    };

    const taskCount = parseInt(taskCountInput.value);
    const variability = taskVariabilitySelect.value;

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');

    // Generate tasks
    taskQueue = generateTasks(taskCount, variability);
    completedTasks = [];
    scalingHistory = [];
    metricsHistory = [];

    startTime = performance.now();

    // Initialize workers
    const initialWorkers = dynamic ? config.minWorkers : config.maxWorkers;
    for (let i = 0; i < initialWorkers; i++) {
        workers.push(createWorker(i));
    }

    // Start task assignment
    workers.forEach(w => assignNextTask(w));

    // Start scaling (only for dynamic mode)
    if (dynamic) {
        scalingTimer = setInterval(scaleWorkers, config.scalingInterval);
    }

    // Start metrics collection
    metricsTimer = setInterval(updateMetricsDisplay, 100);

    // Wait for completion
    return new Promise((resolve) => {
        const checkComplete = setInterval(() => {
            if (taskQueue.length === 0 && workers.every(w => !w.busy)) {
                clearInterval(checkComplete);
                isRunning = false;

                if (scalingTimer) clearInterval(scalingTimer);
                if (metricsTimer) clearInterval(metricsTimer);

                const totalTime = performance.now() - startTime;
                const result = displayResults(totalTime, dynamic);

                cleanup();
                resolve(result);
            }
        }, 50);
    });
}

async function compare() {
    // Run dynamic first
    const dynamicResult = await run(true);

    // Then run static
    const staticResult = await run(false);

    // Show comparison
    comparisonContainer.classList.remove('hidden');

    const dynamicWins = dynamicResult.efficiencyScore > staticResult.efficiencyScore;

    comparisonResults.innerHTML = `
        <div class="comparison-card ${dynamicWins ? 'winner' : ''}">
            <h4>Dynamic Scaling ${dynamicWins ? '<span class="winner-badge">WINNER</span>' : ''}</h4>
            <div class="stat-row">
                <span class="stat-label">Total Time</span>
                <span class="stat-value">${dynamicResult.totalTime.toFixed(0)} ms</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Throughput</span>
                <span class="stat-value">${dynamicResult.avgThroughput.toFixed(1)}/s</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Workers</span>
                <span class="stat-value">${dynamicResult.avgWorkers.toFixed(1)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Latency</span>
                <span class="stat-value">${dynamicResult.avgLatency.toFixed(0)} ms</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Efficiency Score</span>
                <span class="stat-value">${dynamicResult.efficiencyScore.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Scaling Events</span>
                <span class="stat-value">${dynamicResult.scalingEvents}</span>
            </div>
        </div>
        <div class="comparison-card ${!dynamicWins ? 'winner' : ''}">
            <h4>Static (Max Workers) ${!dynamicWins ? '<span class="winner-badge">WINNER</span>' : ''}</h4>
            <div class="stat-row">
                <span class="stat-label">Total Time</span>
                <span class="stat-value">${staticResult.totalTime.toFixed(0)} ms</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Throughput</span>
                <span class="stat-value">${staticResult.avgThroughput.toFixed(1)}/s</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Workers</span>
                <span class="stat-value">${staticResult.avgWorkers.toFixed(1)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Latency</span>
                <span class="stat-value">${staticResult.avgLatency.toFixed(0)} ms</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Efficiency Score</span>
                <span class="stat-value">${staticResult.efficiencyScore.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Scaling Events</span>
                <span class="stat-value">${staticResult.scalingEvents}</span>
            </div>
        </div>
    `;
}

function cleanup() {
    workers.forEach(w => w.terminate());
    workers = [];

    if (scalingTimer) {
        clearInterval(scalingTimer);
        scalingTimer = null;
    }
    if (metricsTimer) {
        clearInterval(metricsTimer);
        metricsTimer = null;
    }
}

function reset() {
    cleanup();
    isRunning = false;
    taskQueue = [];
    completedTasks = [];
    scalingHistory = [];
    metricsHistory = [];

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');

    activeWorkersEl.textContent = '0';
    queueLengthEl.textContent = '0';
    currentThroughputEl.textContent = '0/s';
    avgLatencyEl.textContent = '0ms';

    // Clear canvases
    scalingCtx.fillStyle = '#080f08';
    scalingCtx.fillRect(0, 0, scalingCanvas.width, scalingCanvas.height);
    scalingCtx.fillStyle = '#4a7a5a';
    scalingCtx.font = '14px sans-serif';
    scalingCtx.textAlign = 'center';
    scalingCtx.fillText('Metrics will appear here during execution', scalingCanvas.width / 2, scalingCanvas.height / 2);

    historyCtx.fillStyle = '#080f08';
    historyCtx.fillRect(0, 0, historyCanvas.width, historyCanvas.height);
}

runBtn.addEventListener('click', () => run(true));
runStaticBtn.addEventListener('click', compare);
resetBtn.addEventListener('click', reset);

// Initial state
reset();
