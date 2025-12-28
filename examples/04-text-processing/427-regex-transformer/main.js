let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.pattern = document.getElementById('pattern');
    elements.replacement = document.getElementById('replacement');
    elements.flags = document.getElementById('flags');
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
                <div class="stat-item"><span class="stat-label">Replacements:</span><span class="stat-value">${payload.stats.count}</span></div>
            `;
            elements.resultOutput.value = payload.result;
            elements.resultSection.classList.remove('hidden');
        } else if (type === 'ERROR') {
            alert('Error: ' + payload.message);
        }
    };
});

function processText() {
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'TRANSFORM',
        payload: {
            text: elements.inputText.value,
            pattern: elements.pattern.value,
            replacement: elements.replacement.value,
            flags: elements.flags.value
        }
    });
}
