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
                <div class="stat-item"><span class="stat-label">Words:</span><span class="stat-value">${payload.tags.length}</span></div>
            `;
            const colors = { NOUN: '#2196f3', VERB: '#f44336', ADJ: '#4caf50', ADV: '#ff9800', DET: '#9c27b0', PREP: '#00bcd4', PRON: '#e91e63', CONJ: '#795548', PUNCT: '#9e9e9e' };
            elements.resultOutput.innerHTML = payload.tags.map(t =>
                `<div style="text-align:center"><div style="padding:8px 12px;border-radius:4px;background:${colors[t.tag] || '#666'}22;border:1px solid ${colors[t.tag] || '#666'}">${t.word}</div><small style="color:${colors[t.tag] || '#666'}">${t.tag}</small></div>`
            ).join('');
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    if (!elements.inputText.value.trim()) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'TAG', payload: { text: elements.inputText.value } });
}
