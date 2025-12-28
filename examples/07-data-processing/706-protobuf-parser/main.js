/**
 * Protobuf Parser - Main Thread Script
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
    elements.protoInput = document.getElementById('proto-input');
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
            // Field 1: varint 150, Field 2: string "testing"
            hex = '08 96 01 12 07 74 65 73 74 69 6E 67';
            break;
        case 'nested':
            // Field 1: varint 150, Field 2: string "test", Field 3: embedded message
            hex = '08 96 01 12 04 74 65 73 74 1A 04 08 C8 01';
            break;
        case 'repeated':
            // Multiple Field 1 varints
            hex = '08 01 08 02 08 03 08 04 08 05 08 06 08 07 08 08 08 09 08 0A';
            break;
    }
    elements.protoInput.value = hex;
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
    const hexStr = elements.protoInput.value.trim();
    if (!hexStr) {
        showError('Please enter protobuf data');
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
    const hexStr = elements.protoInput.value.trim();
    if (!hexStr) {
        showError('Please enter protobuf data');
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
            const result = parseProtobuf(bytes);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
        } catch (e) {
            showError('Parse error: ' + e.message);
        }
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function parseProtobuf(bytes) {
    const stats = { totalBytes: bytes.length, fields: 0, varints: 0, strings: 0 };
    const fields = [];
    let pos = 0;

    function readVarint() {
        let result = 0;
        let shift = 0;
        while (pos < bytes.length) {
            const byte = bytes[pos++];
            result |= (byte & 0x7F) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
        }
        stats.varints++;
        return result;
    }

    while (pos < bytes.length) {
        const tag = readVarint();
        const fieldNumber = tag >> 3;
        const wireType = tag & 0x7;
        stats.fields++;

        let value;
        let typeName;

        switch (wireType) {
            case 0: // Varint
                value = readVarint();
                typeName = 'varint';
                break;
            case 1: // 64-bit
                value = bytes.slice(pos, pos + 8);
                pos += 8;
                typeName = '64-bit';
                break;
            case 2: // Length-delimited
                const len = readVarint();
                value = bytes.slice(pos, pos + len);
                pos += len;
                // Try to decode as string
                try {
                    const text = new TextDecoder().decode(value);
                    if (/^[\x20-\x7E]*$/.test(text)) {
                        value = text;
                        typeName = 'string';
                        stats.strings++;
                    } else {
                        typeName = 'bytes';
                    }
                } catch {
                    typeName = 'bytes';
                }
                break;
            case 5: // 32-bit
                value = bytes.slice(pos, pos + 4);
                pos += 4;
                typeName = '32-bit';
                break;
            default:
                typeName = 'unknown';
                value = null;
        }

        fields.push({ fieldNumber, wireType, typeName, value });
    }

    return { fields, stats };
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
            <span class="stat-label">Fields:</span>
            <span class="stat-value">${result.stats.fields}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Strings:</span>
            <span class="stat-value">${result.stats.strings}</span>
        </div>
    `;

    let output = 'Decoded Fields:\n\n';
    result.fields.forEach((field, i) => {
        output += `Field ${field.fieldNumber} (${field.typeName}): `;
        if (typeof field.value === 'string') {
            output += `"${field.value}"`;
        } else if (field.value instanceof Uint8Array) {
            output += `[${Array.from(field.value).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`;
        } else {
            output += field.value;
        }
        output += '\n';
    });

    elements.resultOutput.textContent = output;
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
    elements.protoInput.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
