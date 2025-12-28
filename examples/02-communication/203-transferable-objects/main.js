// DOM Elements
const bufferSizeSelect = document.getElementById('bufferSize');
const runTestBtn = document.getElementById('runTestBtn');
const testProgress = document.getElementById('testProgress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const copyTimeDisplay = document.getElementById('copyTime');
const transferTimeDisplay = document.getElementById('transferTime');
const speedupInfo = document.getElementById('speedupInfo');
const speedupFactor = document.getElementById('speedupFactor');

const createBufferBtn = document.getElementById('createBufferBtn');
const transferBufferBtn = document.getElementById('transferBufferBtn');
const checkBufferBtn = document.getElementById('checkBufferBtn');
const mainBufferStatus = document.getElementById('mainBufferStatus');
const bufferSizeDisplay = document.getElementById('bufferSizeDisplay');
const ownershipDisplay = document.getElementById('ownershipDisplay');
const ownershipLog = document.getElementById('ownershipLog');

// Worker
const worker = new Worker('worker.js');

// State
let currentBuffer = null;
let copyTime = null;
let transferTime = null;

// Event Listeners
runTestBtn.addEventListener('click', runComparisonTest);
createBufferBtn.addEventListener('click', createBuffer);
transferBufferBtn.addEventListener('click', transferBuffer);
checkBufferBtn.addEventListener('click', checkBuffer);

// Worker message handler
worker.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'WORKER_READY':
            console.log('Worker ready');
            break;

        case 'COPY_RESULT':
            copyTime = payload.time;
            copyTimeDisplay.textContent = copyTime.toFixed(2);
            updateProgress(50, '執行轉移測試...');
            runTransferTest();
            break;

        case 'TRANSFER_RESULT':
            transferTime = payload.time;
            transferTimeDisplay.textContent = transferTime.toFixed(2);
            finishTest();
            break;

        case 'BUFFER_RECEIVED':
            addOwnershipLog('success', `Worker 收到緩衝區: ${payload.byteLength} bytes`);
            addOwnershipLog('info', `前 10 bytes: [${payload.firstBytes.join(', ')}]`);
            break;

        case 'PROCESSED_BUFFER':
            currentBuffer = payload;
            addOwnershipLog('success', '緩衝區已處理並返回主執行緒');
            updateOwnershipStatus();
            break;
    }
};

async function runComparisonTest() {
    const sizeMB = parseInt(bufferSizeSelect.value);
    const sizeBytes = sizeMB * 1024 * 1024;

    // Reset
    copyTime = null;
    transferTime = null;
    copyTimeDisplay.textContent = '-';
    transferTimeDisplay.textContent = '-';
    speedupInfo.classList.add('hidden');

    // Show progress
    testProgress.classList.remove('hidden');
    runTestBtn.disabled = true;

    updateProgress(10, '生成測試資料...');

    // Create test buffer
    await sleep(100);
    const buffer = new ArrayBuffer(sizeBytes);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
    }

    updateProgress(25, '執行複製測試...');

    // Run copy test
    await sleep(100);
    const copyStart = performance.now();
    worker.postMessage({
        type: 'COPY_TEST',
        payload: { buffer: buffer.slice() }
    });
}

function runTransferTest() {
    const sizeMB = parseInt(bufferSizeSelect.value);
    const sizeBytes = sizeMB * 1024 * 1024;

    // Create new buffer for transfer test
    const buffer = new ArrayBuffer(sizeBytes);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
    }

    const transferStart = performance.now();
    worker.postMessage({
        type: 'TRANSFER_TEST',
        payload: buffer
    }, [buffer]);

    // Note: buffer is now detached
    console.log('Buffer after transfer:', buffer.byteLength); // Should be 0
}

function finishTest() {
    updateProgress(100, '測試完成！');

    setTimeout(() => {
        testProgress.classList.add('hidden');
        runTestBtn.disabled = false;

        // Calculate speedup
        if (copyTime && transferTime && transferTime > 0) {
            const factor = (copyTime / transferTime).toFixed(1);
            speedupFactor.textContent = factor;
            speedupInfo.classList.remove('hidden');
        }
    }, 500);
}

function updateProgress(percent, text) {
    progressBar.style.width = percent + '%';
    progressText.textContent = text;
}

function createBuffer() {
    const size = 1024 * 100; // 100 KB for demo
    currentBuffer = new ArrayBuffer(size);
    const view = new Uint8Array(currentBuffer);

    // Fill with some data
    for (let i = 0; i < view.length; i++) {
        view[i] = i % 256;
    }

    updateOwnershipStatus();
    transferBufferBtn.disabled = false;
    checkBufferBtn.disabled = false;

    addOwnershipLog('success', `建立 ArrayBuffer: ${size} bytes`);
}

function transferBuffer() {
    if (!currentBuffer) return;

    addOwnershipLog('info', '轉移緩衝區到 Worker...');

    worker.postMessage({
        type: 'RECEIVE_BUFFER',
        payload: currentBuffer
    }, [currentBuffer]);

    // Buffer is now detached
    setTimeout(() => {
        updateOwnershipStatus();
        addOwnershipLog('warn', `主執行緒緩衝區已分離 (detached): byteLength = ${currentBuffer.byteLength}`);
    }, 100);
}

function checkBuffer() {
    if (!currentBuffer) {
        addOwnershipLog('error', '緩衝區不存在');
        return;
    }

    try {
        const view = new Uint8Array(currentBuffer);
        addOwnershipLog('info', `緩衝區狀態: ${currentBuffer.byteLength} bytes`);

        if (currentBuffer.byteLength === 0) {
            addOwnershipLog('warn', '緩衝區已分離，無法存取資料');
        } else {
            addOwnershipLog('success', `可存取，前 5 bytes: [${Array.from(view.slice(0, 5)).join(', ')}]`);
        }
    } catch (e) {
        addOwnershipLog('error', `存取錯誤: ${e.message}`);
    }
}

function updateOwnershipStatus() {
    if (!currentBuffer) {
        mainBufferStatus.textContent = '未建立';
        bufferSizeDisplay.textContent = '-';
        ownershipDisplay.textContent = '-';
        return;
    }

    const byteLength = currentBuffer.byteLength;

    if (byteLength === 0) {
        mainBufferStatus.textContent = '已分離 (detached)';
        mainBufferStatus.className = 'value status-detached';
        bufferSizeDisplay.textContent = '0 bytes';
        ownershipDisplay.textContent = 'Worker';
        ownershipDisplay.className = 'value status-worker';
    } else {
        mainBufferStatus.textContent = '有效';
        mainBufferStatus.className = 'value status-valid';
        bufferSizeDisplay.textContent = formatBytes(byteLength);
        ownershipDisplay.textContent = '主執行緒';
        ownershipDisplay.className = 'value status-main';
    }
}

function addOwnershipLog(level, message) {
    const time = new Date().toLocaleTimeString();
    const icons = {
        success: '✅',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
    };

    const entry = document.createElement('div');
    entry.className = 'log-entry log-' + level;
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${icons[level]} ${message}`;

    ownershipLog.insertBefore(entry, ownershipLog.firstChild);

    // Limit entries
    while (ownershipLog.children.length > 10) {
        ownershipLog.removeChild(ownershipLog.lastChild);
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
