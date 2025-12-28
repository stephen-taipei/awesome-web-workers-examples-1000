/**
 * YAML Parser - Main Thread Script
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
    elements.yamlInput = document.getElementById('yaml-input');
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
    let yaml = '';
    switch (preset) {
        case 'simple':
            yaml = `name: MyApp
version: 1.0.0
enabled: true
port: 3000`;
            break;
        case 'complex':
            yaml = `application:
  name: Enterprise App
  version: 2.5.3
  environment: production

servers:
  - name: web-1
    host: 192.168.1.10
    port: 8080
    roles:
      - frontend
      - api
  - name: web-2
    host: 192.168.1.11
    port: 8080
    roles:
      - frontend

database:
  primary:
    host: db-master.example.com
    port: 5432
    pool_size: 20
  replica:
    host: db-replica.example.com
    port: 5432
    pool_size: 10

logging:
  level: info
  outputs:
    - type: file
      path: /var/log/app.log
    - type: console
      format: json`;
            break;
        case 'large':
            yaml = 'items:\n';
            for (let i = 1; i <= 500; i++) {
                yaml += `  - id: ${i}\n`;
                yaml += `    name: Item ${i}\n`;
                yaml += `    price: ${(9.99 + i).toFixed(2)}\n`;
                yaml += `    active: ${i % 2 === 0}\n`;
            }
            break;
    }
    elements.yamlInput.value = yaml;
}

function parseWithWorker() {
    const yamlStr = elements.yamlInput.value;
    if (!yamlStr.trim()) {
        showError('Please enter YAML data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Starting parse...');
    worker.postMessage({ type: 'PARSE', payload: { yamlString: yamlStr } });
}

function parseOnMainThread() {
    const yamlStr = elements.yamlInput.value;
    if (!yamlStr.trim()) {
        showError('Please enter YAML data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Parsing...');

    setTimeout(() => {
        const startTime = performance.now();
        try {
            const result = parseYAML(yamlStr);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
        } catch (e) {
            showError('Parse error: ' + e.message);
        }
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function parseYAML(yamlString) {
    const lines = yamlString.split('\n');
    const stats = { lines: lines.length, keys: 0, arrays: 0, scalars: 0 };
    const result = {};
    const stack = [{ indent: -1, obj: result, isArray: false }];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) continue;

        const indent = line.search(/\S/);
        line = line.trim();

        // Pop stack to correct level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        const current = stack[stack.length - 1];

        // Array item
        if (line.startsWith('- ')) {
            stats.arrays++;
            const value = line.substring(2).trim();

            if (!Array.isArray(current.obj)) {
                current.obj = [];
            }

            if (value.includes(':')) {
                const colonIndex = value.indexOf(':');
                const key = value.substring(0, colonIndex).trim();
                const val = value.substring(colonIndex + 1).trim();
                const newObj = {};
                newObj[key] = parseValue(val);
                current.obj.push(newObj);
                stack.push({ indent: indent + 2, obj: newObj, isArray: false });
            } else if (value) {
                current.obj.push(parseValue(value));
            } else {
                const newObj = {};
                current.obj.push(newObj);
                stack.push({ indent: indent + 2, obj: newObj, isArray: false });
            }
        }
        // Key-value pair
        else if (line.includes(':')) {
            stats.keys++;
            const colonIndex = line.indexOf(':');
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();

            if (value) {
                stats.scalars++;
                current.obj[key] = parseValue(value);
            } else {
                current.obj[key] = {};
                stack.push({ indent: indent, obj: current.obj[key], isArray: false });
            }
        }
    }

    return { parsed: result, stats };
}

function parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null' || value === '~') return null;
    if (/^-?\d+$/.test(value)) return parseInt(value);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Parse Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Lines:</span>
            <span class="stat-value">${result.stats.lines.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Keys:</span>
            <span class="stat-value">${result.stats.keys.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Arrays:</span>
            <span class="stat-value">${result.stats.arrays.toLocaleString()}</span>
        </div>
    `;

    elements.resultOutput.textContent = JSON.stringify(result.parsed, null, 2);
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
    elements.yamlInput.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
