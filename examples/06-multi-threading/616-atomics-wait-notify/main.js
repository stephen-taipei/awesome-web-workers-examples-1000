/**
 * #616 Atomics Wait/Notify
 * Thread synchronization primitives
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let workerStates = [];
const WORKER_COUNT = 4;

const elements = {
    initBtn: document.getElementById('init-btn'),
    notifyOneBtn: document.getElementById('notify-one-btn'),
    notifyAllBtn: document.getElementById('notify-all-btn'),
    workerStates: document.getElementById('worker-states'),
    counter: document.getElementById('counter'),
    log: document.getElementById('log')
};

function initialize() {
    if (typeof SharedArrayBuffer === 'undefined') {
        log('ERROR: SharedArrayBuffer not supported');
        return;
    }

    // Create shared buffer: [0] = counter, [1-4] = worker states
    sharedBuffer = new SharedArrayBuffer(20); // 5 Int32s
    sharedArray = new Int32Array(sharedBuffer);

    // Initialize
    Atomics.store(sharedArray, 0, 0); // Counter
    for (let i = 1; i <= WORKER_COUNT; i++) {
        Atomics.store(sharedArray, i, 0); // Worker states: 0 = idle
    }

    // Terminate existing workers
    workers.forEach(w => w.terminate());
    workers = [];
    workerStates = new Array(WORKER_COUNT).fill('idle');

    // Create workers
    for (let i = 0; i < WORKER_COUNT; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    log('Initialized shared buffer and workers');
    updateDisplay();
    updateUI(true);

    // Start workers waiting
    setTimeout(() => {
        workers.forEach(w => {
            w.postMessage({ type: 'start-waiting' });
        });
    }, 100);
}

function notifyOne() {
    if (!sharedArray) return;

    // Increment counter
    const newValue = Atomics.add(sharedArray, 0, 1) + 1;
    elements.counter.textContent = newValue;

    // Notify one waiting worker
    const woken = Atomics.notify(sharedArray, 0, 1);
    log(`Notify one: counter=${newValue}, woke ${woken} worker(s)`);
}

function notifyAll() {
    if (!sharedArray) return;

    // Increment counter
    const newValue = Atomics.add(sharedArray, 0, 1) + 1;
    elements.counter.textContent = newValue;

    // Notify all waiting workers
    const woken = Atomics.notify(sharedArray, 0);
    log(`Notify all: counter=${newValue}, woke ${woken} worker(s)`);
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'ready':
            workerStates[workerId] = 'idle';
            log(`Worker ${workerId}: Ready`);
            updateWorkerStatesDisplay();
            break;

        case 'waiting':
            workerStates[workerId] = 'waiting';
            log(`Worker ${workerId}: Waiting on counter=${data.currentValue}`);
            updateWorkerStatesDisplay();
            break;

        case 'woken':
            workerStates[workerId] = 'woken';
            log(`Worker ${workerId}: Woken! Result=${data.result}, new counter=${data.newValue}`);
            updateWorkerStatesDisplay();

            // Worker will go back to waiting
            setTimeout(() => {
                workers[workerId].postMessage({ type: 'start-waiting' });
            }, 500);
            break;

        case 'timeout':
            workerStates[workerId] = 'timeout';
            log(`Worker ${workerId}: Wait timed out`);
            updateWorkerStatesDisplay();

            // Retry waiting
            setTimeout(() => {
                workers[workerId].postMessage({ type: 'start-waiting' });
            }, 100);
            break;
    }
}

function updateWorkerStatesDisplay() {
    const stateColors = {
        'idle': 'var(--secondary-color)',
        'waiting': 'var(--warning-color)',
        'woken': 'var(--success-color)',
        'timeout': 'var(--danger-color)'
    };

    let html = '<div style="display:flex;gap:15px;flex-wrap:wrap;justify-content:center;">';
    workerStates.forEach((state, i) => {
        html += `
            <div style="padding:20px;background:${stateColors[state] || 'var(--bg-secondary)'};border-radius:8px;min-width:100px;text-align:center;color:white;">
                <div style="font-weight:bold;">Worker ${i}</div>
                <div style="font-size:0.9rem;margin-top:5px;">${state}</div>
            </div>
        `;
    });
    html += '</div>';
    elements.workerStates.innerHTML = html;
}

function updateDisplay() {
    if (!sharedArray) {
        elements.counter.textContent = '-';
        return;
    }
    elements.counter.textContent = Atomics.load(sharedArray, 0);
    updateWorkerStatesDisplay();
}

function log(message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:4px 0;border-bottom:1px solid var(--border-color);';
    const color = message.includes('Woken') ? 'var(--success-color)' :
                  message.includes('Waiting') ? 'var(--warning-color)' : 'var(--text-secondary)';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> <span style="color:${color};">${message}</span>`;
    elements.log.insertBefore(div, elements.log.firstChild);
}

function updateUI(enabled) {
    elements.notifyOneBtn.disabled = !enabled;
    elements.notifyAllBtn.disabled = !enabled;
}

// Event listeners
elements.initBtn.addEventListener('click', initialize);
elements.notifyOneBtn.addEventListener('click', notifyOne);
elements.notifyAllBtn.addEventListener('click', notifyAll);

updateDisplay();
