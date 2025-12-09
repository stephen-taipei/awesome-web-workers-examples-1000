// Atomics Operations - Main Thread

const workerCountSelect = document.getElementById('workerCount');
const incrementCountInput = document.getElementById('incrementCount');
const operationTypeSelect = document.getElementById('operationType');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const regularCounter = document.getElementById('regularCounter');
const atomicCounter = document.getElementById('atomicCounter');
const regularExpected = document.getElementById('regularExpected');
const atomicExpected = document.getElementById('atomicExpected');
const regularDiff = document.getElementById('regularDiff');
const atomicDiff = document.getElementById('atomicDiff');

const resultContainer = document.getElementById('resultContainer');
const regularLost = document.getElementById('regularLost');
const atomicLost = document.getElementById('atomicLost');
const regularTime = document.getElementById('regularTime');
const atomicTime = document.getElementById('atomicTime');
const operationsSummary = document.getElementById('operationsSummary');

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
// [0] - Regular counter
// [1] - Atomic counter
// [2] - Progress counter

function checkSharedArrayBufferSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        alert('SharedArrayBuffer is not available. Atomics require SharedArrayBuffer support.\n\n' +
              'This may be due to missing security headers or browser restrictions.');
        return false;
    }
    return true;
}

const hasSharedArrayBuffer = checkSharedArrayBufferSupport();

function createSharedMemory() {
    if (hasSharedArrayBuffer) {
        sharedBuffer = new SharedArrayBuffer(12); // 3 x Int32 = 12 bytes
        sharedArray = new Int32Array(sharedBuffer);
    } else {
        // Fallback - won't demonstrate atomics properly
        sharedBuffer = new ArrayBuffer(12);
        sharedArray = new Int32Array(sharedBuffer);
    }

    // Initialize counters
    sharedArray[0] = 0; // Regular counter
    sharedArray[1] = 0; // Atomic counter
    sharedArray[2] = 0; // Progress
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
let testResults = {
    regular: { time: 0, operations: [] },
    atomic: { time: 0, operations: [] }
};

function handleWorkerMessage(e) {
    const { type, workerId, testType, time, operations } = e.data;

    switch (type) {
        case 'progress':
            updateProgress(e.data);
            break;

        case 'complete':
            if (testType === 'regular') {
                testResults.regular.operations.push({ workerId, operations });
            } else if (testType === 'atomic') {
                testResults.atomic.operations.push({ workerId, operations });
            }
            completedWorkers++;
            checkAllComplete();
            break;

        case 'event':
            timelineEvents.push({
                workerId,
                testType: e.data.testType,
                time: e.data.eventTime,
                value: e.data.value
            });
            break;
    }
}

function handleWorkerError(error) {
    console.error('Worker error:', error);
}

function updateProgress(data) {
    const total = workers.length * 2; // regular + atomic tests
    const progress = Math.round((completedWorkers / total) * 100);
    progressBar.style.width = progress + '%';
    progressText.textContent = `Worker ${data.workerId}: ${data.testType} test - ${data.currentCount} operations`;
}

function checkAllComplete() {
    const operationType = operationTypeSelect.value;
    let totalExpected;

    if (operationType === 'both') {
        totalExpected = workers.length * 2;
    } else {
        totalExpected = workers.length;
    }

    if (completedWorkers >= totalExpected) {
        finishTest();
    }
}

function updateCounterDisplay() {
    if (!sharedArray) return;

    const regularVal = sharedArray[0];
    const atomicVal = hasSharedArrayBuffer ? Atomics.load(sharedArray, 1) : sharedArray[1];

    regularCounter.textContent = regularVal.toLocaleString();
    atomicCounter.textContent = atomicVal.toLocaleString();

    // Calculate and show difference
    const regularDiffVal = expectedTotal - regularVal;
    const atomicDiffVal = expectedTotal - atomicVal;

    if (regularDiffVal > 0) {
        regularDiff.textContent = `Lost: ${regularDiffVal.toLocaleString()}`;
        regularDiff.className = 'counter-diff error';
    } else {
        regularDiff.textContent = 'No loss';
        regularDiff.className = 'counter-diff success';
    }

    if (atomicDiffVal > 0) {
        atomicDiff.textContent = `Lost: ${atomicDiffVal.toLocaleString()}`;
        atomicDiff.className = 'counter-diff error';
    } else {
        atomicDiff.textContent = 'No loss';
        atomicDiff.className = 'counter-diff success';
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
        ctx.fillText('Timeline will show operations during test', w / 2, h / 2);
        return;
    }

    const colors = {
        regular: ['#f472b6', '#fb7185', '#fda4af', '#fecdd3'],
        atomic: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8']
    };

    const minTime = Math.min(...timelineEvents.map(e => e.time));
    const maxTime = Math.max(...timelineEvents.map(e => e.time));
    const timeRange = maxTime - minTime || 1;

    // Draw grid
    ctx.strokeStyle = '#0f1a0f';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const x = 50 + (i / 10) * (w - 100);
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, h - 30);
        ctx.stroke();
    }

    // Draw events
    const regularY = 60;
    const atomicY = 140;

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.textAlign = 'left';
    ctx.fillText('Regular', 5, regularY + 5);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('Atomic', 5, atomicY + 5);

    // Sample events for display (max 500)
    const sampleSize = Math.min(timelineEvents.length, 500);
    const step = Math.max(1, Math.floor(timelineEvents.length / sampleSize));

    for (let i = 0; i < timelineEvents.length; i += step) {
        const event = timelineEvents[i];
        const x = 50 + ((event.time - minTime) / timeRange) * (w - 100);
        const y = event.testType === 'regular' ? regularY : atomicY;
        const color = event.testType === 'regular'
            ? colors.regular[event.workerId % 4]
            : colors.atomic[event.workerId % 4];

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x - 1, y - 15, 2, 30);
    }

    ctx.globalAlpha = 1.0;

    // Draw time labels
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const t = minTime + (i / 5) * timeRange;
        const x = 50 + (i / 5) * (w - 100);
        ctx.fillText(t.toFixed(0) + 'ms', x, h - 10);
    }

    // Border
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 20, w - 100, h - 50);
}

function finishTest() {
    isRunning = false;
    clearInterval(updateInterval);

    // Final update
    updateCounterDisplay();
    drawTimeline();

    const regularVal = sharedArray[0];
    const atomicVal = hasSharedArrayBuffer ? Atomics.load(sharedArray, 1) : sharedArray[1];

    const regularLostVal = expectedTotal - regularVal;
    const atomicLostVal = expectedTotal - atomicVal;

    // Show results
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    regularLost.textContent = regularLostVal.toLocaleString();
    regularLost.className = regularLostVal > 0 ? 'result-value error' : 'result-value success';

    atomicLost.textContent = atomicLostVal.toLocaleString();
    atomicLost.className = atomicLostVal > 0 ? 'result-value error' : 'result-value success';

    // Calculate times
    const regularOps = testResults.regular.operations;
    const atomicOps = testResults.atomic.operations;

    regularTime.textContent = regularOps.length > 0 ? 'Completed' : 'Not run';
    atomicTime.textContent = atomicOps.length > 0 ? 'Completed' : 'Not run';

    // Summary
    const lossPercent = ((regularLostVal / expectedTotal) * 100).toFixed(2);
    operationsSummary.innerHTML = `
        <div class="summary-item">
            <strong>Expected Total:</strong> ${expectedTotal.toLocaleString()}
        </div>
        <div class="summary-item">
            <strong>Regular Result:</strong> ${regularVal.toLocaleString()}
            (${lossPercent}% loss due to race conditions)
        </div>
        <div class="summary-item">
            <strong>Atomic Result:</strong> ${atomicVal.toLocaleString()}
            (${atomicLostVal === 0 ? 'Perfect - no loss' : atomicLostVal + ' lost'})
        </div>
        <div class="summary-item explanation">
            <strong>Why the difference?</strong><br>
            Regular increments (read-modify-write) can be interrupted between steps,
            causing lost updates when multiple threads read the same value before any writes complete.
            Atomic operations guarantee the entire operation completes without interruption.
        </div>
    `;

    startBtn.disabled = false;
}

function startTest() {
    if (!hasSharedArrayBuffer) {
        alert('SharedArrayBuffer not available. Test cannot demonstrate atomic operations properly.');
        return;
    }

    const workerCount = parseInt(workerCountSelect.value);
    const incrementCount = parseInt(incrementCountInput.value);
    const operationType = operationTypeSelect.value;

    // Calculate expected total
    if (operationType === 'both') {
        expectedTotal = workerCount * incrementCount;
    } else {
        expectedTotal = workerCount * incrementCount;
    }

    regularExpected.textContent = expectedTotal.toLocaleString();
    atomicExpected.textContent = expectedTotal.toLocaleString();

    // Reset state
    createSharedMemory();
    testResults = {
        regular: { time: 0, operations: [] },
        atomic: { time: 0, operations: [] }
    };
    completedWorkers = 0;
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
            incrementCount,
            operationType
        });
    });

    // Start periodic updates
    updateInterval = setInterval(() => {
        if (isRunning) {
            updateCounterDisplay();
            drawTimeline();
        }
    }, 100);

    startBtn.disabled = true;
}

function resetTest() {
    terminateWorkers();
    clearInterval(updateInterval);

    isRunning = false;
    expectedTotal = 0;
    timelineEvents = [];
    completedWorkers = 0;

    createSharedMemory();

    regularCounter.textContent = '0';
    atomicCounter.textContent = '0';
    regularExpected.textContent = '-';
    atomicExpected.textContent = '-';
    regularDiff.textContent = '-';
    regularDiff.className = 'counter-diff';
    atomicDiff.textContent = '-';
    atomicDiff.className = 'counter-diff';

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
