/**
 * #619 Read-Write Lock
 * Multiple readers, single writer lock
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let running = false;
let workerInfo = [];

const elements = {
    readers: document.getElementById('readers'),
    writers: document.getElementById('writers'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    lockState: document.getElementById('lock-state'),
    activeReaders: document.getElementById('active-readers'),
    activeWriter: document.getElementById('active-writer'),
    sharedValue: document.getElementById('shared-value'),
    workerActivity: document.getElementById('worker-activity')
};

function startSimulation() {
    if (typeof SharedArrayBuffer === 'undefined') {
        alert('SharedArrayBuffer not supported');
        return;
    }

    const readerCount = parseInt(elements.readers.value);
    const writerCount = parseInt(elements.writers.value);
    const totalWorkers = readerCount + writerCount;

    // Buffer: [0] = reader count, [1] = writer flag, [2] = shared value
    sharedBuffer = new SharedArrayBuffer(12);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, 0); // No readers
    Atomics.store(sharedArray, 1, 0); // No writer
    Atomics.store(sharedArray, 2, 0); // Shared value

    // Cleanup
    workers.forEach(w => w.terminate());
    workers = [];
    workerInfo = [];
    running = true;

    // Create reader workers
    for (let i = 0; i < readerCount; i++) {
        const worker = new Worker('worker.js');
        workerInfo.push({ type: 'reader', state: 'idle', id: i });
        worker.onmessage = (e) => handleWorkerMessage(i, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, workerType: 'reader', buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    // Create writer workers
    for (let i = 0; i < writerCount; i++) {
        const idx = readerCount + i;
        const worker = new Worker('worker.js');
        workerInfo.push({ type: 'writer', state: 'idle', id: idx });
        worker.onmessage = (e) => handleWorkerMessage(idx, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: idx, workerType: 'writer', buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    updateUI();
    updateWorkerActivity();

    // Start all workers
    workers.forEach(w => {
        w.postMessage({ type: 'start' });
    });

    // Update display
    updateDisplay();
}

function stopSimulation() {
    running = false;
    workers.forEach(w => w.terminate());
    workers = [];
    updateUI();
}

function handleWorkerMessage(workerIdx, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'waiting':
            workerInfo[workerIdx].state = 'waiting';
            break;
        case 'reading':
            workerInfo[workerIdx].state = 'reading';
            workerInfo[workerIdx].value = data.value;
            break;
        case 'writing':
            workerInfo[workerIdx].state = 'writing';
            workerInfo[workerIdx].value = data.value;
            break;
        case 'done':
            workerInfo[workerIdx].state = 'idle';
            // Continue if still running
            if (running && workers[workerIdx]) {
                setTimeout(() => {
                    if (running && workers[workerIdx]) {
                        workers[workerIdx].postMessage({ type: 'start' });
                    }
                }, 200 + Math.random() * 800);
            }
            break;
    }
    updateWorkerActivity();
}

function updateWorkerActivity() {
    const colors = {
        'idle': 'var(--secondary-color)',
        'waiting': 'var(--warning-color)',
        'reading': 'var(--primary-color)',
        'writing': 'var(--danger-color)'
    };

    elements.workerActivity.innerHTML = workerInfo.map((w, i) => `
        <div style="padding:10px 15px;background:${colors[w.state]};color:white;border-radius:8px;min-width:80px;text-align:center;">
            <div style="font-size:0.8rem;">${w.type === 'reader' ? 'R' : 'W'}${w.id}</div>
            <div style="font-weight:bold;">${w.state}</div>
            ${w.value !== undefined && w.state !== 'idle' && w.state !== 'waiting' ? `<div style="font-size:0.9rem;">${w.value}</div>` : ''}
        </div>
    `).join('');
}

function updateDisplay() {
    if (!sharedArray || !running) return;

    const readerCount = Atomics.load(sharedArray, 0);
    const writerFlag = Atomics.load(sharedArray, 1);
    const value = Atomics.load(sharedArray, 2);

    elements.sharedValue.textContent = value;
    elements.activeReaders.textContent = readerCount;

    if (writerFlag) {
        elements.lockState.textContent = 'Write Lock';
        elements.lockState.style.color = 'var(--danger-color)';
        elements.activeWriter.textContent = 'Yes';
    } else if (readerCount > 0) {
        elements.lockState.textContent = 'Read Lock';
        elements.lockState.style.color = 'var(--primary-color)';
        elements.activeWriter.textContent = 'None';
    } else {
        elements.lockState.textContent = 'Unlocked';
        elements.lockState.style.color = 'var(--success-color)';
        elements.activeWriter.textContent = 'None';
    }

    if (running) {
        requestAnimationFrame(updateDisplay);
    }
}

function updateUI() {
    elements.startBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    elements.readers.disabled = running;
    elements.writers.disabled = running;
}

// Event listeners
elements.startBtn.addEventListener('click', startSimulation);
elements.stopBtn.addEventListener('click', stopSimulation);
