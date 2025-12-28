/**
 * Log Parser - Main Thread Script
 */

let worker = null;

const elements = {
    inputText: null,
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
    const text = elements.inputText.value;
    if (!text.trim()) {
        alert('Please enter some log data');
        return;
    }

    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Starting...');

    worker.postMessage({
        type: 'PARSE',
        payload: { text }
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
    const { entries, duration, stats } = payload;

    updateProgress(100, 'Completed');

    let levelStats = '';
    for (const [level, count] of Object.entries(stats.levelCounts)) {
        levelStats += `
            <div class="stat-item">
                <span class="stat-label">${level}:</span>
                <span class="stat-value">${count}</span>
            </div>
        `;
    }

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Processing Time:</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Entries:</span>
            <span class="stat-value">${stats.totalEntries}</span>
        </div>
        ${levelStats}
    `;

    // Build table
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Level</th>
                    <th>Source</th>
                    <th>Message</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const entry of entries) {
        const levelClass = `log-${entry.level.toLowerCase()}`;
        tableHTML += `
            <tr class="${levelClass}">
                <td>${escapeHTML(entry.timestamp)}</td>
                <td><span class="level-badge ${levelClass}">${entry.level}</span></td>
                <td>${escapeHTML(entry.source)}</td>
                <td>${escapeHTML(entry.message)}</td>
            </tr>
        `;
    }

    tableHTML += '</tbody></table>';

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
