let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText1 = document.getElementById('input-text1');
    elements.inputText2 = document.getElementById('input-text2');
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
                <div class="stat-item"><span class="stat-label">LCS Length:</span><span class="stat-value">${payload.lcs.length}</span></div>
                <div class="stat-item"><span class="stat-label">Position in S1:</span><span class="stat-value">${payload.pos1}</span></div>
                <div class="stat-item"><span class="stat-label">Position in S2:</span><span class="stat-value">${payload.pos2}</span></div>
            `;
            let html = `<div style="text-align:center;margin-bottom:20px">
                <h3>Longest Common Substring</h3>
                <div style="font-size:24px;font-family:monospace;padding:15px;background:#e8f5e9;border-radius:4px;border:2px solid #4caf50">${escapeHtml(payload.lcs) || '(empty)'}</div>
            </div>`;
            html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                <div>
                    <h3>String 1</h3>
                    <div style="font-family:monospace;padding:10px;background:#f5f5f5;border-radius:4px;word-break:break-all">${payload.highlighted1}</div>
                </div>
                <div>
                    <h3>String 2</h3>
                    <div style="font-family:monospace;padding:10px;background:#f5f5f5;border-radius:4px;word-break:break-all">${payload.highlighted2}</div>
                </div>
            </div>`;
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
    if (!elements.inputText1.value || !elements.inputText2.value) {
        alert('Please enter both strings');
        return;
    }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'FIND',
        payload: {
            text1: elements.inputText1.value,
            text2: elements.inputText2.value
        }
    });
}
