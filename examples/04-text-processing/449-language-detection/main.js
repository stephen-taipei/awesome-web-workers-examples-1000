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
                <div class="stat-item"><span class="stat-label">Detected:</span><span class="stat-value">${payload.detected.name} (${payload.detected.code})</span></div>
                <div class="stat-item"><span class="stat-label">Confidence:</span><span class="stat-value">${(payload.detected.confidence * 100).toFixed(1)}%</span></div>
            `;
            let html = '<h3>Language Probabilities</h3>';
            html += '<div style="margin-top:15px">';
            payload.scores.forEach(s => {
                const width = s.confidence * 100;
                html += `<div style="margin-bottom:10px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                        <span>${s.name}</span>
                        <span>${(s.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div style="background:#eee;border-radius:4px;height:8px">
                        <div style="width:${width}%;background:var(--primary);border-radius:4px;height:100%"></div>
                    </div>
                </div>`;
            });
            html += '</div>';
            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    if (!elements.inputText.value.trim()) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'DETECT', payload: { text: elements.inputText.value } });
}
