/**
 * JSON Parser - Main Thread Script
 * Manages Web Worker for parsing large JSON data
 */

let worker = null;
let isProcessing = false;

const elements = {
    jsonInput: null,
    parseBtn: null,
    mainBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultStats: null,
    resultOutput: null,
    errorMessage: null,
    comparisonSection: null,
    workerTime: null,
    mainThreadTime: null,
    speedupText: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.jsonInput = document.getElementById('json-input');
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
    elements.speedupText = document.getElementById('speedup-text');
}

function setupEventListeners() {
    elements.parseBtn.addEventListener('click', parseWithWorker);
    elements.mainBtn.addEventListener('click', parseOnMainThread);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const size = parseInt(this.dataset.size);
            generateSampleData(size);
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

function generateSampleData(count) {
    const data = {
        users: [],
        metadata: { total: count, generated: new Date().toISOString() }
    };
    for (let i = 0; i < count; i++) {
        data.users.push({
            id: i + 1,
            name: `User_${i + 1}`,
            email: `user${i + 1}@example.com`,
            age: 20 + (i % 50),
            active: i % 2 === 0,
            score: Math.random() * 100,
            tags: ['tag1', 'tag2', 'tag3'].slice(0, (i % 3) + 1)
        });
    }
    elements.jsonInput.value = JSON.stringify(data, null, 2);
}

function parseWithWorker() {
    const jsonStr = elements.jsonInput.value.trim();
    if (!jsonStr) {
        showError('Please enter JSON data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Starting parse...');
    worker.postMessage({ type: 'PARSE', payload: { jsonString: jsonStr } });
}

function parseOnMainThread() {
    const jsonStr = elements.jsonInput.value.trim();
    if (!jsonStr) {
        showError('Please enter JSON data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Parsing on main thread...');

    setTimeout(() => {
        const startTime = performance.now();
        try {
            const parsed = JSON.parse(jsonStr);
            const analysis = analyzeStructure(parsed);
            const duration = performance.now() - startTime;
            displayResult({ parsed, analysis, duration }, 'main');
        } catch (e) {
            showError('Parse error: ' + e.message);
        }
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function analyzeStructure(obj, depth = 0) {
    const stats = { totalKeys: 0, maxDepth: depth, types: {}, arrayLengths: [] };

    function traverse(value, currentDepth) {
        const type = Array.isArray(value) ? 'array' : typeof value;
        stats.types[type] = (stats.types[type] || 0) + 1;
        stats.maxDepth = Math.max(stats.maxDepth, currentDepth);

        if (type === 'array') {
            stats.arrayLengths.push(value.length);
            value.forEach(item => traverse(item, currentDepth + 1));
        } else if (type === 'object' && value !== null) {
            const keys = Object.keys(value);
            stats.totalKeys += keys.length;
            keys.forEach(key => traverse(value[key], currentDepth + 1));
        }
    }
    traverse(obj, 0);
    return stats;
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');
    const { parsed, analysis, duration } = result;

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Parse Time:</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Keys:</span>
            <span class="stat-value">${analysis.totalKeys.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Max Depth:</span>
            <span class="stat-value">${analysis.maxDepth}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Source:</span>
            <span class="stat-value">${source === 'worker' ? 'Web Worker' : 'Main Thread'}</span>
        </div>
    `;

    const preview = JSON.stringify(parsed, null, 2).substring(0, 2000);
    elements.resultOutput.textContent = preview + (preview.length >= 2000 ? '\n...(truncated)' : '');
    elements.resultSection.classList.remove('hidden');

    if (source === 'worker') {
        elements.workerTime.textContent = duration.toFixed(2) + ' ms';
    } else {
        elements.mainThreadTime.textContent = duration.toFixed(2) + ' ms';
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
    elements.jsonInput.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
