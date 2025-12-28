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
            elements.progressBar.textContent = payload.percent + '%';
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            const s = payload.stats;
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Characters (total):</span><span class="stat-value">${s.charCount}</span></div>
                <div class="stat-item"><span class="stat-label">Characters (no spaces):</span><span class="stat-value">${s.charCountNoSpaces}</span></div>
                <div class="stat-item"><span class="stat-label">Words:</span><span class="stat-value">${s.wordCount}</span></div>
                <div class="stat-item"><span class="stat-label">Sentences:</span><span class="stat-value">${s.sentenceCount}</span></div>
                <div class="stat-item"><span class="stat-label">Paragraphs:</span><span class="stat-value">${s.paragraphCount}</span></div>
                <div class="stat-item"><span class="stat-label">Avg Word Length:</span><span class="stat-value">${s.avgWordLength}</span></div>
                <div class="stat-item"><span class="stat-label">Avg Sentence Length:</span><span class="stat-value">${s.avgSentenceLength} words</span></div>
                <div class="stat-item"><span class="stat-label">Longest Word:</span><span class="stat-value">${s.longestWord}</span></div>
                <div class="stat-item"><span class="stat-label">Processing Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
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
