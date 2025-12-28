let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.query = document.getElementById('query');
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
            elements.progressBar.textContent = payload.percent + '%';
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Matches:</span><span class="stat-value">${payload.stats.count}</span></div>
            `;
            elements.resultOutput.innerHTML = payload.results.map(r =>
                `<div class="stat-item"><span class="stat-label">${r.word}</span><span class="stat-value">Score: ${r.score.toFixed(2)}</span></div>`
            ).join('');
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    if (!elements.query.value) { alert('Please enter a query'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'SEARCH', payload: { text: elements.inputText.value, query: elements.query.value } });
}
