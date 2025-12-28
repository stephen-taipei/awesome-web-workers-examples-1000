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
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px">${escapeHtml(payload.original)}</pre>
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px;font-size:${payload.mode === 'encode' ? '16px' : '14px'}">${escapeHtml(payload.result)}</pre>
            `;
            if (payload.mode === 'encode' && payload.breakdown.length > 0) {
                html += '<h3>Breakdown</h3>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:10px">';
                payload.breakdown.forEach(b => {
                    html += `<div style="text-align:center;padding:10px;background:#f5f5f5;border-radius:4px;min-width:60px">
                        <div style="font-size:20px;font-weight:bold">${b.char}</div>
                        <div style="font-family:monospace;color:var(--primary)">${b.morse}</div>
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
