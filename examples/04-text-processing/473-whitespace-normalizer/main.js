let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.trimLines = document.getElementById('trim-lines');
    elements.collapseSpaces = document.getElementById('collapse-spaces');
    elements.collapseLines = document.getElementById('collapse-lines');
    elements.tabsToSpaces = document.getElementById('tabs-to-spaces');
    elements.removeTrailing = document.getElementById('remove-trailing');
    elements.processBtn = document.getElementById('process-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');

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
                <div class="stat-item"><span class="stat-label">Original Size:</span><span class="stat-value">${payload.originalSize} chars</span></div>
                <div class="stat-item"><span class="stat-label">New Size:</span><span class="stat-value">${payload.newSize} chars</span></div>
                <div class="stat-item"><span class="stat-label">Saved:</span><span class="stat-value">${payload.saved} chars (${payload.percent}%)</span></div>
            `;
            let html = `
                <h3>Original (whitespace visible)</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px;white-space:pre">${visualizeWhitespace(payload.original)}</pre>
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px;white-space:pre">${visualizeWhitespace(payload.result)}</pre>
            `;
            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function visualizeWhitespace(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\t/g, '<span style="background:#ffeb3b;color:#666">&#8677;</span>')
        .replace(/ {2,}/g, match => `<span style="background:#e1bee7">${'&middot;'.repeat(match.length)}</span>`);
}

function processText() {
    if (!elements.inputText.value) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'NORMALIZE',
        payload: {
            text: elements.inputText.value,
            options: {
                trimLines: elements.trimLines.checked,
                collapseSpaces: elements.collapseSpaces.checked,
                collapseLines: elements.collapseLines.checked,
                tabsToSpaces: elements.tabsToSpaces.checked,
                removeTrailing: elements.removeTrailing.checked
            }
        }
    });
}
