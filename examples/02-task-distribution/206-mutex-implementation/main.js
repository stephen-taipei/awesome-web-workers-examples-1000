// Mutex Implementation - Main Thread

const workerCountSelect = document.getElementById('workerCount');
const operationsCountInput = document.getElementById('operationsCount');
const criticalWorkTimeInput = document.getElementById('criticalWorkTime');
const useMutexSelect = document.getElementById('useMutex');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const lockIndicator = document.getElementById('lockIndicator');
const lockIcon = document.getElementById('lockIcon');
const lockText = document.getElementById('lockText');
const currentOwner = document.getElementById('currentOwner');
const waitingQueue = document.getElementById('waitingQueue');

const noMutexCounter = document.getElementById('noMutexCounter');
const withMutexCounter = document.getElementById('withMutexCounter');
const noMutexExpected = document.getElementById('noMutexExpected');
const withMutexExpected = document.getElementById('withMutexExpected');
const noMutexDiff = document.getElementById('noMutexDiff');
const withMutexDiff = document.getElementById('withMutexDiff');

const resultContainer = document.getElementById('resultContainer');
const totalAcquisitions = document.getElementById('totalAcquisitions');
const totalWaitTime = document.getElementById('totalWaitTime');
const avgHoldTime = document.getElementById('avgHoldTime');
const contentionRate = document.getElementById('contentionRate');
const workerStats = document.getElementById('workerStats');

const timelineCanvas = document.getElementById('timelineCanvas');
const ctx = timelineCanvas.getContext('2d');

let workers = [];
let sharedBuffer = null;
let sharedArray = null;
let isRunning = false;
let expectedTotal = 0;
let timelineEvents = [];
let updateInterval = null;

// SharedArrayBuffer layout:
// [0] - Mutex state (0 = unlocked, 1 = locked)
// [1] - Counter without mutex
// [2] - Counter with mutex
// [3] - Current lock owner (-1 = none)
// [4] - Waiting count

function checkSharedArrayBufferSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        alert('SharedArrayBuffer is not available. Mutex requires SharedArrayBuffer support.');
        return false;
    }
    return true;
}

const hasSharedArrayBuffer = checkSharedArrayBufferSupport();

function createSharedMemory() {
    if (hasSharedArrayBuffer) {
        sharedBuffer = new SharedArrayBuffer(20); // 5 x Int32 = 20 bytes
        sharedArray = new Int32Array(sharedBuffer);
    } else {
        sharedBuffer = new ArrayBuffer(20);
        sharedArray = new Int32Array(sharedBuffer);
    }

    // Initialize
    sharedArray[0] = 0; // Mutex unlocked
    sharedArray[1] = 0; // Counter without mutex
    sharedArray[2] = 0; // Counter with mutex
    sharedArray[3] = -1; // No owner
    sharedArray[4] = 0; // No waiters
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

let completedTests = 0;
let totalTests = 0;
let workerData = [];
let lockAcquisitions = 0;
let totalWait = 0;
let contentionCount = 0;

function handleWorkerMessage(e) {
    const { type, workerId } = e.data;

    switch (type) {
        case 'lock_acquired':
            lockAcquisitions++;
            timelineEvents.push({
                workerId,
                event: 'acquired',
                time: e.data.time,
                waitTime: e.data.waitTime
            });
            if (e.data.waitTime > 0) contentionCount++;
            totalWait += e.data.waitTime;
            break;

        case 'lock_released':
            timelineEvents.push({
                workerId,
                event: 'released',
                time: e.data.time,
                holdTime: e.data.holdTime
            });
            break;

        case 'progress':
            updateProgress(e.data);
            break;

        case 'complete':
            completedTests++;
            workerData[workerId] = {
                ...workerData[workerId],
                ...e.data.stats
            };
            checkAllComplete();
            break;
    }
}

function handleWorkerError(error) {
    console.error('Worker error:', error);
}

function updateProgress(data) {
    const progress = Math.round((completedTests / totalTests) * 100);
    progressBar.style.width = progress + '%';
    progressText.textContent = `Worker ${data.workerId}: ${data.testType} - ${data.completed}/${data.total} operations`;
}

function checkAllComplete() {
    if (completedTests >= totalTests) {
        finishTest();
    }
}

function updateLockDisplay() {
    if (!sharedArray) return;

    const lockState = hasSharedArrayBuffer ? Atomics.load(sharedArray, 0) : sharedArray[0];
    const owner = hasSharedArrayBuffer ? Atomics.load(sharedArray, 3) : sharedArray[3];
    const waiting = hasSharedArrayBuffer ? Atomics.load(sharedArray, 4) : sharedArray[4];

    if (lockState === 1) {
        lockIndicator.classList.add('locked');
        lockIcon.textContent = '🔒';
        lockText.textContent = 'Locked';
        currentOwner.textContent = owner >= 0 ? `Worker ${owner}` : 'Unknown';
    } else {
        lockIndicator.classList.remove('locked');
        lockIcon.textContent = '🔓';
        lockText.textContent = 'Unlocked';
        currentOwner.textContent = 'None';
    }

    waitingQueue.textContent = `${waiting} worker${waiting !== 1 ? 's' : ''}`;
}

function updateCounterDisplay() {
    if (!sharedArray) return;

    const noMutexVal = sharedArray[1];
    const withMutexVal = hasSharedArrayBuffer ? Atomics.load(sharedArray, 2) : sharedArray[2];

    noMutexCounter.textContent = noMutexVal.toLocaleString();
    withMutexCounter.textContent = withMutexVal.toLocaleString();

    const noMutexDiffVal = expectedTotal - noMutexVal;
    const withMutexDiffVal = expectedTotal - withMutexVal;

    if (noMutexDiffVal > 0) {
        noMutexDiff.textContent = `Lost: ${noMutexDiffVal.toLocaleString()}`;
        noMutexDiff.className = 'counter-diff error';
    } else if (noMutexDiffVal === 0 && expectedTotal > 0) {
        noMutexDiff.textContent = 'No loss';
        noMutexDiff.className = 'counter-diff success';
    } else {
        noMutexDiff.textContent = '-';
        noMutexDiff.className = 'counter-diff';
    }

    if (withMutexDiffVal > 0) {
        withMutexDiff.textContent = `Lost: ${withMutexDiffVal.toLocaleString()}`;
        withMutexDiff.className = 'counter-diff error';
    } else if (withMutexDiffVal === 0 && expectedTotal > 0) {
        withMutexDiff.textContent = 'No loss';
        withMutexDiff.className = 'counter-diff success';
    } else {
        withMutexDiff.textContent = '-';
        withMutexDiff.className = 'counter-diff';
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
        ctx.fillText('Timeline will show lock acquisitions during test', w / 2, h / 2);
        return;
    }

    const workerColors = ['#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#4ade80', '#fb923c', '#22d3d8', '#f87171'];

    const minTime = Math.min(...timelineEvents.map(e => e.time));
    const maxTime = Math.max(...timelineEvents.map(e => e.time));
    const timeRange = maxTime - minTime || 1;

    const numWorkers = parseInt(workerCountSelect.value);
    const rowHeight = (h - 60) / numWorkers;
    const padding = 50;

    // Draw grid
    ctx.strokeStyle = '#0f1a0f';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const x = padding + (i / 10) * (w - padding * 2);
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, h - 30);
        ctx.stroke();
    }

    // Draw worker labels
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i < numWorkers; i++) {
        ctx.fillStyle = workerColors[i % workerColors.length];
        ctx.fillText(`W${i}`, padding - 5, 40 + i * rowHeight + rowHeight / 2);
    }

    // Draw lock periods
    const workerStates = {};
    for (let i = 0; i < numWorkers; i++) {
        workerStates[i] = { lockStart: null };
    }

    // Sort events by time
    const sortedEvents = [...timelineEvents].sort((a, b) => a.time - b.time);

    for (const event of sortedEvents) {
        const { workerId, time } = event;
        const x = padding + ((time - minTime) / timeRange) * (w - padding * 2);
        const y = 40 + workerId * rowHeight;

        if (event.event === 'acquired') {
            workerStates[workerId].lockStart = x;
        } else if (event.event === 'released' && workerStates[workerId].lockStart !== null) {
            const startX = workerStates[workerId].lockStart;
            const color = workerColors[workerId % workerColors.length];

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(startX, y, Math.max(2, x - startX), rowHeight - 4);
            ctx.globalAlpha = 1.0;

            workerStates[workerId].lockStart = null;
        }
    }

    // Draw time labels
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const t = minTime + (i / 5) * timeRange;
        const x = padding + (i / 5) * (w - padding * 2);
        ctx.fillText(t.toFixed(0) + 'ms', x, h - 10);
    }

    // Border
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, 30, w - padding * 2, h - 60);

    // Legend
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'left';
    ctx.fillText('█ = Lock held period', padding, h - 2);
}

function finishTest() {
    isRunning = false;
    clearInterval(updateInterval);

    // Final updates
    updateLockDisplay();
    updateCounterDisplay();
    drawTimeline();

    // Show results
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const avgHold = lockAcquisitions > 0 ? (totalWait / lockAcquisitions).toFixed(2) : '0';
    const contention = lockAcquisitions > 0 ? ((contentionCount / lockAcquisitions) * 100).toFixed(1) : '0';

    totalAcquisitions.textContent = lockAcquisitions.toLocaleString();
    totalWaitTime.textContent = totalWait.toFixed(2) + ' ms';
    avgHoldTime.textContent = avgHold + ' ms';
    contentionRate.textContent = contention + '%';

    // Worker stats
    let statsHtml = '<table><tr><th>Worker</th><th>Ops</th><th>Lock Acquires</th><th>Total Wait</th></tr>';
    for (let i = 0; i < workerData.length; i++) {
        const wd = workerData[i] || {};
        statsHtml += `<tr>
            <td>Worker ${i}</td>
            <td>${(wd.operations || 0).toLocaleString()}</td>
            <td>${(wd.lockAcquires || 0).toLocaleString()}</td>
            <td>${(wd.totalWait || 0).toFixed(2)} ms</td>
        </tr>`;
    }
    statsHtml += '</table>';
    workerStats.innerHTML = statsHtml;

    startBtn.disabled = false;
}

function startTest() {
    if (!hasSharedArrayBuffer) {
        alert('SharedArrayBuffer not available. Test cannot run properly.');
        return;
    }

    const workerCount = parseInt(workerCountSelect.value);
    const operationsCount = parseInt(operationsCountInput.value);
    const criticalWorkTime = parseInt(criticalWorkTimeInput.value);
    const useMutex = useMutexSelect.value;

    // Calculate expected total
    expectedTotal = workerCount * operationsCount;
    noMutexExpected.textContent = expectedTotal.toLocaleString();
    withMutexExpected.textContent = expectedTotal.toLocaleString();

    // Determine total tests
    if (useMutex === 'compare') {
        totalTests = workerCount * 2;
    } else {
        totalTests = workerCount;
    }

    // Reset state
    createSharedMemory();
    completedTests = 0;
    workerData = [];
    lockAcquisitions = 0;
    totalWait = 0;
    contentionCount = 0;
    timelineEvents = [];

    // Create workers
    createWorkers(workerCount);

    // Show progress
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';

    isRunning = true;

    // Start workers
    workers.forEach((worker, index) => {
        worker.postMessage({
            type: 'start',
            workerId: index,
            sharedBuffer,
            operationsCount,
            criticalWorkTime,
            useMutex
        });
    });

    // Start periodic updates
    updateInterval = setInterval(() => {
        if (isRunning) {
            updateLockDisplay();
            updateCounterDisplay();
            drawTimeline();
        }
    }, 50);

    startBtn.disabled = true;
}

function resetTest() {
    terminateWorkers();
    clearInterval(updateInterval);

    isRunning = false;
    expectedTotal = 0;
    completedTests = 0;
    workerData = [];
    lockAcquisitions = 0;
    totalWait = 0;
    contentionCount = 0;
    timelineEvents = [];

    createSharedMemory();

    noMutexCounter.textContent = '-';
    withMutexCounter.textContent = '-';
    noMutexExpected.textContent = '-';
    withMutexExpected.textContent = '-';
    noMutexDiff.textContent = '-';
    noMutexDiff.className = 'counter-diff';
    withMutexDiff.textContent = '-';
    withMutexDiff.className = 'counter-diff';

    lockIndicator.classList.remove('locked');
    lockIcon.textContent = '🔓';
    lockText.textContent = 'Unlocked';
    currentOwner.textContent = 'None';
    waitingQueue.textContent = '0 workers';

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    drawTimeline();

    startBtn.disabled = false;
}

// Event listeners
startBtn.addEventListener('click', startTest);
resetBtn.addEventListener('click', resetTest);

// Initialize
createSharedMemory();
drawTimeline();
