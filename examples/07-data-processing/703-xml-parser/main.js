/**
 * XML Parser - Main Thread Script
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
    elements.xmlInput = document.getElementById('xml-input');
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
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<catalog>\n';
    const categories = ['Programming', 'Science', 'Fiction', 'History', 'Art'];
    for (let i = 1; i <= count; i++) {
        xml += `  <book id="${i}">\n`;
        xml += `    <title>Book Title ${i}</title>\n`;
        xml += `    <author>Author ${i}</author>\n`;
        xml += `    <price>${(9.99 + (i % 50)).toFixed(2)}</price>\n`;
        xml += `    <category>${categories[i % 5]}</category>\n`;
        xml += `  </book>\n`;
    }
    xml += '</catalog>';
    elements.xmlInput.value = xml;
}

function parseWithWorker() {
    const xmlStr = elements.xmlInput.value.trim();
    if (!xmlStr) {
        showError('Please enter XML data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Starting parse...');
    worker.postMessage({ type: 'PARSE', payload: { xmlString: xmlStr } });
}

function parseOnMainThread() {
    const xmlStr = elements.xmlInput.value.trim();
    if (!xmlStr) {
        showError('Please enter XML data');
        return;
    }
    hideError();
    isProcessing = true;
    updateUIState(true);
    updateProgress(0, 'Parsing...');

    setTimeout(() => {
        const startTime = performance.now();
        try {
            const result = parseXML(xmlStr);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
        } catch (e) {
            showError('Parse error: ' + e.message);
        }
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function parseXML(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML');
    }

    const stats = { elements: 0, attributes: 0, textNodes: 0, maxDepth: 0 };

    function traverse(node, depth) {
        stats.maxDepth = Math.max(stats.maxDepth, depth);
        if (node.nodeType === 1) {
            stats.elements++;
            stats.attributes += node.attributes.length;
            for (const child of node.childNodes) {
                traverse(child, depth + 1);
            }
        } else if (node.nodeType === 3 && node.textContent.trim()) {
            stats.textNodes++;
        }
    }
    traverse(doc.documentElement, 0);

    const jsonResult = xmlToJson(doc.documentElement);
    return { json: jsonResult, stats };
}

function xmlToJson(node) {
    const obj = {};
    if (node.attributes && node.attributes.length > 0) {
        obj['@attributes'] = {};
        for (const attr of node.attributes) {
            obj['@attributes'][attr.name] = attr.value;
        }
    }
    for (const child of node.childNodes) {
        if (child.nodeType === 1) {
            const childObj = xmlToJson(child);
            if (obj[child.nodeName]) {
                if (!Array.isArray(obj[child.nodeName])) {
                    obj[child.nodeName] = [obj[child.nodeName]];
                }
                obj[child.nodeName].push(childObj);
            } else {
                obj[child.nodeName] = childObj;
            }
        } else if (child.nodeType === 3 && child.textContent.trim()) {
            obj['#text'] = child.textContent.trim();
        }
    }
    return obj;
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Parse Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Elements:</span>
            <span class="stat-value">${result.stats.elements.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Attributes:</span>
            <span class="stat-value">${result.stats.attributes.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Max Depth:</span>
            <span class="stat-value">${result.stats.maxDepth}</span>
        </div>
    `;

    const preview = JSON.stringify(result.json, null, 2).substring(0, 3000);
    elements.resultOutput.textContent = preview + (preview.length >= 3000 ? '\n...(truncated)' : '');
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
    elements.xmlInput.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
