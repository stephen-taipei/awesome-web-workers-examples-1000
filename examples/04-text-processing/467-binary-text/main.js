let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
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
            `;
            let html = `
                <h3>Original</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px;word-wrap:break-word;white-space:pre-wrap">${escapeHtml(payload.original)}</pre>
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px;word-wrap:break-word;white-space:pre-wrap;font-family:monospace">${escapeHtml(payload.result)}</pre>
            `;
            if (payload.mode === 'encode' && payload.breakdown.length > 0) {
                html += '<h3>Character Breakdown</h3>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
                payload.breakdown.forEach(b => {
                    html += `<div style="text-align:center;padding:8px;background:#f5f5f5;border-radius:4px">
                        <div style="font-size:18px;font-weight:bold">${escapeHtml(b.char)}</div>
                        <div style="font-size:10px;color:#666">ASCII: ${b.ascii}</div>
                        <div style="font-family:monospace;font-size:11px;color:var(--primary)">${b.binary}</div>
                    </div>`;
                });
                html += '</div>';
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
        type: 'PROCESS',
        payload: {
            text: elements.inputText.value,
            mode: elements.modeSelect.value
        }
    });
}
