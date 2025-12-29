/**
 * #617 Mutex Pattern
 * Mutual exclusion lock implementation
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let completedCount = 0;
let startTime = 0;

const elements = {
    workerCount: document.getElementById('worker-count'),
    opsCount: document.getElementById('ops-count'),
    testWithMutexBtn: document.getElementById('test-with-mutex-btn'),
    testWithoutMutexBtn: document.getElementById('test-without-mutex-btn'),
    lockIndicator: document.getElementById('lock-indicator'),
    lockHolder: document.getElementById('lock-holder'),
    counterValue: document.getElementById('counter-value'),
    expectedValue: document.getElementById('expected-value'),
    resultStatus: document.getElementById('result-status'),
    log: document.getElementById('log')
};

function runTest(useMutex) {
    if (typeof SharedArrayBuffer === 'undefined') {
        log('ERROR: SharedArrayBuffer not supported');
        return;
    }

    const workerCount = parseInt(elements.workerCount.value);
    const opsCount = parseInt(elements.opsCount.value);

    // Buffer: [0] = mutex, [1] = counter
    sharedBuffer = new SharedArrayBuffer(8);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, 0); // Mutex unlocked
    Atomics.store(sharedArray, 1, 0); // Counter = 0

    // Cleanup
    workers.forEach(w => w.terminate());
    workers = [];
    completedCount = 0;
    startTime = performance.now();

    // Clear log
    elements.log.innerHTML = '';

    const expected = workerCount * opsCount;
    elements.expectedValue.textContent = expected;
    elements.resultStatus.textContent = 'Running...';
    elements.resultStatus.style.color = 'var(--text-secondary)';
    elements.counterValue.textContent = '0';

    log(`Starting test ${useMutex ? 'WITH' : 'WITHOUT'} mutex`);
    log(`${workerCount} workers x ${opsCount} operations = ${expected} expected`);

    // Create workers
    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e, workerCount, opsCount);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    // Start all workers
    workers.forEach((w, i) => {
        w.postMessage({
            type: 'start',
            data: { operations: opsCount, useMutex }
        });
    });

    // Update display periodically
    updateLockDisplay();
}

function handleWorkerMessage(workerId, event, workerCount, opsCount) {
    const { type, data } = event.data;

    switch (type) {
        case 'locked':
            elements.lockIndicator.style.background = 'var(--danger-color)';
            elements.lockIndicator.textContent = 'LOCKED';
            elements.lockHolder.textContent = `Held by Worker ${workerId}`;
            break;

        case 'unlocked':
            elements.lockIndicator.style.background = 'var(--secondary-color)';
            elements.lockIndicator.textContent = 'UNLOCKED';
            elements.lockHolder.textContent = 'No holder';
            break;

        case 'complete':
            completedCount++;
            log(`Worker ${workerId}: Completed ${data.operations} ops in ${data.duration.toFixed(0)}ms`);

            if (completedCount === workerCount) {
                showResults(workerCount * opsCount);
            }
            break;
    }
}

function updateLockDisplay() {
    if (!sharedArray) return;

    const counter = Atomics.load(sharedArray, 1);
    elements.counterValue.textContent = counter;

    if (completedCount < workers.length) {
        requestAnimationFrame(updateLockDisplay);
    }
}

function showResults(expected) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const actual = Atomics.load(sharedArray, 1);
    const correct = actual === expected;

    elements.counterValue.textContent = actual;
    elements.resultStatus.textContent = correct ? 'CORRECT!' : 'RACE CONDITION!';
    elements.resultStatus.style.color = correct ? 'var(--success-color)' : 'var(--danger-color)';

    log(`--- Results ---`);
    log(`Expected: ${expected}, Actual: ${actual}`);
    log(`Status: ${correct ? 'SUCCESS' : 'FAILED - Race condition detected!'}`);
    log(`Total time: ${duration.toFixed(0)}ms`);
}

function log(message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:3px 0;border-bottom:1px solid var(--border-color);';
    const color = message.includes('SUCCESS') || message.includes('CORRECT') ? 'var(--success-color)' :
                  message.includes('FAILED') || message.includes('RACE') ? 'var(--danger-color)' : 'var(--text-secondary)';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> <span style="color:${color};">${message}</span>`;
    elements.log.insertBefore(div, elements.log.firstChild);
}

// Event listeners
elements.testWithMutexBtn.addEventListener('click', () => runTest(true));
elements.testWithoutMutexBtn.addEventListener('click', () => runTest(false));
