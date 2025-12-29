/**
 * Binary Parser - Main Thread Script
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
    elements.hexInput = document.getElementById('hex-input');
    elements.endian = document.getElementById('endian');
    elements.wordSize = document.getElementById('word-size');
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
        case 'text':
            hex = 'H e l l o ,   W o r l d !'.split('').filter(c => c !== ' ')
                .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(' ');
            break;
        case 'numbers':
            hex = Array.from({length: 32}, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            break;
        case 'struct':
            // Simulated C struct: int id, float value, char[8] name
            hex = '01 00 00 00 00 00 80 3F 54 65 73 74 00 00 00 00';
            break;
        case 'large':
            const bytes = [];
            for (let i = 0; i < 1000; i++) {
                bytes.push((i % 256).toString(16).padStart(2, '0').toUpperCase());
            }
            hex = bytes.join(' ');
            break;
    }
    elements.hexInput.value = hex;
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
    const hexStr = elements.hexInput.value.trim();
    if (!hexStr) {
        showError('Please enter hex data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Starting parse...');

    const bytes = hexToBytes(hexStr);
    worker.postMessage({
        type: 'PARSE',
        payload: {
            bytes: bytes.buffer,
            endian: elements.endian.value,
            wordSize: parseInt(elements.wordSize.value)
        }
    }, [bytes.buffer]);
}

function parseOnMainThread() {
    const hexStr = elements.hexInput.value.trim();
    if (!hexStr) {
        showError('Please enter hex data');
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
            const result = parseBinary(bytes, elements.endian.value, parseInt(elements.wordSize.value));
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
        } catch (e) {
            showError('Parse error: ' + e.message);
        }
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function parseBinary(bytes, endian, wordSize) {
    const view = new DataView(bytes.buffer);
    const littleEndian = endian === 'little';
    const stats = { totalBytes: bytes.length, words: 0, printableChars: 0 };
    const analysis = {
        hex: [],
        decimal: [],
        ascii: '',
        words: []
    };

    // Byte analysis
    for (let i = 0; i < bytes.length; i++) {
        analysis.hex.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
        analysis.decimal.push(bytes[i]);
        analysis.ascii += (bytes[i] >= 32 && bytes[i] < 127) ? String.fromCharCode(bytes[i]) : '.';
        if (bytes[i] >= 32 && bytes[i] < 127) stats.printableChars++;
    }

    // Word analysis
    const bytesPerWord = wordSize / 8;
    for (let i = 0; i + bytesPerWord <= bytes.length; i += bytesPerWord) {
        let value;
        switch (wordSize) {
            case 8:
                value = view.getUint8(i);
                break;
            case 16:
                value = view.getUint16(i, littleEndian);
                break;
            case 32:
                value = view.getUint32(i, littleEndian);
                break;
        }
        analysis.words.push(value);
        stats.words++;
    }

    return { analysis, stats };
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
            <span class="stat-value">${result.stats.totalBytes.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Words:</span>
            <span class="stat-value">${result.stats.words.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Printable:</span>
            <span class="stat-value">${result.stats.printableChars}</span>
        </div>
    `;

    let output = `Hex View:\n${result.analysis.hex.join(' ')}\n\n`;
    output += `ASCII View:\n${result.analysis.ascii}\n\n`;
    output += `Words (${elements.wordSize.value}-bit ${elements.endian.value} endian):\n`;
    output += result.analysis.words.slice(0, 100).join(', ');
    if (result.analysis.words.length > 100) output += '\n...(truncated)';

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
    elements.hexInput.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
