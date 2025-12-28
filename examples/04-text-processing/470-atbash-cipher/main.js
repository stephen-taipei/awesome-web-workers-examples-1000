let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
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
                <div class="stat-item"><span class="stat-label">Characters:</span><span class="stat-value">${payload.original.length}</span></div>
            `;
            let html = `
                <h3>Original</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px">${escapeHtml(payload.original)}</pre>
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px">${escapeHtml(payload.result)}</pre>
            `;
            html += '<h3>Atbash Alphabet Mapping</h3>';
            html += '<p style="color:#666;margin-bottom:10px">A becomes Z, B becomes Y, etc.</p>';
            html += '<div style="font-family:monospace;overflow-x:auto">';
            html += '<div style="display:flex;gap:2px">';
            for (let i = 0; i < 26; i++) {
                html += `<div style="width:24px;text-align:center;padding:4px;background:#f5f5f5;border-radius:2px">${String.fromCharCode(65 + i)}</div>`;
            }
            html += '</div>';
            html += '<div style="display:flex;gap:2px;margin-top:2px">';
            for (let i = 0; i < 26; i++) {
                html += `<div style="width:24px;text-align:center;padding:4px;background:#e3f2fd;border-radius:2px">${String.fromCharCode(90 - i)}</div>`;
            }
            html += '</div></div>';
            html += `<p style="color:#666;margin-top:15px"><small>Note: Atbash is symmetric - applying it twice returns the original text.</small></p>`;
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
        payload: { text: elements.inputText.value }
    });
}
