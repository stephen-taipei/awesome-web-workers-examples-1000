/**
 * #611 SharedArrayBuffer
 * Shared memory between workers demonstration
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];

const elements = {
    createBtn: document.getElementById('create-btn'),
    writeMainBtn: document.getElementById('write-main-btn'),
    writeWorkerBtn: document.getElementById('write-worker-btn'),
    readAllBtn: document.getElementById('read-all-btn'),
    bufferView: document.getElementById('buffer-view'),
    log: document.getElementById('log')
};

function checkSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        elements.bufferView.innerHTML = `
            <div class="error-message">
                SharedArrayBuffer is not available.<br>
                This requires Cross-Origin Isolation headers:<br>
                <code>Cross-Origin-Opener-Policy: same-origin</code><br>
                <code>Cross-Origin-Embedder-Policy: require-corp</code>
            </div>
        `;
        elements.createBtn.disabled = true;
        return false;
    }
    return true;
}

function createSharedBuffer() {
    if (!checkSupport()) return;

    // Create 64 bytes shared buffer
    sharedBuffer = new SharedArrayBuffer(64);
    sharedArray = new Int32Array(sharedBuffer);

    // Initialize with zeros
    for (let i = 0; i < sharedArray.length; i++) {
        sharedArray[i] = 0;
    }

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

    log('Created SharedArrayBuffer (64 bytes)');
    log('Created 2 workers with shared buffer access');
    updateBufferView();
    updateUI(true);
}

function writeFromMain() {
    if (!sharedArray) return;

    const index = Math.floor(Math.random() * sharedArray.length);
    const value = Math.floor(Math.random() * 1000);

    sharedArray[index] = value;
    log(`Main: Wrote ${value} at index ${index}`);
    updateBufferView();
}

function writeFromWorker() {
    if (workers.length === 0) return;

    const workerId = Math.floor(Math.random() * workers.length);
    workers[workerId].postMessage({
        type: 'write',
        data: {
            index: Math.floor(Math.random() * 16),
            value: Math.floor(Math.random() * 1000)
        }
    });
}

function readAll() {
    workers.forEach((worker, i) => {
        worker.postMessage({ type: 'read' });
    });
    log('Main: Reading all values...');
    updateBufferView();
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'ready':
            log(`Worker ${workerId}: Ready with shared buffer`);
            break;
        case 'wrote':
            log(`Worker ${workerId}: Wrote ${data.value} at index ${data.index}`);
            updateBufferView();
            break;
        case 'read':
            log(`Worker ${workerId}: Read values - sum = ${data.sum}`);
            break;
    }
}

function updateBufferView() {
    if (!sharedArray) {
        elements.bufferView.innerHTML = '<span style="color:var(--text-muted);">No buffer created</span>';
        return;
    }

    let html = '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:5px;">';
    for (let i = 0; i < sharedArray.length; i++) {
        const value = sharedArray[i];
        const bg = value > 0 ? 'var(--primary-color)' : 'var(--bg-primary)';
        html += `<div style="padding:8px;background:${bg};border-radius:4px;text-align:center;">${value}</div>`;
    }
    html += '</div>';
    elements.bufferView.innerHTML = html;
}

function log(message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:5px 0;border-bottom:1px solid var(--border-color);font-size:0.9rem;';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    elements.log.insertBefore(div, elements.log.firstChild);

    while (elements.log.children.length > 20) {
        elements.log.removeChild(elements.log.lastChild);
    }
}

function updateUI(enabled) {
    elements.writeMainBtn.disabled = !enabled;
    elements.writeWorkerBtn.disabled = !enabled;
    elements.readAllBtn.disabled = !enabled;
}

// Event listeners
elements.createBtn.addEventListener('click', createSharedBuffer);
elements.writeMainBtn.addEventListener('click', writeFromMain);
elements.writeWorkerBtn.addEventListener('click', writeFromWorker);
elements.readAllBtn.addEventListener('click', readAll);

// Initialize
checkSupport();
updateBufferView();
