let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.template = document.getElementById('template');
    elements.data = document.getElementById('data');
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
            elements.resultStats.innerHTML = `<div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>`;
            elements.resultOutput.textContent = payload.result;
            elements.resultSection.classList.remove('hidden');
        } else if (type === 'ERROR') {
            alert('Error: ' + payload.message);
        }
    };
});

function processText() {
    try {
        JSON.parse(elements.data.value);
    } catch (e) {
        alert('Invalid JSON data');
        return;
    }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'RENDER', payload: { template: elements.template.value, data: elements.data.value } });
}
