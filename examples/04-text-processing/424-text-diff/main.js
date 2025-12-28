/**
 * Text Diff - Main Thread Script
 */
let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.text1 = document.getElementById('text1');
    elements.text2 = document.getElementById('text2');
    elements.processBtn = document.getElementById('process-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');

    elements.processBtn.addEventListener('click', processText);
    elements.clearBtn.addEventListener('click', () => {
        elements.text1.value = '';
        elements.text2.value = '';
        elements.resultSection.classList.add('hidden');
    });

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
                <div class="stat-item"><span class="stat-label">Added:</span><span class="stat-value" style="color:#4caf50">${payload.stats.added}</span></div>
                <div class="stat-item"><span class="stat-label">Removed:</span><span class="stat-value" style="color:#f44336">${payload.stats.removed}</span></div>
                <div class="stat-item"><span class="stat-label">Unchanged:</span><span class="stat-value">${payload.stats.unchanged}</span></div>
            `;
            elements.resultOutput.innerHTML = payload.result;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    const text1 = elements.text1.value;
    const text2 = elements.text2.value;
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'DIFF', payload: { text1, text2 } });
}
