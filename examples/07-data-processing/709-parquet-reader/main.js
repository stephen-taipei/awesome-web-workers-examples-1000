/**
 * Parquet Reader - Main Thread Script
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
    elements.dataInput = document.getElementById('data-input');
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
            generateData(parseInt(this.dataset.size));
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

function generateData(count) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push({
            id: i + 1,
            name: `User_${i + 1}`,
            score: Math.round(Math.random() * 100 * 10) / 10,
            passed: Math.random() > 0.3,
            category: ['A', 'B', 'C'][i % 3]
        });
    }
    elements.dataInput.value = JSON.stringify(data, null, 2);
}

function parseWithWorker() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Starting...');
        worker.postMessage({ type: 'PARSE', payload: { data } });
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function parseOnMainThread() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Processing...');

        setTimeout(() => {
            const startTime = performance.now();
            const result = processColumnar(data);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
            isProcessing = false;
            updateUIState(false);
        }, 50);
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function processColumnar(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return { columns: {}, stats: { rows: 0, columns: 0 } };
    }

    const columns = {};
    const columnNames = Object.keys(data[0]);

    // Convert row-based to columnar format
    for (const name of columnNames) {
        columns[name] = {
            values: [],
            type: null,
            stats: {}
        };
    }

    for (const row of data) {
        for (const name of columnNames) {
            columns[name].values.push(row[name]);
        }
    }

    // Analyze each column
    for (const name of columnNames) {
        const col = columns[name];
        col.type = inferType(col.values);
        col.stats = calculateColumnStats(col.values, col.type);
    }

    return {
        columns,
        stats: {
            rows: data.length,
            columns: columnNames.length
        }
    };
}

function inferType(values) {
    const sample = values.find(v => v !== null && v !== undefined);
    if (sample === undefined) return 'null';
    if (typeof sample === 'number') return Number.isInteger(sample) ? 'int' : 'double';
    if (typeof sample === 'boolean') return 'boolean';
    if (typeof sample === 'string') return 'string';
    return 'unknown';
}

function calculateColumnStats(values, type) {
    const stats = { nullCount: values.filter(v => v === null || v === undefined).length };

    if (type === 'int' || type === 'double') {
        const nums = values.filter(v => typeof v === 'number');
        stats.min = Math.min(...nums);
        stats.max = Math.max(...nums);
        stats.sum = nums.reduce((a, b) => a + b, 0);
        stats.avg = stats.sum / nums.length;
    } else if (type === 'string') {
        const strs = values.filter(v => typeof v === 'string');
        stats.minLen = Math.min(...strs.map(s => s.length));
        stats.maxLen = Math.max(...strs.map(s => s.length));
        stats.distinctCount = new Set(strs).size;
    } else if (type === 'boolean') {
        stats.trueCount = values.filter(v => v === true).length;
        stats.falseCount = values.filter(v => v === false).length;
    }

    return stats;
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Process Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Rows:</span>
            <span class="stat-value">${result.stats.rows.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Columns:</span>
            <span class="stat-value">${result.stats.columns}</span>
        </div>
    `;

    let output = 'Column Analysis:\n\n';
    for (const [name, col] of Object.entries(result.columns)) {
        output += `${name} (${col.type}):\n`;
        output += `  Stats: ${JSON.stringify(col.stats)}\n`;
        output += `  Sample: [${col.values.slice(0, 5).join(', ')}${col.values.length > 5 ? '...' : ''}]\n\n`;
    }

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
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
