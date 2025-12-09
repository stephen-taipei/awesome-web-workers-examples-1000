// SharedArrayBuffer - Main Thread

const workerCountSelect = document.getElementById('workerCount');
const arraySizeSelect = document.getElementById('arraySize');
const iterationsInput = document.getElementById('iterations');
const delayInput = document.getElementById('delay');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const totalWritesEl = document.getElementById('totalWrites');
const durationEl = document.getElementById('duration');
const writesPerSecEl = document.getElementById('writesPerSec');
const finalSumEl = document.getElementById('finalSum');
const activityLog = document.getElementById('activityLog');
const memoryGrid = document.getElementById('memoryGrid');

let workers = [];
let sharedBuffer = null;
let sharedArray = null;
let metadataBuffer = null;
let metadataArray = null;
let isRunning = false;
let startTime = 0;
let totalWrites = 0;
let updateInterval = null;
let activityEntries = [];

// Check if SharedArrayBuffer is available
function checkSharedArrayBufferSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        alert('SharedArrayBuffer is not available. This may be due to:\n\n' +
              '1. Browser security policies\n' +
              '2. Missing COOP/COEP headers\n' +
              '3. Not running in secure context (HTTPS)\n\n' +
              'The demo will run in fallback mode with regular ArrayBuffer.');
        return false;
    }
    return true;
}

const hasSharedArrayBuffer = checkSharedArrayBufferSupport();

function createSharedMemory(size) {
    if (hasSharedArrayBuffer) {
        // Create shared buffer for data
        sharedBuffer = new SharedArrayBuffer(size * 4); // Int32 = 4 bytes
        sharedArray = new Int32Array(sharedBuffer);

        // Create shared buffer for metadata (last writer ID per cell)
        metadataBuffer = new SharedArrayBuffer(size * 4);
        metadataArray = new Int32Array(metadataBuffer);
    } else {
        // Fallback to regular ArrayBuffer (won't be truly shared)
        sharedBuffer = new ArrayBuffer(size * 4);
        sharedArray = new Int32Array(sharedBuffer);
        metadataBuffer = new ArrayBuffer(size * 4);
        metadataArray = new Int32Array(metadataBuffer);
    }

    // Initialize to zero
    for (let i = 0; i < size; i++) {
        sharedArray[i] = 0;
        metadataArray[i] = -1;
    }
}

function initializeMemoryGrid(size) {
    memoryGrid.innerHTML = '';
    for (let i = 0; i < size; i++) {
        const cell = document.createElement('div');
        cell.className = 'memory-cell';
        cell.id = `cell-${i}`;
        cell.innerHTML = `<span class="cell-index">[${i}]</span><span class="cell-value">0</span>`;
        memoryGrid.appendChild(cell);
    }
}

function updateMemoryDisplay() {
    const size = sharedArray.length;
    for (let i = 0; i < size; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) {
            const valueSpan = cell.querySelector('.cell-value');
            valueSpan.textContent = sharedArray[i];

            const lastWriter = metadataArray[i];
            cell.className = 'memory-cell';
            if (lastWriter >= 0) {
                cell.classList.add(`worker-${lastWriter % 4}`);
            }
        }
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

function handleWorkerMessage(e) {
    const { type, workerId, index, value, iteration, completed, writes } = e.data;

    switch (type) {
        case 'write':
            totalWrites++;
            addActivityEntry(workerId, index, value, iteration);
            break;

        case 'progress':
            updateProgress(workerId, iteration);
            break;

        case 'complete':
            handleWorkerComplete(workerId, writes);
            break;
    }
}

function handleWorkerError(error) {
    console.error('Worker error:', error);
    addActivityEntry(-1, -1, -1, -1, `Error: ${error.message}`);
}

function addActivityEntry(workerId, index, value, iteration, message = null) {
    const entry = {
        time: Date.now() - startTime,
        workerId,
        index,
        value,
        iteration,
        message
    };
    activityEntries.push(entry);

    // Keep only last 100 entries
    if (activityEntries.length > 100) {
        activityEntries.shift();
    }
}

function updateActivityLog() {
    const recentEntries = activityEntries.slice(-20);
    activityLog.innerHTML = recentEntries.map(entry => {
        if (entry.message) {
            return `<div class="log-entry error">${entry.message}</div>`;
        }
        return `<div class="log-entry worker-${entry.workerId % 4}">` +
               `[${entry.time}ms] Worker ${entry.workerId}: array[${entry.index}] = ${entry.value} (iter ${entry.iteration})` +
               `</div>`;
    }).join('');

    activityLog.scrollTop = activityLog.scrollHeight;
}

function updateProgress(workerId, iteration) {
    const maxIterations = parseInt(iterationsInput.value);
    const percent = Math.min(100, Math.round((iteration / maxIterations) * 100));
    progressBar.style.width = percent + '%';
    progressText.textContent = `Worker ${workerId}: Iteration ${iteration}/${maxIterations}`;
}

let completedWorkers = 0;
let workerWrites = [];

function handleWorkerComplete(workerId, writes) {
    completedWorkers++;
    workerWrites[workerId] = writes;

    if (completedWorkers >= workers.length) {
        finishDemo();
    }
}

function finishDemo() {
    isRunning = false;
    clearInterval(updateInterval);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Calculate final sum
    let finalSum = 0;
    for (let i = 0; i < sharedArray.length; i++) {
        finalSum += sharedArray[i];
    }

    // Update display one final time
    updateMemoryDisplay();
    updateActivityLog();

    // Show results
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    totalWritesEl.textContent = totalWrites.toLocaleString();
    durationEl.textContent = duration.toFixed(2) + ' ms';
    writesPerSecEl.textContent = Math.round(totalWrites / (duration / 1000)).toLocaleString();
    finalSumEl.textContent = finalSum.toLocaleString();

    startBtn.disabled = false;
    stopBtn.disabled = true;
}

function startDemo() {
    const workerCount = parseInt(workerCountSelect.value);
    const arraySize = parseInt(arraySizeSelect.value);
    const iterations = parseInt(iterationsInput.value);
    const delay = parseInt(delayInput.value);

    // Reset state
    totalWrites = 0;
    completedWorkers = 0;
    workerWrites = [];
    activityEntries = [];

    // Create shared memory
    createSharedMemory(arraySize);

    // Initialize UI
    initializeMemoryGrid(arraySize);

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
        const message = {
            type: 'start',
            workerId: index,
            iterations,
            delay,
            arraySize
        };

        if (hasSharedArrayBuffer) {
            message.sharedBuffer = sharedBuffer;
            message.metadataBuffer = metadataBuffer;
        } else {
            // In fallback mode, send copies
            message.sharedBuffer = sharedBuffer;
            message.metadataBuffer = metadataBuffer;
        }

        worker.postMessage(message);
    });

    // Start periodic UI update
    updateInterval = setInterval(() => {
        if (isRunning) {
            updateMemoryDisplay();
            updateActivityLog();
        }
    }, 100);

    startBtn.disabled = true;
    stopBtn.disabled = false;
}

function stopDemo() {
    isRunning = false;
    workers.forEach(worker => {
        worker.postMessage({ type: 'stop' });
    });

    clearInterval(updateInterval);

    setTimeout(() => {
        finishDemo();
    }, 500);
}

function resetDemo() {
    terminateWorkers();
    clearInterval(updateInterval);

    isRunning = false;
    totalWrites = 0;
    completedWorkers = 0;
    workerWrites = [];
    activityEntries = [];

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    const arraySize = parseInt(arraySizeSelect.value);
    createSharedMemory(arraySize);
    initializeMemoryGrid(arraySize);

    startBtn.disabled = false;
    stopBtn.disabled = true;
}

// Event listeners
startBtn.addEventListener('click', startDemo);
stopBtn.addEventListener('click', stopDemo);
resetBtn.addEventListener('click', resetDemo);

arraySizeSelect.addEventListener('change', () => {
    if (!isRunning) {
        const arraySize = parseInt(arraySizeSelect.value);
        createSharedMemory(arraySize);
        initializeMemoryGrid(arraySize);
    }
});

// Initialize
const initialSize = parseInt(arraySizeSelect.value);
createSharedMemory(initialSize);
initializeMemoryGrid(initialSize);
