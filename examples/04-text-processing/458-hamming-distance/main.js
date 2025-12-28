let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText1 = document.getElementById('input-text1');
    elements.inputText2 = document.getElementById('input-text2');
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
        } else if (type === 'ERROR') {
            alert(payload.message);
        } else if (type === 'RESULT') {
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Hamming Distance:</span><span class="stat-value">${payload.distance}</span></div>
                <div class="stat-item"><span class="stat-label">Similarity:</span><span class="stat-value">${(payload.similarity * 100).toFixed(1)}%</span></div>
            `;
            let html = `<div style="text-align:center;font-size:48px;margin:20px 0;color:var(--primary)">${payload.distance}</div>`;

            html += '<h3>Character Comparison</h3>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:4px;font-family:monospace;font-size:18px">';
            for (let i = 0; i < payload.comparison.length; i++) {
                const comp = payload.comparison[i];
                const bg = comp.match ? '#4caf5022' : '#f4433622';
                const border = comp.match ? '#4caf50' : '#f44336';
                html += `<div style="display:flex;flex-direction:column;align-items:center;padding:8px;background:${bg};border:1px solid ${border};border-radius:4px;min-width:40px">
                    <span>${comp.char1}</span>
                    <span style="color:#999;font-size:12px">${comp.match ? '=' : '!='}</span>
                    <span>${comp.char2}</span>
                </div>`;
            }
            html += '</div>';

            html += '<h3 style="margin-top:20px">Difference Positions</h3>';
            if (payload.diffPositions.length > 0) {
                html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
                payload.diffPositions.forEach(pos => {
                    html += `<span style="padding:4px 12px;border-radius:4px;background:#f4433622;border:1px solid #f44336">Position ${pos}</span>`;
                });
                html += '</div>';
            } else {
                html += '<p style="color:#4caf50">Strings are identical</p>';
            }

            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    if (!elements.inputText1.value || !elements.inputText2.value) {
        alert('Please enter both strings');
        return;
    }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'CALCULATE',
        payload: {
            text1: elements.inputText1.value,
            text2: elements.inputText2.value
        }
    });
}
