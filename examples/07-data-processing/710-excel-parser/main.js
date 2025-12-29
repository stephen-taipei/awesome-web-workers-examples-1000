/**
 * Excel Parser - Main Thread Script
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
    elements.sheetInput = document.getElementById('sheet-input');
    elements.parseBtn = document.getElementById('parse-btn');
    elements.mainBtn = document.getElementById('main-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultTable = document.getElementById('result-table');
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
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    let data = 'Name\tAge\tDepartment\tSalary\tBonus\n';
    for (let i = 1; i <= count; i++) {
        const salary = 50000 + (i % 50) * 1000;
        data += `Employee_${i}\t${20 + (i % 40)}\t${departments[i % 5]}\t${salary}\t=D${i+1}*0.1\n`;
    }
    elements.sheetInput.value = data;
}

function parseWithWorker() {
    const sheetData = elements.sheetInput.value;
    if (!sheetData.trim()) {
        showError('Please enter spreadsheet data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Starting...');
    worker.postMessage({ type: 'PARSE', payload: { sheetData } });
}

function parseOnMainThread() {
    const sheetData = elements.sheetInput.value;
    if (!sheetData.trim()) {
        showError('Please enter spreadsheet data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Processing...');

    setTimeout(() => {
        const startTime = performance.now();
        const result = parseSheet(sheetData);
        result.duration = performance.now() - startTime;
        displayResult(result, 'main');
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function parseSheet(sheetData) {
    const lines = sheetData.split('\n').filter(l => l.trim());
    const delimiter = sheetData.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = [];
    const stats = { rows: 0, columns: headers.length, formulas: 0, numbers: 0, strings: 0 };

    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(delimiter).map(c => c.trim());
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            const cell = cells[j] || '';
            const parsed = parseCell(cell);
            row[headers[j]] = parsed;
            if (parsed.type === 'formula') stats.formulas++;
            else if (parsed.type === 'number') stats.numbers++;
            else stats.strings++;
        }
        rows.push(row);
        stats.rows++;
    }

    return { headers, rows, stats };
}

function parseCell(value) {
    if (value.startsWith('=')) {
        return { type: 'formula', value: value, display: evaluateFormula(value) };
    }
    const num = parseFloat(value);
    if (!isNaN(num) && value.trim() !== '') {
        return { type: 'number', value: num, display: num };
    }
    return { type: 'string', value: value, display: value };
}

function evaluateFormula(formula) {
    // Simple formula evaluation (just for demo)
    return '[Formula]';
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Parse Time:</span>
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
        <div class="stat-item">
            <span class="stat-label">Formulas:</span>
            <span class="stat-value">${result.stats.formulas}</span>
        </div>
    `;

    let tableHTML = '<thead><tr>';
    result.headers.forEach(h => tableHTML += `<th>${h}</th>`);
    tableHTML += '</tr></thead><tbody>';

    result.rows.slice(0, 100).forEach(row => {
        tableHTML += '<tr>';
        result.headers.forEach(h => {
            const cell = row[h];
            tableHTML += `<td>${cell ? cell.display : ''}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';

    elements.resultTable.innerHTML = tableHTML;
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
