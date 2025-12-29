/**
 * Schema Validator - Main Thread Script
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
    elements.processBtn = document.getElementById('process-btn');
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
    elements.processBtn.addEventListener('click', processWithWorker);
    elements.mainBtn.addEventListener('click', processOnMainThread);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            generateData(parseInt(this.dataset.size));
        });
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Web Workers not supported');
        elements.processBtn.disabled = true;
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
            name: Math.random() > 0.1 ? `User_${i}` : 123,
            age: Math.random() > 0.1 ? 20 + (i % 50) : -5,
            email: Math.random() > 0.1 ? `user${i}@example.com` : 'invalid'
        });
    }
    elements.dataInput.value = JSON.stringify(data, null, 2);
}

function processWithWorker() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Starting...');
        worker.postMessage({ type: 'PROCESS', payload: { data } });
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function processOnMainThread() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Processing...');

        setTimeout(() => {
            const startTime = performance.now();
            const result = processData(data);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
            isProcessing = false;
            updateUIState(false);
        }, 50);
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function processData(data) {
    const schema = {
        type: 'object',
        properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            age: { type: 'number', minimum: 0, maximum: 120 },
            email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' }
        }
    };

    const items = Array.isArray(data) ? data : [data];
    const stats = { count: items.length, valid: 0, invalid: 0 };
    const results = [];

    for (const item of items) {
        const errors = validateAgainstSchema(item, schema);
        if (errors.length === 0) {
            stats.valid++;
            results.push({ item, valid: true });
        } else {
            stats.invalid++;
            results.push({ item, valid: false, errors });
        }
    }

    return { output: results.slice(0, 50), stats };
}

function validateAgainstSchema(item, schema) {
    const errors = [];
    for (const [prop, rules] of Object.entries(schema.properties)) {
        const value = item[prop];
        if (rules.type === 'number' && typeof value !== 'number') {
            errors.push(`${prop}: expected number`);
        }
        if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`${prop}: expected string`);
        }
        if (rules.minimum !== undefined && value < rules.minimum) {
            errors.push(`${prop}: below minimum`);
        }
        if (rules.maximum !== undefined && value > rules.maximum) {
            errors.push(`${prop}: above maximum`);
        }
        if (rules.pattern && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
            errors.push(`${prop}: pattern mismatch`);
        }
    }
    return errors;
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Process Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Items:</span>
            <span class="stat-value">${result.stats.count.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Valid:</span>
            <span class="stat-value" style="color: #28a745">${result.stats.valid}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Invalid:</span>
            <span class="stat-value" style="color: #dc3545">${result.stats.invalid}</span>
        </div>
    `;

    elements.resultOutput.textContent = JSON.stringify(result.output, null, 2);
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
    elements.processBtn.disabled = processing;
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
