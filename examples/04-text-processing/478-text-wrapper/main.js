let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.lineWidth = document.getElementById('line-width');
    elements.wrapMode = document.getElementById('wrap-mode');
    elements.preserveParagraphs = document.getElementById('preserve-paragraphs');
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
                <div class="stat-item"><span class="stat-label">Lines:</span><span class="stat-value">${payload.lineCount}</span></div>
                <div class="stat-item"><span class="stat-label">Max Width:</span><span class="stat-value">${payload.maxLineWidth} chars</span></div>
            `;
            let html = `
                <h3>Result (width: ${payload.width})</h3>
                <div style="position:relative">
                    <div style="position:absolute;left:${payload.width}ch;top:0;bottom:0;width:1px;background:#f44336;opacity:0.5"></div>
                    <pre style="background:#f5f5f5;padding:15px;border-radius:4px;font-family:monospace;overflow-x:auto">${escapeHtml(payload.result)}</pre>
                </div>
            `;
            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function processText() {
    if (!elements.inputText.value) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'WRAP',
        payload: {
            text: elements.inputText.value,
            width: parseInt(elements.lineWidth.value) || 40,
            mode: elements.wrapMode.value,
            preserveParagraphs: elements.preserveParagraphs.checked
        }
    });
}
