let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.pattern = document.getElementById('pattern');
    elements.caseSensitive = document.getElementById('case-sensitive');
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
                <div class="stat-item"><span class="stat-label">Matches:</span><span class="stat-value">${payload.matches.length}</span></div>
                <div class="stat-item"><span class="stat-label">Pattern:</span><span class="stat-value">"${escapeHtml(payload.pattern)}"</span></div>
            `;
            let html = '<h3>Highlighted Text</h3>';
            html += `<div style="padding:15px;background:#f5f5f5;border-radius:4px;line-height:1.8">${payload.highlighted}</div>`;

            if (payload.matches.length > 0) {
                html += '<h3>Match Positions</h3>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
                payload.matches.forEach((pos, i) => {
                    html += `<span style="padding:4px 8px;border-radius:4px;background:#e3f2fd;border:1px solid #2196f3">#${i + 1}: position ${pos}</span>`;
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
    if (!elements.inputText.value.trim()) { alert('Please enter text'); return; }
    if (!elements.pattern.value) { alert('Please enter a pattern'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'SEARCH',
        payload: {
            text: elements.inputText.value,
            pattern: elements.pattern.value,
            caseSensitive: elements.caseSensitive.checked
        }
    });
}
