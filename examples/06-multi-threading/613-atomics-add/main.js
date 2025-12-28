/**
 * #613 Atomics Add/Sub
 * Atomic arithmetic operations demonstration
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let completedWorkers = 0;
let startTime = 0;

const elements = {
    workerCount: document.getElementById('worker-count'),
    incrementCount: document.getElementById('increment-count'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    counterValue: document.getElementById('counter-value'),
    resultInfo: document.getElementById('result-info'),
    workerProgress: document.getElementById('worker-progress')
};

function startTest() {
    const workerCount = parseInt(elements.workerCount.value);
    const incrementCount = parseInt(elements.incrementCount.value);

    if (!checkSupport()) return;

    // Create shared buffer
    sharedBuffer = new SharedArrayBuffer(4);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, 0);

    // Reset state
    workers.forEach(w => w.terminate());
    workers = [];
    completedWorkers = 0;
    startTime = performance.now();

    // Create progress display
    let progressHtml = '';
    for (let i = 0; i < workerCount; i++) {
        progressHtml += `
            <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
                <span style="width:80px;">Worker ${i}:</span>
                <div style="flex:1;height:20px;background:var(--bg-secondary);border-radius:10px;overflow:hidden;">
                    <div id="progress-${i}" style="width:0%;height:100%;background:var(--primary-color);transition:width 0.1s;"></div>
                </div>
                <span id="status-${i}" style="width:100px;text-align:right;color:var(--text-muted);">0%</span>
            </div>
        `;
    }
    elements.workerProgress.innerHTML = progressHtml;

    // Create and start workers
    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    // Start incrementing
    workers.forEach((w, i) => {
        w.postMessage({
            type: 'increment',
            data: { count: incrementCount }
        });
    });

    // Start updating counter display
    updateCounter();

    elements.startBtn.disabled = true;
    elements.resultInfo.innerHTML = '<p style="color:var(--text-secondary);">Running...</p>';
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'progress':
            updateWorkerProgress(workerId, data.percent);
            break;
        case 'complete':
            completedWorkers++;
            updateWorkerProgress(workerId, 100);
            document.getElementById(`status-${workerId}`).textContent = `Done (${data.duration.toFixed(0)}ms)`;

            if (completedWorkers === workers.length) {
                showResults();
            }
            break;
    }
}

function updateWorkerProgress(workerId, percent) {
    const bar = document.getElementById(`progress-${workerId}`);
    const status = document.getElementById(`status-${workerId}`);
    if (bar) bar.style.width = `${percent}%`;
    if (status && percent < 100) status.textContent = `${percent}%`;
}

function updateCounter() {
    if (!sharedArray) return;

    const value = Atomics.load(sharedArray, 0);
    elements.counterValue.textContent = value.toLocaleString();

    if (completedWorkers < workers.length) {
        requestAnimationFrame(updateCounter);
    }
}

function showResults() {
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const finalValue = Atomics.load(sharedArray, 0);
    const workerCount = workers.length;
    const incrementCount = parseInt(elements.incrementCount.value);
    const expectedValue = workerCount * incrementCount;
    const correct = finalValue === expectedValue;

    elements.counterValue.textContent = finalValue.toLocaleString();
    elements.counterValue.style.color = correct ? 'var(--success-color)' : 'var(--danger-color)';

    elements.resultInfo.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Expected Value:</span>
            <span class="stat-value">${expectedValue.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Actual Value:</span>
            <span class="stat-value" style="color:${correct ? 'var(--success-color)' : 'var(--danger-color)'};">${finalValue.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Result:</span>
            <span class="stat-value" style="color:${correct ? 'var(--success-color)' : 'var(--danger-color)'};">${correct ? 'CORRECT' : 'RACE CONDITION!'}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Time:</span>
            <span class="stat-value">${totalTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Operations/sec:</span>
            <span class="stat-value">${((expectedValue / totalTime) * 1000).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
        </div>
    `;

    elements.startBtn.disabled = false;
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    completedWorkers = 0;
    sharedBuffer = null;
    sharedArray = null;

    elements.counterValue.textContent = '0';
    elements.counterValue.style.color = 'var(--primary-color)';
    elements.resultInfo.innerHTML = '';
    elements.workerProgress.innerHTML = '<p style="color:var(--text-muted);">No test running</p>';
    elements.startBtn.disabled = false;
}

function checkSupport() {
    if (typeof SharedArrayBuffer === 'undefined' || typeof Atomics === 'undefined') {
        elements.resultInfo.innerHTML = '<div class="error-message">SharedArrayBuffer or Atomics not supported</div>';
        return false;
    }
    return true;
}

// Event listeners
elements.startBtn.addEventListener('click', startTest);
elements.resetBtn.addEventListener('click', reset);

reset();
