let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.rotationAmount = document.getElementById('rotation-amount');
    elements.directionSelect = document.getElementById('direction-select');
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
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Direction:</span><span class="stat-value">${payload.direction}</span></div>
                <div class="stat-item"><span class="stat-label">Amount:</span><span class="stat-value">${payload.amount}</span></div>
            `;
            let html = `
                <div style="font-family:monospace;font-size:18px;margin-bottom:20px">
                    <div style="margin-bottom:10px"><strong>Original:</strong> <span style="letter-spacing:2px">${escapeHtml(payload.original)}</span></div>
                    <div><strong>Rotated:</strong> <span style="letter-spacing:2px;color:var(--primary)">${escapeHtml(payload.result)}</span></div>
                </div>
            `;
            html += '<h3>Rotation Steps</h3><div style="font-family:monospace">';
            payload.steps.forEach((step, i) => {
                html += `<div style="padding:5px 0;${i === payload.steps.length - 1 ? 'font-weight:bold;color:var(--primary)' : ''}">${i}: ${escapeHtml(step)}</div>`;
            });
            html += '</div>';
            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function processText() {
    if (!elements.inputText.value) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'ROTATE',
        payload: {
            text: elements.inputText.value,
            amount: parseInt(elements.rotationAmount.value) || 0,
            direction: elements.directionSelect.value
        }
    });
}
