/**
 * URL Parser - Main Thread Script
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
    resultOutput: null
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
    elements.resultOutput = document.getElementById('result-output');
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
        alert('Please enter some URLs');
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
    const { parsedUrls, duration, stats } = payload;

    updateProgress(100, 'Completed');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Processing Time:</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total URLs:</span>
            <span class="stat-value">${stats.totalUrls}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Valid URLs:</span>
            <span class="stat-value">${stats.validUrls}</span>
        </div>
    `;

    let html = '';
    for (const url of parsedUrls) {
        html += `
            <div class="url-card">
                <div class="url-original">${escapeHTML(url.original)}</div>
                <table class="url-parts">
                    <tr><td>Protocol:</td><td>${escapeHTML(url.protocol || '-')}</td></tr>
                    <tr><td>Username:</td><td>${escapeHTML(url.username || '-')}</td></tr>
                    <tr><td>Password:</td><td>${escapeHTML(url.password || '-')}</td></tr>
                    <tr><td>Host:</td><td>${escapeHTML(url.host || '-')}</td></tr>
                    <tr><td>Port:</td><td>${escapeHTML(url.port || '-')}</td></tr>
                    <tr><td>Path:</td><td>${escapeHTML(url.pathname || '-')}</td></tr>
                    <tr><td>Query:</td><td>${escapeHTML(url.search || '-')}</td></tr>
                    <tr><td>Hash:</td><td>${escapeHTML(url.hash || '-')}</td></tr>
                </table>
                ${url.params && Object.keys(url.params).length > 0 ? `
                    <div class="query-params">
                        <strong>Query Parameters:</strong>
                        <ul>
                            ${Object.entries(url.params).map(([k, v]) =>
                                `<li><code>${escapeHTML(k)}</code> = ${escapeHTML(v)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    elements.resultOutput.innerHTML = html;
    elements.resultSection.classList.remove('hidden');
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
