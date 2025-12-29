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
                <div class="stat-item"><span class="stat-label">Entities:</span><span class="stat-value">${payload.entities.length}</span></div>
            `;
            const colors = { PERSON: '#e91e63', ORG: '#2196f3', LOC: '#4caf50', DATE: '#ff9800', MONEY: '#9c27b0' };
            let html = '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px">';
            payload.entities.forEach(e => {
                html += `<div style="padding:8px 12px;border-radius:4px;background:${colors[e.type] || '#666'}22;border:1px solid ${colors[e.type] || '#666'}">
                    <strong>${e.text}</strong><br><small style="color:${colors[e.type] || '#666'}">${e.type}</small>
                </div>`;
            });
            html += '</div>';
            html += '<h3>Highlighted Text</h3><p style="line-height:1.8">' + payload.highlighted + '</p>';
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
