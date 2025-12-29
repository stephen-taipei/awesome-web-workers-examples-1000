let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText1 = document.getElementById('input-text1');
    elements.inputText2 = document.getElementById('input-text2');
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
            const isAnagram = payload.isAnagram;
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Result:</span><span class="stat-value" style="color:${isAnagram ? '#4caf50' : '#f44336'}">${isAnagram ? 'ANAGRAM' : 'NOT ANAGRAM'}</span></div>
            `;
            let html = `<div style="text-align:center;font-size:48px;margin:20px 0">${isAnagram ? '✓' : '✗'}</div>`;
            html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                <div>
                    <h3>String 1</h3>
                    <div style="font-size:24px;font-family:monospace;padding:10px;background:#f5f5f5;border-radius:4px;text-align:center">${escapeHtml(payload.text1)}</div>
                    <div style="margin-top:10px"><strong>Sorted:</strong> ${escapeHtml(payload.sorted1)}</div>
                </div>
                <div>
                    <h3>String 2</h3>
                    <div style="font-size:24px;font-family:monospace;padding:10px;background:#f5f5f5;border-radius:4px;text-align:center">${escapeHtml(payload.text2)}</div>
                    <div style="margin-top:10px"><strong>Sorted:</strong> ${escapeHtml(payload.sorted2)}</div>
                </div>
            </div>`;
            html += '<h3 style="margin-top:20px">Character Frequency</h3>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
            for (const [char, count] of Object.entries(payload.freq1)) {
                const match = payload.freq2[char] === count;
                html += `<span style="padding:4px 8px;border-radius:4px;background:${match ? '#4caf5022' : '#f4433622'};border:1px solid ${match ? '#4caf50' : '#f44336'}">${char}: ${count}</span>`;
            }
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
    if (!elements.inputText1.value || !elements.inputText2.value) {
        alert('Please enter both strings');
        return;
    }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'CHECK',
        payload: {
            text1: elements.inputText1.value,
            text2: elements.inputText2.value,
            ignoreSpaces: elements.ignoreSpaces.checked
        }
    });
}
