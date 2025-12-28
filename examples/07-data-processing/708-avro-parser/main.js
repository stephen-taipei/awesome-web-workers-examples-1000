/**
 * Avro Parser - Main Thread Script
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
    elements.schemaInput = document.getElementById('schema-input');
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
    switch (preset) {
        case 'simple':
            elements.schemaInput.value = JSON.stringify({
                type: "record",
                name: "User",
                fields: [
                    {name: "id", type: "int"},
                    {name: "name", type: "string"},
                    {name: "active", type: "boolean"}
                ]
            }, null, 2);
            elements.dataInput.value = JSON.stringify([
                {id: 1, name: "Alice", active: true},
                {id: 2, name: "Bob", active: false}
            ], null, 2);
            break;
        case 'nested':
            elements.schemaInput.value = JSON.stringify({
                type: "record",
                name: "Employee",
                fields: [
                    {name: "id", type: "int"},
                    {name: "name", type: "string"},
                    {name: "department", type: {
                        type: "record",
                        name: "Department",
                        fields: [
                            {name: "id", type: "int"},
                            {name: "name", type: "string"}
                        ]
                    }}
                ]
            }, null, 2);
            elements.dataInput.value = JSON.stringify([
                {id: 1, name: "Alice", department: {id: 10, name: "Engineering"}}
            ], null, 2);
            break;
        case 'large':
            const schema = {
                type: "record",
                name: "Record",
                fields: [
                    {name: "id", type: "int"},
                    {name: "value", type: "double"},
                    {name: "label", type: "string"}
                ]
            };
            const data = [];
            for (let i = 0; i < 1000; i++) {
                data.push({id: i, value: Math.random() * 100, label: `Item_${i}`});
            }
            elements.schemaInput.value = JSON.stringify(schema, null, 2);
            elements.dataInput.value = JSON.stringify(data, null, 2);
            break;
    }
}

function parseWithWorker() {
    try {
        const schema = JSON.parse(elements.schemaInput.value);
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Starting...');
        worker.postMessage({ type: 'PARSE', payload: { schema, data } });
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function parseOnMainThread() {
    try {
        const schema = JSON.parse(elements.schemaInput.value);
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Processing...');

        setTimeout(() => {
            const startTime = performance.now();
            const result = processAvro(schema, data);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
            isProcessing = false;
            updateUIState(false);
        }, 50);
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function processAvro(schema, data) {
    const records = Array.isArray(data) ? data : [data];
    const stats = { records: records.length, fields: schema.fields.length, validated: 0, errors: 0 };
    const validated = [];
    const encoded = [];

    for (const record of records) {
        const validation = validateRecord(record, schema);
        if (validation.valid) {
            stats.validated++;
            validated.push(record);
            encoded.push(encodeRecord(record, schema));
        } else {
            stats.errors++;
        }
    }

    return { schema, validated, encoded, stats };
}

function validateRecord(record, schema) {
    for (const field of schema.fields) {
        if (!(field.name in record)) {
            return { valid: false, error: `Missing field: ${field.name}` };
        }
        const value = record[field.name];
        const type = typeof field.type === 'string' ? field.type : field.type.type;

        if (type === 'int' && !Number.isInteger(value)) return { valid: false };
        if (type === 'string' && typeof value !== 'string') return { valid: false };
        if (type === 'boolean' && typeof value !== 'boolean') return { valid: false };
        if (type === 'double' && typeof value !== 'number') return { valid: false };
    }
    return { valid: true };
}

function encodeRecord(record, schema) {
    const bytes = [];
    for (const field of schema.fields) {
        const value = record[field.name];
        const type = typeof field.type === 'string' ? field.type : field.type.type;

        if (type === 'int') {
            bytes.push(...encodeVarint(value));
        } else if (type === 'string') {
            const strBytes = new TextEncoder().encode(value);
            bytes.push(...encodeVarint(strBytes.length));
            bytes.push(...strBytes);
        } else if (type === 'boolean') {
            bytes.push(value ? 1 : 0);
        } else if (type === 'double') {
            const buf = new ArrayBuffer(8);
            new DataView(buf).setFloat64(0, value, true);
            bytes.push(...new Uint8Array(buf));
        }
    }
    return bytes;
}

function encodeVarint(n) {
    const bytes = [];
    n = (n << 1) ^ (n >> 31); // ZigZag encoding
    while (n > 0x7f) {
        bytes.push((n & 0x7f) | 0x80);
        n >>>= 7;
    }
    bytes.push(n);
    return bytes;
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Process Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Records:</span>
            <span class="stat-value">${result.stats.records}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Validated:</span>
            <span class="stat-value">${result.stats.validated}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Fields:</span>
            <span class="stat-value">${result.stats.fields}</span>
        </div>
    `;

    let output = 'Validated Records:\n';
    output += JSON.stringify(result.validated.slice(0, 10), null, 2);
    if (result.validated.length > 10) output += '\n...(truncated)';
    output += '\n\nEncoded Bytes (first record):\n';
    output += result.encoded[0] ? result.encoded[0].map(b => b.toString(16).padStart(2, '0')).join(' ') : 'N/A';

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
