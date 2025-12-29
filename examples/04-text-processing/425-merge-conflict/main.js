/**
 * Merge Conflict - Main Thread Script
 */
let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.base = document.getElementById('base');
    elements.versionA = document.getElementById('versionA');
    elements.versionB = document.getElementById('versionB');
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
                <div class="stat-item"><span class="stat-label">Conflicts:</span><span class="stat-value" style="color:${payload.stats.conflicts > 0 ? '#f44336' : '#4caf50'}">${payload.stats.conflicts}</span></div>
            `;
            elements.resultOutput.innerHTML = payload.result;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'MERGE',
        payload: {
            base: elements.base.value,
            versionA: elements.versionA.value,
            versionB: elements.versionB.value
        }
    });
}
