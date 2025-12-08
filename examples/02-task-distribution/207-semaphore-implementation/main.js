// Semaphore Implementation - Main Thread

const workerCountSelect = document.getElementById('workerCount');
const semaphoreCountSelect = document.getElementById('semaphoreCount');
const tasksPerWorkerInput = document.getElementById('tasksPerWorker');
const taskDurationInput = document.getElementById('taskDuration');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const permitSlots = document.getElementById('permitSlots');
const availableCount = document.getElementById('availableCount');
const maxCount = document.getElementById('maxCount');
const waitingWorkers = document.getElementById('waitingWorkers');
const workerGrid = document.getElementById('workerGrid');

const resultContainer = document.getElementById('resultContainer');
const totalTasks = document.getElementById('totalTasks');
const totalDuration = document.getElementById('totalDuration');
const avgWaitTime = document.getElementById('avgWaitTime');
const maxConcurrent = document.getElementById('maxConcurrent');
const throughputAnalysis = document.getElementById('throughputAnalysis');

const timelineCanvas = document.getElementById('timelineCanvas');
const ctx = timelineCanvas.getContext('2d');

let workers = [];
let sharedBuffer = null;
let sharedArray = null;
let isRunning = false;
let startTime = 0;
let timelineEvents = [];
let updateInterval = null;

// SharedArrayBuffer layout:
// [0] - Semaphore count (available permits)
// [1] - Waiting count
// [2] - Max concurrent observed
// [3+] - Worker states (0=idle, 1=waiting, 2=working)

const SEMAPHORE_INDEX = 0;
const WAITING_INDEX = 1;
const MAX_CONCURRENT_INDEX = 2;
const WORKER_STATE_OFFSET = 3;

function checkSharedArrayBufferSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        alert('SharedArrayBuffer is not available. Semaphore requires SharedArrayBuffer support.');
        return false;
    }
    return true;
}

const hasSharedArrayBuffer = checkSharedArrayBufferSupport();

function createSharedMemory(workerCount, semaphoreMax) {
    const size = (WORKER_STATE_OFFSET + workerCount) * 4;

    if (hasSharedArrayBuffer) {
        sharedBuffer = new SharedArrayBuffer(size);
        sharedArray = new Int32Array(sharedBuffer);
    } else {
        sharedBuffer = new ArrayBuffer(size);
        sharedArray = new Int32Array(sharedBuffer);
    }

    // Initialize semaphore with max count
    sharedArray[SEMAPHORE_INDEX] = semaphoreMax;
    sharedArray[WAITING_INDEX] = 0;
    sharedArray[MAX_CONCURRENT_INDEX] = 0;

    // Initialize worker states to idle
    for (let i = 0; i < workerCount; i++) {
        sharedArray[WORKER_STATE_OFFSET + i] = 0;
    }
}

function initializeUI(workerCount, semaphoreMax) {
    // Initialize permit slots
    permitSlots.innerHTML = '';
    for (let i = 0; i < semaphoreMax; i++) {
        const slot = document.createElement('div');
        slot.className = 'permit-slot available';
        slot.id = `permit-${i}`;
        slot.textContent = '●';
        permitSlots.appendChild(slot);
    }

    maxCount.textContent = semaphoreMax;
    availableCount.textContent = semaphoreMax;

    // Initialize worker grid
    workerGrid.innerHTML = '';
    for (let i = 0; i < workerCount; i++) {
        const workerCard = document.createElement('div');
        workerCard.className = 'worker-card idle';
        workerCard.id = `worker-card-${i}`;
        workerCard.innerHTML = `
            <div class="worker-id">Worker ${i}</div>
            <div class="worker-status">Idle</div>
            <div class="worker-progress">
                <div class="task-progress-bar"></div>
            </div>
            <div class="worker-tasks">0 / 0</div>
        `;
        workerGrid.appendChild(workerCard);
    }
}

function createWorkers(count) {
    terminateWorkers();
    workers = [];

    for (let i = 0; i < count; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;
        workers.push(worker);
    }
}

function terminateWorkers() {
    workers.forEach(w => w.terminate());
    workers = [];
}

let completedWorkers = 0;
let totalTasksCompleted = 0;
let totalWaitTimeSum = 0;
let observedMaxConcurrent = 0;
let currentConcurrent = 0;
let workerStatsData = [];

function handleWorkerMessage(e) {
    const { type, workerId } = e.data;

    switch (type) {
        case 'waiting':
            updateWorkerState(workerId, 'waiting');
            timelineEvents.push({
                workerId,
                event: 'waiting',
                time: e.data.time
            });
            break;

        case 'acquired':
            currentConcurrent++;
            if (currentConcurrent > observedMaxConcurrent) {
                observedMaxConcurrent = currentConcurrent;
            }
            updateWorkerState(workerId, 'working', e.data.taskNum, e.data.totalTasks);
            timelineEvents.push({
                workerId,
                event: 'acquired',
                time: e.data.time,
                waitTime: e.data.waitTime
            });
            totalWaitTimeSum += e.data.waitTime;
            break;

        case 'released':
            currentConcurrent--;
            totalTasksCompleted++;
            timelineEvents.push({
                workerId,
                event: 'released',
                time: e.data.time
            });
            break;

        case 'task_progress':
            updateWorkerProgress(workerId, e.data.progress);
            break;

        case 'complete':
            completedWorkers++;
            updateWorkerState(workerId, 'done');
            workerStatsData[workerId] = e.data.stats;
            checkAllComplete();
            break;
    }
}

function handleWorkerError(error) {
    console.error('Worker error:', error);
}

function updateWorkerState(workerId, state, taskNum = 0, totalTasks = 0) {
    const card = document.getElementById(`worker-card-${workerId}`);
    if (!card) return;

    const statusEl = card.querySelector('.worker-status');
    const tasksEl = card.querySelector('.worker-tasks');

    card.className = `worker-card ${state}`;

    switch (state) {
        case 'idle':
            statusEl.textContent = 'Idle';
            break;
        case 'waiting':
            statusEl.textContent = 'Waiting...';
            break;
        case 'working':
            statusEl.textContent = 'Working';
            tasksEl.textContent = `${taskNum} / ${totalTasks}`;
            break;
        case 'done':
            statusEl.textContent = 'Done';
            break;
    }
}

function updateWorkerProgress(workerId, progress) {
    const card = document.getElementById(`worker-card-${workerId}`);
    if (!card) return;

    const progressBar = card.querySelector('.task-progress-bar');
    progressBar.style.width = `${progress}%`;
}

function updateSemaphoreDisplay() {
    if (!sharedArray) return;

    const available = hasSharedArrayBuffer
        ? Atomics.load(sharedArray, SEMAPHORE_INDEX)
        : sharedArray[SEMAPHORE_INDEX];
    const waiting = hasSharedArrayBuffer
        ? Atomics.load(sharedArray, WAITING_INDEX)
        : sharedArray[WAITING_INDEX];
    const semMax = parseInt(semaphoreCountSelect.value);

    availableCount.textContent = Math.max(0, available);

    // Update permit slot visuals
    const usedCount = semMax - Math.max(0, available);
    for (let i = 0; i < semMax; i++) {
        const slot = document.getElementById(`permit-${i}`);
        if (slot) {
            if (i < usedCount) {
                slot.className = 'permit-slot used';
            } else {
                slot.className = 'permit-slot available';
            }
        }
    }

    // Update waiting display
    waitingWorkers.textContent = waiting > 0 ? `${waiting} workers waiting` : 'None';
}

function checkAllComplete() {
    if (completedWorkers >= workers.length) {
        finishDemo();
    }
}

function drawTimeline() {
    const w = timelineCanvas.width;
    const h = timelineCanvas.height;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    if (timelineEvents.length === 0) {
        ctx.fillStyle = '#4a7a5a';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Timeline will show resource usage during demo', w / 2, h / 2);
        return;
    }

    const workerColors = [
        '#f472b6', '#60a5fa', '#fbbf24', '#a78bfa',
        '#4ade80', '#fb923c', '#22d3d8', '#f87171',
        '#c084fc', '#2dd4bf', '#facc15', '#818cf8',
        '#fb7185', '#38bdf8', '#a3e635', '#e879f9'
    ];

    const minTime = Math.min(...timelineEvents.map(e => e.time));
    const maxTime = Math.max(...timelineEvents.map(e => e.time));
    const timeRange = maxTime - minTime || 1;

    const numWorkers = workers.length;
    const rowHeight = (h - 70) / numWorkers;
    const padding = 60;

    // Draw grid
    ctx.strokeStyle = '#0f1a0f';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const x = padding + (i / 10) * (w - padding - 20);
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, h - 30);
        ctx.stroke();
    }

    // Draw worker labels
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i < numWorkers; i++) {
        ctx.fillStyle = workerColors[i % workerColors.length];
        ctx.fillText(`W${i}`, padding - 5, 45 + i * rowHeight + rowHeight / 2);
    }

    // Track worker acquisition periods
    const workerStates = {};
    for (let i = 0; i < numWorkers; i++) {
        workerStates[i] = { acquireStart: null, waitStart: null };
    }

    // Sort events by time
    const sortedEvents = [...timelineEvents].sort((a, b) => a.time - b.time);

    for (const event of sortedEvents) {
        const { workerId, time } = event;
        const x = padding + ((time - minTime) / timeRange) * (w - padding - 20);
        const y = 45 + workerId * rowHeight;

        if (event.event === 'waiting') {
            workerStates[workerId].waitStart = x;
        } else if (event.event === 'acquired') {
            // Draw wait period if any
            if (workerStates[workerId].waitStart !== null) {
                ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
                ctx.fillRect(
                    workerStates[workerId].waitStart,
                    y,
                    x - workerStates[workerId].waitStart,
                    rowHeight - 2
                );
                workerStates[workerId].waitStart = null;
            }
            workerStates[workerId].acquireStart = x;
        } else if (event.event === 'released' && workerStates[workerId].acquireStart !== null) {
            const startX = workerStates[workerId].acquireStart;
            const color = workerColors[workerId % workerColors.length];

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(startX, y, Math.max(2, x - startX), rowHeight - 2);
            ctx.globalAlpha = 1.0;

            workerStates[workerId].acquireStart = null;
        }
    }

    // Draw semaphore limit line
    const semMax = parseInt(semaphoreCountSelect.value);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, 40);
    ctx.lineTo(padding, h - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw time labels
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const t = minTime + (i / 5) * timeRange;
        const x = padding + (i / 5) * (w - padding - 20);
        ctx.fillText((t / 1000).toFixed(1) + 's', x, h - 10);
    }

    // Border
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, 40, w - padding - 20, h - 70);

    // Legend
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'left';
    ctx.fillText('█ Working  ', padding, h - 2);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.fillText('█ Waiting', padding + 70, h - 2);
}

function finishDemo() {
    isRunning = false;
    clearInterval(updateInterval);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Final update
    updateSemaphoreDisplay();
    drawTimeline();

    // Show results
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const avgWait = totalTasksCompleted > 0 ? (totalWaitTimeSum / totalTasksCompleted) : 0;

    totalTasks.textContent = totalTasksCompleted.toLocaleString();
    totalDuration.textContent = (duration / 1000).toFixed(2) + ' s';
    avgWaitTime.textContent = avgWait.toFixed(0) + ' ms';
    maxConcurrent.textContent = observedMaxConcurrent.toLocaleString();

    // Throughput analysis
    const semMax = parseInt(semaphoreCountSelect.value);
    const taskDur = parseInt(taskDurationInput.value);
    const theoreticalThroughput = (semMax / taskDur) * 1000; // tasks per second
    const actualThroughput = totalTasksCompleted / (duration / 1000);
    const efficiency = (actualThroughput / theoreticalThroughput) * 100;

    throughputAnalysis.innerHTML = `
        <div class="analysis-item">
            <strong>Semaphore Limit:</strong> ${semMax} concurrent
        </div>
        <div class="analysis-item">
            <strong>Actual Max Concurrent:</strong> ${observedMaxConcurrent}
            ${observedMaxConcurrent <= semMax ? '✓ Within limit' : '⚠ Exceeded!'}
        </div>
        <div class="analysis-item">
            <strong>Theoretical Throughput:</strong> ${theoreticalThroughput.toFixed(1)} tasks/sec
        </div>
        <div class="analysis-item">
            <strong>Actual Throughput:</strong> ${actualThroughput.toFixed(1)} tasks/sec
        </div>
        <div class="analysis-item">
            <strong>Efficiency:</strong> ${Math.min(100, efficiency).toFixed(1)}%
        </div>
        <div class="analysis-item explanation">
            The semaphore successfully limited concurrent resource access to ${semMax} workers at a time.
            ${avgWait > 100 ?
                `Workers waited an average of ${avgWait.toFixed(0)}ms for permits, showing effective queuing.` :
                'Low wait times indicate good resource availability.'
            }
        </div>
    `;

    startBtn.disabled = false;
}

function startDemo() {
    if (!hasSharedArrayBuffer) {
        alert('SharedArrayBuffer not available. Demo cannot run properly.');
        return;
    }

    const workerCount = parseInt(workerCountSelect.value);
    const semaphoreMax = parseInt(semaphoreCountSelect.value);
    const tasksPerWorker = parseInt(tasksPerWorkerInput.value);
    const taskDuration = parseInt(taskDurationInput.value);

    // Reset state
    createSharedMemory(workerCount, semaphoreMax);
    initializeUI(workerCount, semaphoreMax);

    completedWorkers = 0;
    totalTasksCompleted = 0;
    totalWaitTimeSum = 0;
    observedMaxConcurrent = 0;
    currentConcurrent = 0;
    workerStatsData = [];
    timelineEvents = [];

    // Create workers
    createWorkers(workerCount);

    // Show progress
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';

    isRunning = true;
    startTime = performance.now();

    // Start workers
    workers.forEach((worker, index) => {
        worker.postMessage({
            type: 'start',
            workerId: index,
            sharedBuffer,
            semaphoreMax,
            tasksPerWorker,
            taskDuration,
            workerCount
        });
    });

    // Start periodic updates
    updateInterval = setInterval(() => {
        if (isRunning) {
            updateSemaphoreDisplay();
            drawTimeline();

            const progress = Math.round((totalTasksCompleted / (workers.length * tasksPerWorker)) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = `Completed ${totalTasksCompleted} / ${workers.length * tasksPerWorker} tasks`;
        }
    }, 100);

    startBtn.disabled = true;
}

function resetDemo() {
    terminateWorkers();
    clearInterval(updateInterval);

    isRunning = false;
    completedWorkers = 0;
    totalTasksCompleted = 0;
    totalWaitTimeSum = 0;
    observedMaxConcurrent = 0;
    currentConcurrent = 0;
    workerStatsData = [];
    timelineEvents = [];

    const workerCount = parseInt(workerCountSelect.value);
    const semaphoreMax = parseInt(semaphoreCountSelect.value);

    createSharedMemory(workerCount, semaphoreMax);
    initializeUI(workerCount, semaphoreMax);

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    drawTimeline();

    startBtn.disabled = false;
}

// Event listeners
startBtn.addEventListener('click', startDemo);
resetBtn.addEventListener('click', resetDemo);

workerCountSelect.addEventListener('change', () => {
    if (!isRunning) {
        const workerCount = parseInt(workerCountSelect.value);
        const semaphoreMax = parseInt(semaphoreCountSelect.value);
        createSharedMemory(workerCount, semaphoreMax);
        initializeUI(workerCount, semaphoreMax);
    }
});

semaphoreCountSelect.addEventListener('change', () => {
    if (!isRunning) {
        const workerCount = parseInt(workerCountSelect.value);
        const semaphoreMax = parseInt(semaphoreCountSelect.value);
        createSharedMemory(workerCount, semaphoreMax);
        initializeUI(workerCount, semaphoreMax);
    }
});

// Initialize
const initialWorkerCount = parseInt(workerCountSelect.value);
const initialSemaphoreMax = parseInt(semaphoreCountSelect.value);
createSharedMemory(initialWorkerCount, initialSemaphoreMax);
initializeUI(initialWorkerCount, initialSemaphoreMax);
drawTimeline();
