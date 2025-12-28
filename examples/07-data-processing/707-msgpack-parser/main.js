/**
 * MessagePack Parser - Main Thread Script
 */

let worker = null;
let isProcessing = false;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.msgpackInput = document.getElementById('msgpack-input');
    elements.parseBtn = document.getElementById('parse-btn');
    elements.mainBtn = document.getElementById('main-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');
    elements.errorMessage = document.getElementById('error-message');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.workerTime = document.getElementById('worker-time');
    elements.mainThreadTime = document.getElementById('main-thread-time');
}

function setupEventListeners() {
    elements.parseBtn.addEventListener('click', parseWithWorker);
    elements.mainBtn.addEventListener('click', parseOnMainThread);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            generatePreset(this.dataset.preset);
        });
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Web Workers not supported');
        elements.parseBtn.disabled = true;
        return;
    }
    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

function handleWorkerMessage(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;
        case 'RESULT':
            displayResult(payload, 'worker');
            isProcessing = false;
            updateUIState(false);
            break;
        case 'ERROR':
            showError(payload.message);
            isProcessing = false;
            updateUIState(false);
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    isProcessing = false;
    updateUIState(false);
}

function generatePreset(preset) {
    let hex = '';
    switch (preset) {
        case 'simple':
            // {"name": "Alice", "age": 28}
            hex = '82 A4 6E 61 6D 65 A5 41 6C 69 63 65 A3 61 67 65 1C';
            break;
        case 'array':
            // [1, 2, 3, 4, 5]
            hex = '95 01 02 03 04 05';
            break;
        case 'nested':
            // {"user": {"name": "Bob", "scores": [95, 87, 92]}}
            hex = '81 A4 75 73 65 72 82 A4 6E 61 6D 65 A3 42 6F 62 A6 73 63 6F 72 65 73 93 5F 57 5C';
            break;
    }
    elements.msgpackInput.value = hex;
}

function hexToBytes(hexStr) {
    const cleaned = hexStr.replace(/[,\s]+/g, ' ').trim();
    const hexValues = cleaned.split(' ').filter(h => h);
    const bytes = new Uint8Array(hexValues.length);
    for (let i = 0; i < hexValues.length; i++) {
        bytes[i] = parseInt(hexValues[i], 16);
    }
    return bytes;
}

function parseWithWorker() {
    const hexStr = elements.msgpackInput.value.trim();
    if (!hexStr) {
        showError('Please enter MessagePack data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Starting parse...');

    const bytes = hexToBytes(hexStr);
    worker.postMessage({ type: 'PARSE', payload: { bytes: bytes.buffer } }, [bytes.buffer]);
}

function parseOnMainThread() {
    const hexStr = elements.msgpackInput.value.trim();
    if (!hexStr) {
        showError('Please enter MessagePack data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Parsing...');

    setTimeout(() => {
        const startTime = performance.now();
        try {
            const bytes = hexToBytes(hexStr);
            const result = parseMsgPack(bytes);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
        } catch (e) {
            showError('Parse error: ' + e.message);
        }
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function parseMsgPack(bytes) {
    const stats = { totalBytes: bytes.length, objects: 0, arrays: 0, strings: 0 };
    let pos = 0;

    function decode() {
        if (pos >= bytes.length) return null;
        const byte = bytes[pos++];

        // Positive fixint (0x00 - 0x7f)
        if (byte <= 0x7f) return byte;

        // Fixmap (0x80 - 0x8f)
        if (byte >= 0x80 && byte <= 0x8f) {
            stats.objects++;
            const size = byte & 0x0f;
            const obj = {};
            for (let i = 0; i < size; i++) {
                const key = decode();
                const value = decode();
                obj[key] = value;
            }
            return obj;
        }

        // Fixarray (0x90 - 0x9f)
        if (byte >= 0x90 && byte <= 0x9f) {
            stats.arrays++;
            const size = byte & 0x0f;
            const arr = [];
            for (let i = 0; i < size; i++) {
                arr.push(decode());
            }
            return arr;
        }

        // Fixstr (0xa0 - 0xbf)
        if (byte >= 0xa0 && byte <= 0xbf) {
            stats.strings++;
            const len = byte & 0x1f;
            const str = new TextDecoder().decode(bytes.slice(pos, pos + len));
            pos += len;
            return str;
        }

        // nil (0xc0)
        if (byte === 0xc0) return null;

        // false (0xc2)
        if (byte === 0xc2) return false;

        // true (0xc3)
        if (byte === 0xc3) return true;

        // Negative fixint (0xe0 - 0xff)
        if (byte >= 0xe0) return byte - 256;

        return byte;
    }

    const decoded = decode();
    return { decoded, stats };
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Parse Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Bytes:</span>
            <span class="stat-value">${result.stats.totalBytes}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Objects:</span>
            <span class="stat-value">${result.stats.objects}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Arrays:</span>
            <span class="stat-value">${result.stats.arrays}</span>
        </div>
    `;

    elements.resultOutput.textContent = JSON.stringify(result.decoded, null, 2);
    elements.resultSection.classList.remove('hidden');

    if (source === 'worker') {
        elements.workerTime.textContent = result.duration.toFixed(2) + ' ms';
    } else {
        elements.mainThreadTime.textContent = result.duration.toFixed(2) + ' ms';
    }
    elements.comparisonSection.classList.remove('hidden');
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressBar.textContent = percent + '%';
    elements.progressText.textContent = message;
}

function updateUIState(processing) {
    elements.parseBtn.disabled = processing;
    elements.mainBtn.disabled = processing;
    elements.msgpackInput.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
