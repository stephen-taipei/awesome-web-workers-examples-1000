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
            elements.progressBar.textContent = payload.percent + '%';
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Output Length:</span><span class="stat-value">${payload.stats.length} chars</span></div>
            `;
            elements.resultOutput.value = payload.result;
            elements.resultSection.classList.remove('hidden');
        } else if (type === 'ERROR') {
            alert('Error: ' + payload.message);
        }
    };
});

function processText() {
    if (!elements.inputText.value.trim()) { alert('Please enter compressed data'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'DECOMPRESS', payload: { data: elements.inputText.value } });
}
