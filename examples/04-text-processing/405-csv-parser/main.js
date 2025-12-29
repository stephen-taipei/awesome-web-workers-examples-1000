/**
 * CSV Parser - Main Thread Script
 */

let worker = null;

const elements = {
    inputText: null,
    delimiter: null,
    hasHeader: null,
    processBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultStats: null,
    tableOutput: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.inputText = document.getElementById('input-text');
    elements.delimiter = document.getElementById('delimiter');
    elements.hasHeader = document.getElementById('has-header');
    elements.processBtn = document.getElementById('process-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.tableOutput = document.getElementById('table-output');
}

function setupEventListeners() {
    elements.processBtn.addEventListener('click', processText);
    elements.clearBtn.addEventListener('click', clearAll);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        alert('Web Workers not supported');
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
            displayResult(payload);
            break;
        case 'ERROR':
            alert('Error: ' + payload.message);
            updateProgress(0, 'Error occurred');
            break;
    }
}

function handleWorkerError(error) {
    alert('Worker error: ' + error.message);
    updateProgress(0, 'Error occurred');
}

function processText() {
    const text = elements.inputText.value.trim();
    if (!text) {
        alert('Please enter some CSV data');
        return;
    }

    const delimiter = elements.delimiter.value;
    const hasHeader = elements.hasHeader.value === 'true';

    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Starting...');

    worker.postMessage({
        type: 'PARSE',
        payload: { text, delimiter, hasHeader }
    });
}

function clearAll() {
    elements.inputText.value = '';
    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Ready');
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressBar.textContent = percent + '%';
    elements.progressText.textContent = message;
}

function displayResult(payload) {
    const { headers, data, duration, stats } = payload;

    updateProgress(100, 'Completed');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Processing Time:</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Rows:</span>
            <span class="stat-value">${stats.rowCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Columns:</span>
            <span class="stat-value">${stats.columnCount}</span>
        </div>
    `;

    // Build table
    let tableHTML = '<table class="data-table"><thead><tr>';

    for (const header of headers) {
        tableHTML += `<th>${escapeHTML(header)}</th>`;
    }
    tableHTML += '</tr></thead><tbody>';

    // Show max 100 rows
    const displayData = data.slice(0, 100);
    for (const row of displayData) {
        tableHTML += '<tr>';
        for (const cell of row) {
            tableHTML += `<td>${escapeHTML(cell)}</td>`;
        }
        tableHTML += '</tr>';
    }

    tableHTML += '</tbody></table>';

    if (data.length > 100) {
        tableHTML += `<p class="result-note">Showing first 100 of ${data.length} rows</p>`;
    }

    elements.tableOutput.innerHTML = tableHTML;
    elements.resultSection.classList.remove('hidden');
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
