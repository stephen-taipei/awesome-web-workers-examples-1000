// Read-Write Lock (RWLock) - Main Thread

const readerCountInput = document.getElementById('readerCount');
const writerCountInput = document.getElementById('writerCount');
const readOpsInput = document.getElementById('readOps');
const writeOpsInput = document.getElementById('writeOps');
const readDelayInput = document.getElementById('readDelay');
const writeDelayInput = document.getElementById('writeDelay');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const lockCanvas = document.getElementById('lockCanvas');
const lockCtx = lockCanvas.getContext('2d');

const logContainer = document.getElementById('logContainer');
const resultContainer = document.getElementById('resultContainer');

const totalReadsEl = document.getElementById('totalReads');
const totalWritesEl = document.getElementById('totalWrites');
const finalValueEl = document.getElementById('finalValue');
const execTimeEl = document.getElementById('execTime');
const maxReadersEl = document.getElementById('maxReaders');
const avgReadWaitEl = document.getElementById('avgReadWait');
const avgWriteWaitEl = document.getElementById('avgWriteWait');
const consistencyEl = document.getElementById('consistency');

let workers = [];
let sharedBuffer = null;
let sharedArray = null;
let startTime = 0;
let animationId = null;

// Stats tracking
let stats = {
    totalReads: 0,
    totalWrites: 0,
    maxConcurrentReaders: 0,
    readWaitTimes: [],
    writeWaitTimes: [],
    lockHistory: [],
    workerStates: {}
};

// SharedArrayBuffer layout:
// [0]: lock state (0=unlocked, >0=reader count, -1=writer)
// [1]: waiting writers count
// [2]: shared data value
// [3]: sequence counter for consistency check
const LOCK_STATE = 0;
const WAITING_WRITERS = 1;
const SHARED_DATA = 2;
const SEQUENCE = 3;

function initSharedMemory() {
    sharedBuffer = new SharedArrayBuffer(16);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, LOCK_STATE, 0);
    Atomics.store(sharedArray, WAITING_WRITERS, 0);
    Atomics.store(sharedArray, SHARED_DATA, 0);
    Atomics.store(sharedArray, SEQUENCE, 0);
}

function addLog(type, worker, message) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">${elapsed}s</span><span class="log-worker">${worker}</span><span>${message}</span>`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Keep only last 100 entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function startDemo() {
    const readerCount = parseInt(readerCountInput.value);
    const writerCount = parseInt(writerCountInput.value);
    const readOps = parseInt(readOpsInput.value);
    const writeOps = parseInt(writeOpsInput.value);
    const readDelay = parseInt(readDelayInput.value);
    const writeDelay = parseInt(writeDelayInput.value);

    // Reset state
    reset();
    initSharedMemory();

    startBtn.disabled = true;
    resultContainer.classList.add('hidden');
    startTime = performance.now();

    stats = {
        totalReads: 0,
        totalWrites: 0,
        maxConcurrentReaders: 0,
        readWaitTimes: [],
        writeWaitTimes: [],
        lockHistory: [],
        workerStates: {}
    };

    addLog('system', 'System', `Starting RWLock demo with ${readerCount} readers, ${writerCount} writers`);

    let completedWorkers = 0;
    const totalWorkers = readerCount + writerCount;

    // Create reader workers
    for (let i = 0; i < readerCount; i++) {
        const worker = new Worker('worker.js');
        const workerId = `Reader-${i + 1}`;
        stats.workerStates[workerId] = 'idle';

        worker.onmessage = (e) => handleWorkerMessage(e, workerId, totalWorkers, () => {
            completedWorkers++;
            if (completedWorkers === totalWorkers) {
                finishDemo();
            }
        });

        worker.postMessage({
            type: 'reader',
            workerId,
            buffer: sharedBuffer,
            operations: readOps,
            delay: readDelay
        });

        workers.push(worker);
    }

    // Create writer workers
    for (let i = 0; i < writerCount; i++) {
        const worker = new Worker('worker.js');
        const workerId = `Writer-${i + 1}`;
        stats.workerStates[workerId] = 'idle';

        worker.onmessage = (e) => handleWorkerMessage(e, workerId, totalWorkers, () => {
            completedWorkers++;
            if (completedWorkers === totalWorkers) {
                finishDemo();
            }
        });

        worker.postMessage({
            type: 'writer',
            workerId,
            buffer: sharedBuffer,
            operations: writeOps,
            delay: writeDelay
        });

        workers.push(worker);
    }

    // Start visualization
    startVisualization();
}

function handleWorkerMessage(e, workerId, totalWorkers, onComplete) {
    const data = e.data;

    switch (data.type) {
        case 'log':
            addLog(data.workerType, workerId, data.message);
            stats.workerStates[workerId] = data.state || 'active';
            break;

        case 'read':
            stats.totalReads++;
            stats.readWaitTimes.push(data.waitTime);
            break;

        case 'write':
            stats.totalWrites++;
            stats.writeWaitTimes.push(data.waitTime);
            break;

        case 'lockState':
            stats.lockHistory.push({
                time: performance.now() - startTime,
                state: data.state,
                readers: data.readers
            });
            if (data.readers > stats.maxConcurrentReaders) {
                stats.maxConcurrentReaders = data.readers;
            }
            break;

        case 'complete':
            stats.workerStates[workerId] = 'done';
            addLog(data.workerType, workerId, `Completed ${data.operations} operations`);
            onComplete();
            break;
    }
}

function finishDemo() {
    cancelAnimationFrame(animationId);
    startBtn.disabled = false;

    const execTime = performance.now() - startTime;
    const finalValue = Atomics.load(sharedArray, SHARED_DATA);
    const sequence = Atomics.load(sharedArray, SEQUENCE);

    // Calculate averages
    const avgReadWait = stats.readWaitTimes.length > 0
        ? stats.readWaitTimes.reduce((a, b) => a + b, 0) / stats.readWaitTimes.length
        : 0;
    const avgWriteWait = stats.writeWaitTimes.length > 0
        ? stats.writeWaitTimes.reduce((a, b) => a + b, 0) / stats.writeWaitTimes.length
        : 0;

    // Check consistency (sequence should equal total writes)
    const isConsistent = sequence === stats.totalWrites;

    // Update UI
    totalReadsEl.textContent = stats.totalReads;
    totalWritesEl.textContent = stats.totalWrites;
    finalValueEl.textContent = finalValue;
    execTimeEl.textContent = (execTime / 1000).toFixed(3) + 's';
    maxReadersEl.textContent = stats.maxConcurrentReaders;
    avgReadWaitEl.textContent = avgReadWait.toFixed(2) + 'ms';
    avgWriteWaitEl.textContent = avgWriteWait.toFixed(2) + 'ms';
    consistencyEl.textContent = isConsistent ? 'PASS' : 'FAIL';
    consistencyEl.style.color = isConsistent ? '#34d399' : '#ef4444';

    resultContainer.classList.remove('hidden');
    addLog('system', 'System', `Demo complete. Final value: ${finalValue}, Writes: ${sequence}`);

    // Final visualization
    drawVisualization();
}

function startVisualization() {
    function animate() {
        drawVisualization();
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

function drawVisualization() {
    const w = lockCanvas.width;
    const h = lockCanvas.height;
    const ctx = lockCtx;

    // Clear
    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    // Get current lock state
    const lockState = sharedArray ? Atomics.load(sharedArray, LOCK_STATE) : 0;
    const waitingWriters = sharedArray ? Atomics.load(sharedArray, WAITING_WRITERS) : 0;
    const dataValue = sharedArray ? Atomics.load(sharedArray, SHARED_DATA) : 0;

    // Draw lock visualization
    const centerX = w / 2;
    const centerY = 120;
    const lockRadius = 60;

    // Lock body
    ctx.beginPath();
    ctx.arc(centerX, centerY, lockRadius, 0, Math.PI * 2);

    if (lockState === 0) {
        // Unlocked
        ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
        ctx.strokeStyle = '#34d399';
    } else if (lockState === -1) {
        // Writer has lock
        ctx.fillStyle = 'rgba(244, 114, 182, 0.3)';
        ctx.strokeStyle = '#f472b6';
    } else {
        // Readers have lock
        ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.strokeStyle = '#60a5fa';
    }

    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Lock state text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';

    let stateText = '';
    if (lockState === 0) {
        stateText = 'UNLOCKED';
    } else if (lockState === -1) {
        stateText = 'WRITE LOCK';
    } else {
        stateText = `${lockState} READER${lockState > 1 ? 'S' : ''}`;
    }
    ctx.fillText(stateText, centerX, centerY + 5);

    // Waiting writers indicator
    if (waitingWriters > 0) {
        ctx.fillStyle = '#f472b6';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${waitingWriters} writer(s) waiting`, centerX, centerY + lockRadius + 25);
    }

    // Draw shared data box
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(centerX - 80, centerY + 70, 160, 50);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - 80, centerY + 70, 160, 50);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '11px sans-serif';
    ctx.fillText('Shared Data', centerX, centerY + 85);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(dataValue.toString(), centerX, centerY + 108);

    // Draw worker states
    const workers = Object.entries(stats.workerStates);
    const readerWorkers = workers.filter(([k]) => k.startsWith('Reader'));
    const writerWorkers = workers.filter(([k]) => k.startsWith('Writer'));

    // Readers on left
    ctx.font = 'bold 11px sans-serif';
    const readerStartY = 260;
    readerWorkers.forEach(([name, state], i) => {
        const x = 80 + (i % 4) * 80;
        const y = readerStartY + Math.floor(i / 4) * 40;

        ctx.fillStyle = state === 'reading' ? 'rgba(96, 165, 250, 0.5)' :
                        state === 'waiting' ? 'rgba(251, 191, 36, 0.3)' :
                        state === 'done' ? 'rgba(52, 211, 153, 0.3)' :
                        'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x - 30, y - 12, 60, 24, 5);
        ctx.fill();

        ctx.fillStyle = state === 'reading' ? '#60a5fa' :
                        state === 'waiting' ? '#fbbf24' :
                        state === 'done' ? '#34d399' : '#666';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y + 4);
    });

    // Writers on right
    const writerStartY = 260;
    writerWorkers.forEach(([name, state], i) => {
        const x = w - 120 + (i % 2) * 80;
        const y = writerStartY + Math.floor(i / 2) * 40;

        ctx.fillStyle = state === 'writing' ? 'rgba(244, 114, 182, 0.5)' :
                        state === 'waiting' ? 'rgba(251, 191, 36, 0.3)' :
                        state === 'done' ? 'rgba(52, 211, 153, 0.3)' :
                        'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x - 30, y - 12, 60, 24, 5);
        ctx.fill();

        ctx.fillStyle = state === 'writing' ? '#f472b6' :
                        state === 'waiting' ? '#fbbf24' :
                        state === 'done' ? '#34d399' : '#666';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y + 4);
    });

    // Labels
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#60a5fa';
    ctx.textAlign = 'left';
    ctx.fillText('READERS', 50, 245);

    ctx.fillStyle = '#f472b6';
    ctx.textAlign = 'right';
    ctx.fillText('WRITERS', w - 50, 245);

    // Legend
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    const legendY = h - 20;

    const legendItems = [
        { color: '#60a5fa', label: 'Reading' },
        { color: '#f472b6', label: 'Writing' },
        { color: '#fbbf24', label: 'Waiting' },
        { color: '#34d399', label: 'Done' }
    ];

    let legendX = 20;
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(legendX, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.fillText(item.label, legendX + 10, legendY + 3);
        legendX += 70;
    });

    // Stats
    ctx.fillStyle = '#4a7a5a';
    ctx.textAlign = 'right';
    ctx.fillText(`Reads: ${stats.totalReads} | Writes: ${stats.totalWrites}`, w - 20, legendY);
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    sharedBuffer = null;
    sharedArray = null;
    startBtn.disabled = false;
    resultContainer.classList.add('hidden');
    logContainer.innerHTML = '';

    stats = {
        totalReads: 0,
        totalWrites: 0,
        maxConcurrentReaders: 0,
        readWaitTimes: [],
        writeWaitTimes: [],
        lockHistory: [],
        workerStates: {}
    };

    // Clear canvas
    lockCtx.fillStyle = '#080f08';
    lockCtx.fillRect(0, 0, lockCanvas.width, lockCanvas.height);
    lockCtx.fillStyle = '#4a7a5a';
    lockCtx.font = '14px sans-serif';
    lockCtx.textAlign = 'center';
    lockCtx.fillText('Click "Start RWLock Demo" to begin', lockCanvas.width / 2, lockCanvas.height / 2);
}

startBtn.addEventListener('click', startDemo);
resetBtn.addEventListener('click', reset);

reset();
