let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.processBtn = document.getElementById('process-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');

    elements.processBtn.addEventListener('click', processText);

    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            elements.progressBar.style.width = payload.percent + '%';
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            const s = payload.stats;
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Flesch Reading Ease:</span><span class="stat-value">${s.fleschEase} (${s.easeLevel})</span></div>
                <div class="stat-item"><span class="stat-label">Flesch-Kincaid Grade:</span><span class="stat-value">${s.fleschGrade}</span></div>
                <div class="stat-item"><span class="stat-label">Words:</span><span class="stat-value">${s.words}</span></div>
                <div class="stat-item"><span class="stat-label">Sentences:</span><span class="stat-value">${s.sentences}</span></div>
                <div class="stat-item"><span class="stat-label">Syllables:</span><span class="stat-value">${s.syllables}</span></div>
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
            `;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    if (!elements.inputText.value.trim()) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'ANALYZE', payload: { text: elements.inputText.value } });
}
