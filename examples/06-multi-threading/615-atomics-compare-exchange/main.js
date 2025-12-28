/**
 * #615 Atomics Compare-Exchange
 * CAS operation for lock-free algorithms
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];

const elements = {
    expected: document.getElementById('expected'),
    newValue: document.getElementById('new-value'),
    initBtn: document.getElementById('init-btn'),
    casBtn: document.getElementById('cas-btn'),
    raceBtn: document.getElementById('race-btn'),
    currentValue: document.getElementById('current-value'),
    casResults: document.getElementById('cas-results'),
    log: document.getElementById('log')
};

function initialize() {
    if (typeof SharedArrayBuffer === 'undefined') {
        log('ERROR: SharedArrayBuffer not supported');
        return;
    }

    sharedBuffer = new SharedArrayBuffer(4);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, 0);

    // Create workers
    workers.forEach(w => w.terminate());
    workers = [];

    for (let i = 0; i < 4; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    log('Initialized with value 0');
    updateDisplay();
    updateUI(true);
}

function performCAS() {
    const expected = parseInt(elements.expected.value);
    const newValue = parseInt(elements.newValue.value);

    const oldValue = Atomics.compareExchange(sharedArray, 0, expected, newValue);
    const success = oldValue === expected;

    log(`CAS(expected=${expected}, new=${newValue})`);
    log(`  Old value: ${oldValue}, Success: ${success}`);

    showCASResult('Main Thread', expected, newValue, oldValue, success);
    updateDisplay();
}

function runRaceTest() {
    // Reset value to 0
    Atomics.store(sharedArray, 0, 0);
    updateDisplay();

    elements.casResults.innerHTML = '<p style="color:var(--text-secondary);">Running CAS race test...</p>';
    log('--- Starting CAS Race Test ---');
    log('All workers try to CAS from 0 to their ID');

    // All workers try to CAS from 0 to their worker ID
    // Only one should succeed!
    workers.forEach((w, i) => {
        w.postMessage({
            type: 'cas',
            data: { expected: 0, newValue: i + 1 }
        });
    });
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'ready':
            log(`Worker ${workerId}: Ready`);
            break;
        case 'cas-result':
            showCASResult(`Worker ${workerId}`, data.expected, data.newValue, data.oldValue, data.success);
            if (data.success) {
                log(`Worker ${workerId}: CAS SUCCESS! Set value to ${data.newValue}`);
            } else {
                log(`Worker ${workerId}: CAS FAILED (value was ${data.oldValue})`);
            }
            updateDisplay();
            break;
    }
}

function showCASResult(source, expected, newValue, oldValue, success) {
    const color = success ? 'var(--success-color)' : 'var(--danger-color)';
    const result = success ? 'SUCCESS' : 'FAILED';

    const div = document.createElement('div');
    div.style.cssText = `padding:10px;margin:5px 0;background:var(--bg-secondary);border-radius:8px;border-left:4px solid ${color};`;
    div.innerHTML = `
        <strong style="color:${color};">${source}: ${result}</strong>
        <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:5px;">
            Expected: ${expected} | New: ${newValue} | Was: ${oldValue}
        </div>
    `;

    elements.casResults.insertBefore(div, elements.casResults.firstChild);

    // Limit results shown
    while (elements.casResults.children.length > 10) {
        elements.casResults.removeChild(elements.casResults.lastChild);
    }
}

function updateDisplay() {
    if (!sharedArray) {
        elements.currentValue.textContent = '-';
        return;
    }
    elements.currentValue.textContent = Atomics.load(sharedArray, 0);
}

function log(message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:3px 0;border-bottom:1px solid var(--border-color);';
    const color = message.includes('SUCCESS') ? 'var(--success-color)' :
                  message.includes('FAILED') ? 'var(--danger-color)' : 'var(--text-secondary)';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> <span style="color:${color};">${message}</span>`;
    elements.log.insertBefore(div, elements.log.firstChild);
}

function updateUI(enabled) {
    elements.casBtn.disabled = !enabled;
    elements.raceBtn.disabled = !enabled;
}

// Event listeners
elements.initBtn.addEventListener('click', initialize);
elements.casBtn.addEventListener('click', performCAS);
elements.raceBtn.addEventListener('click', runRaceTest);

updateDisplay();
