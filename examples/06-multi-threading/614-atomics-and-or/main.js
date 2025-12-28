/**
 * #614 Atomics AND/OR/XOR
 * Atomic bitwise operations demonstration
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];

const FLAG_NAMES = ['Ready', 'Running', 'Paused', 'Error', 'Complete', 'Locked', 'Active', 'Debug'];

const elements = {
    initBtn: document.getElementById('init-btn'),
    andBtn: document.getElementById('and-btn'),
    orBtn: document.getElementById('or-btn'),
    xorBtn: document.getElementById('xor-btn'),
    decimalValue: document.getElementById('decimal-value'),
    binaryValue: document.getElementById('binary-value'),
    bitFlags: document.getElementById('bit-flags'),
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

    for (let i = 0; i < 2; i++) {
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

function atomicAnd() {
    // Clear a random bit
    const bit = Math.floor(Math.random() * 8);
    const mask = ~(1 << bit); // All 1s except the bit we want to clear

    const oldValue = Atomics.and(sharedArray, 0, mask);
    const newValue = Atomics.load(sharedArray, 0);

    log(`AND with ${toBinary(mask)} (clear bit ${bit})`);
    log(`  ${toBinary(oldValue)} -> ${toBinary(newValue)}`);
    updateDisplay();

    // Also have a worker do AND
    workers[0].postMessage({
        type: 'and',
        data: { mask: ~(1 << ((bit + 1) % 8)) }
    });
}

function atomicOr() {
    // Set a random bit
    const bit = Math.floor(Math.random() * 8);
    const mask = 1 << bit;

    const oldValue = Atomics.or(sharedArray, 0, mask);
    const newValue = Atomics.load(sharedArray, 0);

    log(`OR with ${toBinary(mask)} (set bit ${bit}: ${FLAG_NAMES[bit]})`);
    log(`  ${toBinary(oldValue)} -> ${toBinary(newValue)}`);
    updateDisplay();

    // Also have a worker do OR
    workers[1].postMessage({
        type: 'or',
        data: { mask: 1 << ((bit + 1) % 8) }
    });
}

function atomicXor() {
    // Toggle a random bit
    const bit = Math.floor(Math.random() * 8);
    const mask = 1 << bit;

    const oldValue = Atomics.xor(sharedArray, 0, mask);
    const newValue = Atomics.load(sharedArray, 0);

    log(`XOR with ${toBinary(mask)} (toggle bit ${bit}: ${FLAG_NAMES[bit]})`);
    log(`  ${toBinary(oldValue)} -> ${toBinary(newValue)}`);
    updateDisplay();
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'ready':
            log(`Worker ${workerId}: Ready`);
            break;
        case 'and-done':
            log(`Worker ${workerId}: AND complete`);
            updateDisplay();
            break;
        case 'or-done':
            log(`Worker ${workerId}: OR complete`);
            updateDisplay();
            break;
    }
}

function updateDisplay() {
    if (!sharedArray) return;

    const value = Atomics.load(sharedArray, 0);
    elements.decimalValue.textContent = value;
    elements.binaryValue.textContent = toBinary(value);

    // Update bit flags
    let flagsHtml = '';
    for (let i = 7; i >= 0; i--) {
        const isSet = (value & (1 << i)) !== 0;
        const color = isSet ? 'var(--success-color)' : 'var(--bg-secondary)';
        const textColor = isSet ? 'white' : 'var(--text-muted)';
        flagsHtml += `
            <div style="padding:10px 15px;background:${color};color:${textColor};border-radius:8px;text-align:center;min-width:80px;" onclick="toggleBit(${i})">
                <div style="font-weight:bold;">Bit ${i}</div>
                <div style="font-size:0.8rem;">${FLAG_NAMES[i]}</div>
                <div style="font-size:1.2rem;">${isSet ? '1' : '0'}</div>
            </div>
        `;
    }
    elements.bitFlags.innerHTML = flagsHtml;
}

function toggleBit(bit) {
    if (!sharedArray) return;
    const mask = 1 << bit;
    Atomics.xor(sharedArray, 0, mask);
    log(`Toggled bit ${bit} (${FLAG_NAMES[bit]})`);
    updateDisplay();
}

// Make toggleBit available globally
window.toggleBit = toggleBit;

function toBinary(num) {
    return (num >>> 0).toString(2).padStart(8, '0');
}

function log(message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:3px 0;border-bottom:1px solid var(--border-color);';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    elements.log.insertBefore(div, elements.log.firstChild);
}

function updateUI(enabled) {
    elements.andBtn.disabled = !enabled;
    elements.orBtn.disabled = !enabled;
    elements.xorBtn.disabled = !enabled;
}

// Event listeners
elements.initBtn.addEventListener('click', initialize);
elements.andBtn.addEventListener('click', atomicAnd);
elements.orBtn.addEventListener('click', atomicOr);
elements.xorBtn.addEventListener('click', atomicXor);

updateDisplay();
