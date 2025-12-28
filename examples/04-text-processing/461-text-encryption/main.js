let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.inputKey = document.getElementById('input-key');
    elements.modeSelect = document.getElementById('mode-select');
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
                <div class="stat-item"><span class="stat-label">Mode:</span><span class="stat-value">${payload.mode}</span></div>
                <div class="stat-item"><span class="stat-label">Key Length:</span><span class="stat-value">${payload.keyLength}</span></div>
            `;
            let html = `
                <h3>Original</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px;overflow-x:auto;word-wrap:break-word;white-space:pre-wrap">${escapeHtml(payload.original)}</pre>
                <h3>Result (${payload.mode === 'encrypt' ? 'Encrypted' : 'Decrypted'})</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px;overflow-x:auto;word-wrap:break-word;white-space:pre-wrap">${escapeHtml(payload.result)}</pre>
            `;
            if (payload.mode === 'encrypt') {
                html += `<h3>Hex Output</h3>
                <pre style="background:#e8f5e9;padding:15px;border-radius:4px;overflow-x:auto;word-wrap:break-word;white-space:pre-wrap;font-size:12px">${payload.hex}</pre>`;
            }
            html += `<p style="margin-top:15px;color:#666"><small>Note: XOR encryption is symmetric - use the same key to decrypt</small></p>`;
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
    if (!elements.inputKey.value) { alert('Please enter a key'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'PROCESS',
        payload: {
            text: elements.inputText.value,
            key: elements.inputKey.value,
            mode: elements.modeSelect.value
        }
    });
}
