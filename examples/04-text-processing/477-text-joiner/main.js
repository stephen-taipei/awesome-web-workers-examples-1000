let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.joinType = document.getElementById('join-type');
    elements.customGroup = document.getElementById('custom-group');
    elements.customDelimiter = document.getElementById('custom-delimiter');
    elements.formatType = document.getElementById('format-type');
    elements.processBtn = document.getElementById('process-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');

    elements.joinType.addEventListener('change', updateUI);
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
                <div class="stat-item"><span class="stat-label">Items:</span><span class="stat-value">${payload.itemCount}</span></div>
                <div class="stat-item"><span class="stat-label">Result Length:</span><span class="stat-value">${payload.result.length} chars</span></div>
            `;
            let html = `
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px;word-wrap:break-word;white-space:pre-wrap">${escapeHtml(payload.result)}</pre>
                <button onclick="copyToClipboard()" style="margin-top:10px;padding:8px 16px;background:var(--primary);color:white;border:none;border-radius:4px;cursor:pointer">Copy to Clipboard</button>
            `;
            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');

            window.copyToClipboard = function() {
                navigator.clipboard.writeText(payload.result).then(() => {
                    alert('Copied to clipboard!');
                });
            };
        }
    };

    updateUI();
});

function updateUI() {
    elements.customGroup.classList.toggle('hidden', elements.joinType.value !== 'custom');
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
        type: 'JOIN',
        payload: {
            text: elements.inputText.value,
            joinType: elements.joinType.value,
            customDelimiter: elements.customDelimiter.value,
            formatType: elements.formatType.value
        }
    });
}
