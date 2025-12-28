let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.ignoreCase = document.getElementById('ignore-case');
    elements.ignoreSpaces = document.getElementById('ignore-spaces');
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
            const isPalindrome = payload.isPalindrome;
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Result:</span><span class="stat-value" style="color:${isPalindrome ? '#4caf50' : '#f44336'}">${isPalindrome ? 'PALINDROME' : 'NOT PALINDROME'}</span></div>
            `;
            let html = `<div style="text-align:center;font-size:48px;margin:20px 0">${isPalindrome ? '✓' : '✗'}</div>`;
            html += `<div style="text-align:center;margin-bottom:20px">
                <h3>Original</h3>
                <div style="font-size:20px;font-family:monospace;padding:15px;background:#f5f5f5;border-radius:4px">${escapeHtml(payload.original)}</div>
            </div>`;
            html += `<div style="text-align:center;margin-bottom:20px">
                <h3>Normalized</h3>
                <div style="font-size:20px;font-family:monospace;padding:15px;background:#e3f2fd;border-radius:4px">${escapeHtml(payload.normalized)}</div>
            </div>`;
            html += `<div style="text-align:center;margin-bottom:20px">
                <h3>Reversed</h3>
                <div style="font-size:20px;font-family:monospace;padding:15px;background:#e8f5e9;border-radius:4px">${escapeHtml(payload.reversed)}</div>
            </div>`;

            if (!isPalindrome && payload.mismatchPosition >= 0) {
                html += `<p style="color:#f44336">First mismatch at position ${payload.mismatchPosition}: '${payload.normalized[payload.mismatchPosition]}' vs '${payload.reversed[payload.mismatchPosition]}'</p>`;
            }

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
        type: 'CHECK',
        payload: {
            text: elements.inputText.value,
            ignoreCase: elements.ignoreCase.checked,
            ignoreSpaces: elements.ignoreSpaces.checked
        }
    });
}
