let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.string1 = document.getElementById('string1');
    elements.string2 = document.getElementById('string2');
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
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Edit Distance:</span><span class="stat-value">${payload.stats.distance}</span></div>
                <div class="stat-item"><span class="stat-label">Similarity:</span><span class="stat-value">${payload.stats.similarity}%</span></div>
            `;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'COMPARE', payload: { s1: elements.string1.value, s2: elements.string2.value } });
}
