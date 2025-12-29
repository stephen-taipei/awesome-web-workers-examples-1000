/**
 * Syntax Highlighter - Main Thread Script
 */
let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.language = document.getElementById('language');
    elements.processBtn = document.getElementById('process-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');

    elements.processBtn.addEventListener('click', processText);
    elements.clearBtn.addEventListener('click', () => {
        elements.inputText.value = '';
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
                <div class="stat-item"><span class="stat-label">Tokens:</span><span class="stat-value">${payload.stats.tokenCount}</span></div>
            `;
            elements.resultOutput.innerHTML = payload.result;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    const text = elements.inputText.value;
    if (!text.trim()) { alert('Please enter code'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'HIGHLIGHT', payload: { text, language: elements.language.value } });
}
