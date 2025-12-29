/**
 * Data Validator - Main Thread Script
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
    elements.rulesInput = document.getElementById('rules-input');
    elements.validateBtn = document.getElementById('validate-btn');
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
    elements.validateBtn.addEventListener('click', validateWithWorker);
    elements.mainBtn.addEventListener('click', validateOnMainThread);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            generateData(parseInt(this.dataset.size));
        });
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Web Workers not supported');
        elements.validateBtn.disabled = true;
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
        const valid = Math.random() > 0.2;
        data.push({
            email: valid ? `user${i}@example.com` : `invalid-email-${i}`,
            age: valid ? 20 + (i % 60) : -5,
            score: valid ? Math.floor(Math.random() * 100) : 150
        });
    }
    elements.dataInput.value = JSON.stringify(data, null, 2);
}

function validateWithWorker() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        const rules = JSON.parse(elements.rulesInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Starting validation...');
        worker.postMessage({ type: 'VALIDATE', payload: { data, rules } });
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function validateOnMainThread() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        const rules = JSON.parse(elements.rulesInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Validating...');

        setTimeout(() => {
            const startTime = performance.now();
            const result = validateData(data, rules);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
            isProcessing = false;
            updateUIState(false);
        }, 50);
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function validateData(data, rules) {
    const records = Array.isArray(data) ? data : [data];
    const stats = { total: records.length, valid: 0, invalid: 0, errors: [] };
    const results = [];

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const validation = validateRecord(record, rules, i);
        results.push(validation);
        if (validation.valid) {
            stats.valid++;
        } else {
            stats.invalid++;
            stats.errors.push(...validation.errors.map(e => ({ index: i, ...e })));
        }
    }

    return { results, stats };
}

function validateRecord(record, rules, index) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const value = record[field];

        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({ field, message: 'Required field missing' });
            continue;
        }

        if (value === undefined || value === null) continue;

        if (rule.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                errors.push({ field, message: 'Invalid email format', value });
            }
        }

        if (rule.type === 'number') {
            if (typeof value !== 'number') {
                errors.push({ field, message: 'Expected number', value });
            } else {
                if (rule.min !== undefined && value < rule.min) {
                    errors.push({ field, message: `Value below minimum (${rule.min})`, value });
                }
                if (rule.max !== undefined && value > rule.max) {
                    errors.push({ field, message: `Value above maximum (${rule.max})`, value });
                }
            }
        }

        if (rule.type === 'string') {
            if (typeof value !== 'string') {
                errors.push({ field, message: 'Expected string', value });
            } else {
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push({ field, message: `String too short (min: ${rule.minLength})`, value });
                }
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push({ field, message: `String too long (max: ${rule.maxLength})`, value });
                }
            }
        }
    }

    return { index, valid: errors.length === 0, errors };
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Validation Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Records:</span>
            <span class="stat-value">${result.stats.total.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Valid:</span>
            <span class="stat-value" style="color: #28a745">${result.stats.valid.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Invalid:</span>
            <span class="stat-value" style="color: #dc3545">${result.stats.invalid.toLocaleString()}</span>
        </div>
    `;

    let output = 'Validation Errors:\n\n';
    const errorsToShow = result.stats.errors.slice(0, 50);
    errorsToShow.forEach(err => {
        output += `Record ${err.index}: ${err.field} - ${err.message}\n`;
    });
    if (result.stats.errors.length > 50) {
        output += `\n... and ${result.stats.errors.length - 50} more errors`;
    }
    if (result.stats.errors.length === 0) {
        output = 'All records passed validation!';
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
    elements.validateBtn.disabled = processing;
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
