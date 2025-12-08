// Task Parallelism - Main Thread

// DOM Elements
const primeLimitInput = document.getElementById('primeLimit');
const matrixSizeInput = document.getElementById('matrixSize');
const fibCountInput = document.getElementById('fibCount');
const textLengthInput = document.getElementById('textLength');

const runParallelBtn = document.getElementById('runParallelBtn');
const runSequentialBtn = document.getElementById('runSequentialBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const resultContainer = document.getElementById('resultContainer');

const timelineCanvas = document.getElementById('timelineCanvas');
const ctx = timelineCanvas.getContext('2d');

// State
let workers = [];
let taskResults = {};
let taskTimings = {};
let executionMode = '';
let parallelTime = 0;
let sequentialTime = 0;
let startTimestamp = 0;

const taskColors = {
    primes: '#f59e0b',
    matrix: '#3b82f6',
    fibonacci: '#8b5cf6',
    text: '#ec4899'
};

const taskNames = {
    primes: 'A',
    matrix: 'B',
    fibonacci: 'C',
    text: 'D'
};

// Initialize
function init() {
    runParallelBtn.addEventListener('click', runParallel);
    runSequentialBtn.addEventListener('click', runSequential);
    resetBtn.addEventListener('click', reset);
    drawEmptyTimeline();
}

function getTaskParams() {
    return {
        primes: { limit: parseInt(primeLimitInput.value) },
        matrix: { size: parseInt(matrixSizeInput.value) },
        fibonacci: { count: parseInt(fibCountInput.value) },
        text: { length: parseInt(textLengthInput.value) }
    };
}

// Run tasks in parallel using multiple workers
async function runParallel() {
    executionMode = 'parallel';
    resetState();
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    const params = getTaskParams();
    const taskTypes = ['primes', 'matrix', 'fibonacci', 'text'];

    startTimestamp = performance.now();
    taskTimings = {};

    // Create workers for each task
    const promises = taskTypes.map(taskType => {
        return new Promise((resolve) => {
            const worker = new Worker('worker.js');
            workers.push(worker);

            taskTimings[taskType] = { start: performance.now() - startTimestamp, end: 0 };

            worker.onmessage = (e) => {
                const data = e.data;

                if (data.type === 'progress') {
                    updateProgress(data.taskType, data.percent);
                } else if (data.type === 'result') {
                    taskTimings[data.taskType].end = performance.now() - startTimestamp;
                    taskResults[data.taskType] = {
                        ...data.result,
                        time: data.executionTime
                    };
                    updateProgress(data.taskType, 100, 'Complete');
                    worker.terminate();
                    resolve();
                }
            };

            worker.postMessage({ taskType, params: params[taskType] });
        });
    });

    await Promise.all(promises);

    parallelTime = performance.now() - startTimestamp;
    workers = [];

    displayResults();
    drawTimeline();
}

// Run tasks sequentially (one after another)
async function runSequential() {
    executionMode = 'sequential';
    resetState();
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    const params = getTaskParams();
    const taskTypes = ['primes', 'matrix', 'fibonacci', 'text'];

    startTimestamp = performance.now();
    taskTimings = {};

    for (const taskType of taskTypes) {
        await new Promise((resolve) => {
            const worker = new Worker('worker.js');
            workers.push(worker);

            taskTimings[taskType] = { start: performance.now() - startTimestamp, end: 0 };

            worker.onmessage = (e) => {
                const data = e.data;

                if (data.type === 'progress') {
                    updateProgress(data.taskType, data.percent);
                } else if (data.type === 'result') {
                    taskTimings[data.taskType].end = performance.now() - startTimestamp;
                    taskResults[data.taskType] = {
                        ...data.result,
                        time: data.executionTime
                    };
                    updateProgress(data.taskType, 100, 'Complete');
                    worker.terminate();
                    resolve();
                }
            };

            worker.postMessage({ taskType, params: params[taskType] });
        });
    }

    sequentialTime = performance.now() - startTimestamp;
    workers = [];

    displayResults();
    drawTimeline();
}

function resetState() {
    taskResults = {};
    taskTimings = {};

    // Reset progress bars
    ['A', 'B', 'C', 'D'].forEach(id => {
        document.getElementById(`progressBar${id}`).style.width = '0%';
        document.getElementById(`status${id}`).textContent = 'Pending';
    });
}

function updateProgress(taskType, percent, status = null) {
    const taskId = taskNames[taskType];
    const progressBar = document.getElementById(`progressBar${taskId}`);
    const statusEl = document.getElementById(`status${taskId}`);

    progressBar.style.width = `${percent}%`;
    progressBar.className = `progress-bar task-${taskId.toLowerCase()}`;
    statusEl.textContent = status || `${percent}%`;
}

function displayResults() {
    resultContainer.classList.remove('hidden');

    // Calculate times
    const totalTaskTime = Object.values(taskResults).reduce((sum, r) => sum + r.time, 0);
    const actualTime = executionMode === 'parallel' ? parallelTime : sequentialTime;

    if (executionMode === 'parallel') {
        document.getElementById('parallelTime').textContent = `${parallelTime.toFixed(0)} ms`;

        // Estimate sequential time
        const estimatedSeq = totalTaskTime;
        document.getElementById('sequentialTime').textContent = `~${estimatedSeq.toFixed(0)} ms`;

        const speedup = estimatedSeq / parallelTime;
        document.getElementById('speedup').textContent = `${speedup.toFixed(2)}x`;

        const efficiency = (speedup / 4 * 100).toFixed(1);
        document.getElementById('efficiency').textContent = `${efficiency}%`;
    } else {
        document.getElementById('sequentialTime').textContent = `${sequentialTime.toFixed(0)} ms`;
        document.getElementById('parallelTime').textContent = '-';
        document.getElementById('speedup').textContent = '1.00x';
        document.getElementById('efficiency').textContent = '25%';
    }

    // Task-specific results
    if (taskResults.primes) {
        document.getElementById('primeCount').textContent = taskResults.primes.count;
        document.getElementById('primeTime').textContent = taskResults.primes.time.toFixed(1);
    }

    if (taskResults.matrix) {
        document.getElementById('matrixChecksum').textContent = taskResults.matrix.checksum;
        document.getElementById('matrixTime').textContent = taskResults.matrix.time.toFixed(1);
    }

    if (taskResults.fibonacci) {
        document.getElementById('fibSum').textContent = taskResults.fibonacci.digitSum;
        document.getElementById('fibTime').textContent = taskResults.fibonacci.time.toFixed(1);
    }

    if (taskResults.text) {
        document.getElementById('wordCount').textContent = taskResults.text.wordCount;
        document.getElementById('textTime').textContent = taskResults.text.time.toFixed(1);
    }
}

function drawEmptyTimeline() {
    const w = timelineCanvas.width;
    const h = timelineCanvas.height;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run tasks to see execution timeline', w / 2, h / 2);
}

function drawTimeline() {
    const w = timelineCanvas.width;
    const h = timelineCanvas.height;
    const padding = { top: 50, right: 30, bottom: 50, left: 120 };

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const tasks = ['primes', 'matrix', 'fibonacci', 'text'];
    const taskLabels = ['Task A: Primes', 'Task B: Matrix', 'Task C: Fibonacci', 'Task D: Text'];

    // Find max time
    const maxTime = Math.max(...Object.values(taskTimings).map(t => t.end));

    const chartWidth = w - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;
    const barHeight = chartHeight / 5;

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${executionMode === 'parallel' ? 'Parallel' : 'Sequential'} Execution Timeline`, w / 2, 25);

    // Draw task bars
    tasks.forEach((task, i) => {
        const timing = taskTimings[task];
        if (!timing) return;

        const y = padding.top + i * barHeight + barHeight * 0.5;

        // Task label
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(taskLabels[i], padding.left - 10, y + 5);

        // Bar
        const startX = padding.left + (timing.start / maxTime) * chartWidth;
        const endX = padding.left + (timing.end / maxTime) * chartWidth;
        const barWidth = Math.max(endX - startX, 2);

        // Bar background
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(padding.left, y - barHeight * 0.3, chartWidth, barHeight * 0.6);

        // Task bar
        ctx.fillStyle = taskColors[task];
        ctx.fillRect(startX, y - barHeight * 0.3, barWidth, barHeight * 0.6);

        // Time label
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        const duration = (timing.end - timing.start).toFixed(0);
        ctx.fillText(`${duration}ms`, endX + 5, y + 4);
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

    // Total time indicator
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    const totalTime = executionMode === 'parallel' ? parallelTime : sequentialTime;
    ctx.fillText(`Total: ${totalTime.toFixed(0)}ms`, w - padding.right, h - 10);

    // Legend
    ctx.font = '10px sans-serif';
    let legendX = padding.left;
    tasks.forEach((task, i) => {
        ctx.fillStyle = taskColors[task];
        ctx.fillRect(legendX, h - 15, 12, 12);
        ctx.fillStyle = '#a7f3d0';
        ctx.textAlign = 'left';
        ctx.fillText(`Task ${taskNames[task]}`, legendX + 16, h - 5);
        legendX += 80;
    });
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    taskResults = {};
    taskTimings = {};
    parallelTime = 0;
    sequentialTime = 0;

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    ['A', 'B', 'C', 'D'].forEach(id => {
        document.getElementById(`progressBar${id}`).style.width = '0%';
        document.getElementById(`status${id}`).textContent = 'Pending';
    });

    drawEmptyTimeline();
}

// Initialize on load
init();
