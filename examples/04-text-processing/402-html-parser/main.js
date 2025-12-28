/**
 * HTML Parser - Main Thread Script
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
    treeOutput: null
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
    elements.treeOutput = document.getElementById('tree-output');
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
        alert('Please enter some HTML code');
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
    const { tree, duration, stats } = payload;

    updateProgress(100, 'Completed');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Processing Time:</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Elements:</span>
            <span class="stat-value">${stats.elementCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Max Depth:</span>
            <span class="stat-value">${stats.maxDepth}</span>
        </div>
    `;

    elements.treeOutput.innerHTML = renderTree(tree, 0);
    elements.resultSection.classList.remove('hidden');
}

function renderTree(nodes, level) {
    if (!nodes || nodes.length === 0) return '';

    let html = '<ul class="tree-list">';
    for (const node of nodes) {
        const indent = '  '.repeat(level);
        let nodeHtml = `<li class="tree-node">`;

        if (node.type === 'element') {
            nodeHtml += `<span class="tag-name">&lt;${node.tag}</span>`;
            if (node.attributes && Object.keys(node.attributes).length > 0) {
                for (const [key, value] of Object.entries(node.attributes)) {
                    nodeHtml += ` <span class="attr-name">${key}</span>=<span class="attr-value">"${value}"</span>`;
                }
            }
            nodeHtml += `<span class="tag-name">&gt;</span>`;
            if (node.children && node.children.length > 0) {
                nodeHtml += renderTree(node.children, level + 1);
            }
        } else if (node.type === 'text') {
            const text = node.content.trim();
            if (text) {
                nodeHtml += `<span class="text-content">"${text}"</span>`;
            }
        }

        nodeHtml += '</li>';
        html += nodeHtml;
    }
    html += '</ul>';
    return html;
}
