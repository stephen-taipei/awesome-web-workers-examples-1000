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
                <div class="stat-item"><span class="stat-label">Key:</span><span class="stat-value">${payload.key}</span></div>
                <div class="stat-item"><span class="stat-label">Mode:</span><span class="stat-value">${payload.mode}</span></div>
            `;
            let html = `
                <h3>Original</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px">${escapeHtml(payload.original)}</pre>
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px">${escapeHtml(payload.result)}</pre>
            `;
            html += '<h3>Step-by-Step</h3>';
            html += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-family:monospace;width:100%">';
            html += '<tr><th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Plain</th>';
            html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Key</th>';
            html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Cipher</th></tr>';
            payload.steps.forEach(step => {
                html += `<tr>
                    <td style="padding:8px;border:1px solid #ddd;text-align:center">${step.plain}</td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:center;color:var(--primary)">${step.key}</td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold">${step.cipher}</td>
                </tr>`;
            });
            html += '</table></div>';
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
    const key = elements.inputKey.value.replace(/[^a-zA-Z]/g, '');
    if (!key) { alert('Please enter a valid key (letters only)'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'PROCESS',
        payload: {
            text: elements.inputText.value,
            key: key.toUpperCase(),
            mode: elements.modeSelect.value
        }
    });
}
