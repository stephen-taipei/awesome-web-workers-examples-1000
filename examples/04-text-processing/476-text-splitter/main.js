let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.splitType = document.getElementById('split-type');
    elements.delimiter = document.getElementById('delimiter');
    elements.delimiterGroup = document.getElementById('delimiter-group');
    elements.splitSize = document.getElementById('split-size');
    elements.sizeGroup = document.getElementById('size-group');
    elements.processBtn = document.getElementById('process-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');

    elements.splitType.addEventListener('change', updateUI);
    elements.processBtn.addEventListener('click', processText);

    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            elements.progressBar.style.width = payload.percent + '%';
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Parts:</span><span class="stat-value">${payload.parts.length}</span></div>
            `;
            let html = '<h3>Split Results</h3>';
            html += '<div style="display:flex;flex-direction:column;gap:10px">';
            payload.parts.forEach((part, i) => {
                html += `<div style="padding:10px;background:#f5f5f5;border-radius:4px;border-left:3px solid var(--primary)">
                    <small style="color:#666">Part ${i + 1} (${part.length} chars)</small>
                    <pre style="margin:5px 0 0;white-space:pre-wrap">${escapeHtml(part)}</pre>
                </div>`;
            });
            html += '</div>';
            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };

    updateUI();
});

function updateUI() {
    const type = elements.splitType.value;
    elements.delimiterGroup.classList.toggle('hidden', type !== 'delimiter' && type !== 'regex');
    elements.sizeGroup.classList.toggle('hidden', type !== 'size' && type !== 'words');

    if (type === 'regex') {
        elements.delimiter.placeholder = 'e.g., [.!?]+';
    } else {
        elements.delimiter.placeholder = '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function processText() {
    if (!elements.inputText.value) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'SPLIT',
        payload: {
            text: elements.inputText.value,
            splitType: elements.splitType.value,
            delimiter: elements.delimiter.value,
            size: parseInt(elements.splitSize.value) || 50
        }
    });
}
