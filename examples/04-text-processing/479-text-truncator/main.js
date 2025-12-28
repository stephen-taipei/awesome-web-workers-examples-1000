let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.maxLength = document.getElementById('max-length');
    elements.truncateMode = document.getElementById('truncate-mode');
    elements.ellipsis = document.getElementById('ellipsis');
    elements.position = document.getElementById('position');
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
                <div class="stat-item"><span class="stat-label">Original:</span><span class="stat-value">${payload.originalLength} chars</span></div>
                <div class="stat-item"><span class="stat-label">Result:</span><span class="stat-value">${payload.resultLength} chars</span></div>
                <div class="stat-item"><span class="stat-label">Removed:</span><span class="stat-value">${payload.removed} chars</span></div>
            `;
            let html = `
                <h3>Original</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px;white-space:pre-wrap">${escapeHtml(payload.original)}</pre>
                <h3>Truncated</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px;white-space:pre-wrap">${escapeHtml(payload.result)}</pre>
            `;
            if (!payload.wasTruncated) {
                html += '<p style="color:#4caf50;margin-top:10px">Text was already within the limit - no truncation needed.</p>';
            }
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
        type: 'TRUNCATE',
        payload: {
            text: elements.inputText.value,
            maxLength: parseInt(elements.maxLength.value) || 100,
            mode: elements.truncateMode.value,
            ellipsis: elements.ellipsis.value,
            position: elements.position.value
        }
    });
}
