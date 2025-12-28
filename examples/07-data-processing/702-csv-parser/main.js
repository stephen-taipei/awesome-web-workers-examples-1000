/**
 * CSV Parser - Main Thread Script
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
    elements.csvInput = document.getElementById('csv-input');
    elements.delimiter = document.getElementById('delimiter');
    elements.hasHeader = document.getElementById('has-header');
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
            generateSampleData(parseInt(this.dataset.size));
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
    const headers = 'id,name,email,age,department,salary,active\n';
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    let rows = headers;
    for (let i = 1; i <= count; i++) {
        rows += `${i},User_${i},user${i}@example.com,${20 + (i % 50)},${departments[i % 5]},${50000 + (i % 50) * 1000},${i % 2 === 0}\n`;
    }
    elements.csvInput.value = rows;
}

function parseWithWorker() {
    const csvStr = elements.csvInput.value.trim();
    if (!csvStr) {
        showError('Please enter CSV data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Starting parse...');

    worker.postMessage({
        type: 'PARSE',
        payload: {
            csvString: csvStr,
            delimiter: elements.delimiter.value === '\\t' ? '\t' : elements.delimiter.value,
            hasHeader: elements.hasHeader.value === 'true'
        }
    });
}

function parseOnMainThread() {
    const csvStr = elements.csvInput.value.trim();
    if (!csvStr) {
        showError('Please enter CSV data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Parsing...');

    setTimeout(() => {
        const startTime = performance.now();
        try {
            const delimiter = elements.delimiter.value === '\\t' ? '\t' : elements.delimiter.value;
            const hasHeader = elements.hasHeader.value === 'true';
            const result = parseCSV(csvStr, delimiter, hasHeader);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
        } catch (e) {
            showError('Parse error: ' + e.message);
        }
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function parseCSV(csvString, delimiter, hasHeader) {
    const lines = csvString.split('\n').filter(line => line.trim());
    const headers = hasHeader ? parseCSVLine(lines[0], delimiter) : null;
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows = [];

    for (const line of dataLines) {
        rows.push(parseCSVLine(line, delimiter));
    }

    return { headers, rows, rowCount: rows.length, columnCount: headers ? headers.length : (rows[0] ? rows[0].length : 0) };
}

function parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
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
            <span class="stat-value">${result.rowCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Columns:</span>
            <span class="stat-value">${result.columnCount}</span>
        </div>
    `;

    let tableHTML = '<thead><tr>';
    if (result.headers) {
        result.headers.forEach(h => tableHTML += `<th>${h}</th>`);
    } else {
        for (let i = 0; i < result.columnCount; i++) {
            tableHTML += `<th>Column ${i + 1}</th>`;
        }
    }
    tableHTML += '</tr></thead><tbody>';

    const displayRows = result.rows.slice(0, 100);
    displayRows.forEach(row => {
        tableHTML += '<tr>';
        row.forEach(cell => tableHTML += `<td>${cell}</td>`);
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
    elements.csvInput.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
