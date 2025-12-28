/**
 * #610 Transferable Objects
 * Zero-copy data transfer demonstration
 */

let worker = null;
let testBuffer = null;
let results = { clone: null, transfer: null };

const elements = {
    dataSize: document.getElementById('data-size'),
    testCloneBtn: document.getElementById('test-clone-btn'),
    testTransferBtn: document.getElementById('test-transfer-btn'),
    compareBtn: document.getElementById('compare-btn'),
    results: document.getElementById('results'),
    comparison: document.getElementById('comparison'),
    bufferStatus: document.getElementById('buffer-status')
};

function initWorker() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
}

function handleWorkerMessage(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'clone-result':
            results.clone = data;
            displayResult('Clone (Copy)', data);
            break;

        case 'transfer-result':
            results.transfer = data;
            displayResult('Transfer (Zero-Copy)', data);
            break;

        case 'ready':
            updateBufferStatus();
            break;
    }

    if (results.clone && results.transfer) {
        displayComparison();
    }
}

function createTestBuffer() {
    const sizeMB = parseInt(elements.dataSize.value);
    const sizeBytes = sizeMB * 1024 * 1024;

    testBuffer = new ArrayBuffer(sizeBytes);
    const view = new Uint8Array(testBuffer);

    // Fill with random data
    for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
    }

    updateBufferStatus();
    return testBuffer;
}

function testClone() {
    results.clone = null;
    results.transfer = null;
    elements.comparison.innerHTML = '';

    const buffer = createTestBuffer();
    const startTime = performance.now();

    // Send without transfer list - will be cloned
    worker.postMessage({
        type: 'process-clone',
        data: {
            buffer: buffer,
            sendTime: startTime
        }
    });

    updateBufferStatus();
}

function testTransfer() {
    results.clone = null;
    results.transfer = null;
    elements.comparison.innerHTML = '';

    const buffer = createTestBuffer();
    const startTime = performance.now();

    // Send with transfer list - zero-copy
    worker.postMessage({
        type: 'process-transfer',
        data: {
            buffer: buffer,
            sendTime: startTime
        }
    }, [buffer]); // Transfer the buffer

    // Buffer is now neutered (detached)
    testBuffer = buffer;
    updateBufferStatus();
}

function compareBoth() {
    results.clone = null;
    results.transfer = null;
    elements.results.innerHTML = '<p style="color:var(--text-secondary);">Running comparison...</p>';
    elements.comparison.innerHTML = '';

    // Test clone first
    const buffer1 = createTestBuffer();
    const startTime1 = performance.now();

    worker.postMessage({
        type: 'process-clone',
        data: { buffer: buffer1, sendTime: startTime1 }
    });

    // Test transfer after a delay
    setTimeout(() => {
        const buffer2 = createTestBuffer();
        const startTime2 = performance.now();

        worker.postMessage({
            type: 'process-transfer',
            data: { buffer: buffer2, sendTime: startTime2 }
        }, [buffer2]);

        testBuffer = buffer2;
        updateBufferStatus();
    }, 100);
}

function displayResult(label, data) {
    const sizeMB = data.size / (1024 * 1024);
    const throughput = sizeMB / (data.transferTime / 1000);

    let html = elements.results.innerHTML;
    if (!results.clone || !results.transfer) {
        html = '';
    }

    html += `
        <div style="margin-bottom:15px;padding:15px;background:var(--bg-secondary);border-radius:8px;">
            <h4 style="color:var(--primary-color);margin-bottom:10px;">${label}</h4>
            <div class="stat-item">
                <span class="stat-label">Data Size:</span>
                <span class="stat-value">${sizeMB.toFixed(2)} MB</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Transfer Time:</span>
                <span class="stat-value">${data.transferTime.toFixed(2)} ms</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Processing Time:</span>
                <span class="stat-value">${data.processTime.toFixed(2)} ms</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Throughput:</span>
                <span class="stat-value">${throughput.toFixed(2)} MB/s</span>
            </div>
        </div>
    `;
    elements.results.innerHTML = html;
}

function displayComparison() {
    const speedup = results.clone.transferTime / results.transfer.transferTime;
    const color = speedup > 1 ? 'var(--success-color)' : 'var(--warning-color)';

    elements.comparison.innerHTML = `
        <div style="padding:20px;background:var(--bg-card);border-radius:8px;text-align:center;">
            <h4 style="color:var(--primary-color);margin-bottom:15px;">Performance Comparison</h4>
            <p style="font-size:1.5rem;color:${color};font-weight:bold;">
                Transfer is ${speedup.toFixed(1)}x faster
            </p>
            <p style="color:var(--text-secondary);margin-top:10px;">
                Clone: ${results.clone.transferTime.toFixed(2)} ms vs Transfer: ${results.transfer.transferTime.toFixed(2)} ms
            </p>
            <p style="color:var(--text-muted);font-size:0.9rem;margin-top:10px;">
                Transfer achieves near-zero overhead regardless of data size
            </p>
        </div>
    `;
}

function updateBufferStatus() {
    let html = '';

    if (testBuffer) {
        const isDetached = testBuffer.byteLength === 0;
        const status = isDetached ? 'Detached (Transferred)' : 'Available';
        const color = isDetached ? 'var(--warning-color)' : 'var(--success-color)';

        html = `
            <div class="stat-item">
                <span class="stat-label">Buffer Status:</span>
                <span class="stat-value" style="color:${color};">${status}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Byte Length:</span>
                <span class="stat-value">${testBuffer.byteLength.toLocaleString()} bytes</span>
            </div>
        `;

        if (isDetached) {
            html += `
                <p style="color:var(--text-muted);margin-top:10px;font-size:0.9rem;">
                    The buffer has been transferred to the worker. The main thread can no longer access it.
                </p>
            `;
        }
    } else {
        html = '<p style="color:var(--text-muted);">No buffer created yet</p>';
    }

    elements.bufferStatus.innerHTML = html;
}

// Event listeners
elements.testCloneBtn.addEventListener('click', testClone);
elements.testTransferBtn.addEventListener('click', testTransfer);
elements.compareBtn.addEventListener('click', compareBoth);

// Initialize
initWorker();
updateBufferStatus();
