/**
 * #612 Atomics Load/Store
 * Atomic memory operations demonstration
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];

const elements = {
    initBtn: document.getElementById('init-btn'),
    storeBtn: document.getElementById('store-btn'),
    loadBtn: document.getElementById('load-btn'),
    raceBtn: document.getElementById('race-btn'),
    valueDisplay: document.getElementById('value-display'),
    log: document.getElementById('log')
};

function checkSupport() {
    if (typeof SharedArrayBuffer === 'undefined' || typeof Atomics === 'undefined') {
        log('ERROR: SharedArrayBuffer or Atomics not supported');
        elements.initBtn.disabled = true;
        return false;
    }
    return true;
}

function initialize() {
    if (!checkSupport()) return;

    // Create shared buffer
    sharedBuffer = new SharedArrayBuffer(4); // 1 Int32
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, 0);

    // Create workers
    workers.forEach(w => w.terminate());
    workers = [];

    for (let i = 0; i < 3; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    log('Initialized SharedArrayBuffer with Atomics');
    updateValueDisplay();
    updateUI(true);
}

function atomicStore() {
    const value = Math.floor(Math.random() * 1000);
    const oldValue = Atomics.store(sharedArray, 0, value);
    log(`Main: Atomics.store(${value}) - old value was ${oldValue}`);
    updateValueDisplay();
}

function atomicLoad() {
    const value = Atomics.load(sharedArray, 0);
    log(`Main: Atomics.load() = ${value}`);
    updateValueDisplay();

    // Also ask workers to load
    workers.forEach((w, i) => {
        w.postMessage({ type: 'load' });
    });
}

function testRaceCondition() {
    log('--- Starting Race Condition Test ---');
    log('All workers will increment 1000 times');

    // Reset to 0
    Atomics.store(sharedArray, 0, 0);
    updateValueDisplay();

    // Start all workers incrementing
    const increments = 1000;
    workers.forEach((w, i) => {
        w.postMessage({
            type: 'increment-many',
            data: { count: increments }
        });
    });

    // Expected: 3 workers * 1000 = 3000
    log(`Expected final value: ${workers.length * increments}`);
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'ready':
            log(`Worker ${workerId}: Ready`);
            break;
        case 'loaded':
            log(`Worker ${workerId}: Loaded value = ${data.value}`);
            break;
        case 'stored':
            log(`Worker ${workerId}: Stored ${data.value}`);
            updateValueDisplay();
            break;
        case 'increment-done':
            log(`Worker ${workerId}: Completed ${data.count} increments`);
            updateValueDisplay();
            // Check if all done
            const currentValue = Atomics.load(sharedArray, 0);
            log(`Current value: ${currentValue}`);
            break;
    }
}

function updateValueDisplay() {
    if (!sharedArray) {
        elements.valueDisplay.innerHTML = '<p style="color:var(--text-muted);">Not initialized</p>';
        return;
    }

    const value = Atomics.load(sharedArray, 0);
    elements.valueDisplay.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Current Value:</span>
            <span class="stat-value" style="font-size:2rem;">${value}</span>
        </div>
    `;
}

function log(message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:4px 0;border-bottom:1px solid var(--border-color);';
    const color = message.includes('ERROR') ? 'var(--danger-color)' :
                  message.includes('---') ? 'var(--warning-color)' : 'var(--text-secondary)';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> <span style="color:${color};">${message}</span>`;
    elements.log.insertBefore(div, elements.log.firstChild);
}

function updateUI(enabled) {
    elements.storeBtn.disabled = !enabled;
    elements.loadBtn.disabled = !enabled;
    elements.raceBtn.disabled = !enabled;
}

// Event listeners
elements.initBtn.addEventListener('click', initialize);
elements.storeBtn.addEventListener('click', atomicStore);
elements.loadBtn.addEventListener('click', atomicLoad);
elements.raceBtn.addEventListener('click', testRaceCondition);

checkSupport();
