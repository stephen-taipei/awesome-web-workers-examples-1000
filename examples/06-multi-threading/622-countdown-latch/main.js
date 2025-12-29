/**
 * #622 Countdown Latch
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let workerStatus = [];

const elements = {
    count: document.getElementById('count'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    counter: document.getElementById('counter'),
    workersStatus: document.getElementById('workers-status')
};

function start() {
    const count = parseInt(elements.count.value);

    sharedBuffer = new SharedArrayBuffer(4);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, count);

    workers.forEach(w => w.terminate());
    workers = [];
    workerStatus = new Array(count).fill('working');

    updateStatus();
    elements.counter.textContent = count;
    elements.startBtn.disabled = true;

    for (let i = 0; i < count; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleMessage(i, e);
        worker.postMessage({ type: 'init', data: { workerId: i, buffer: sharedBuffer } });
        worker.postMessage({ type: 'start' });
        workers.push(worker);
    }

    // Waiter worker
    const waiter = new Worker('worker.js');
    waiter.onmessage = (e) => {
        if (e.data.type === 'latch-opened') {
            elements.counter.style.color = 'var(--success-color)';
        }
    };
    waiter.postMessage({ type: 'init', data: { workerId: -1, buffer: sharedBuffer } });
    waiter.postMessage({ type: 'wait' });
    workers.push(waiter);

    updateDisplay();
}

function handleMessage(workerId, event) {
    if (event.data.type === 'countdown') {
        workerStatus[workerId] = 'done';
        updateStatus();
    }
}

function updateStatus() {
    elements.workersStatus.innerHTML = workerStatus.map((s, i) => `
        <div style="display:inline-block;padding:10px 20px;margin:5px;background:${s === 'done' ? 'var(--success-color)' : 'var(--warning-color)'};color:white;border-radius:8px;">
            W${i}: ${s}
        </div>
    `).join('');
}

function updateDisplay() {
    if (!sharedArray) return;
    const val = Atomics.load(sharedArray, 0);
    elements.counter.textContent = val;
    if (val > 0) requestAnimationFrame(updateDisplay);
    else elements.startBtn.disabled = false;
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    elements.counter.textContent = '-';
    elements.counter.style.color = 'var(--primary-color)';
    elements.workersStatus.innerHTML = '';
    elements.startBtn.disabled = false;
}

elements.startBtn.addEventListener('click', start);
elements.resetBtn.addEventListener('click', reset);
