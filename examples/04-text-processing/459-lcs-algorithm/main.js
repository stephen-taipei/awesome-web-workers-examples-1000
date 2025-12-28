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
        } else if (type === 'RESULT') {
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">LCS Length:</span><span class="stat-value">${payload.lcs.length}</span></div>
            `;
            let html = `<div style="text-align:center;margin-bottom:20px">
                <h3>Longest Common Subsequence</h3>
                <div style="font-size:24px;font-family:monospace;padding:15px;background:#e8f5e9;border-radius:4px;letter-spacing:4px;border:2px solid #4caf50">${payload.lcs || '(empty)'}</div>
            </div>`;

            html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
                <div>
                    <h3>String 1</h3>
                    <div style="font-family:monospace;font-size:20px;letter-spacing:2px">${payload.highlighted1}</div>
                </div>
                <div>
                    <h3>String 2</h3>
                    <div style="font-family:monospace;font-size:20px;letter-spacing:2px">${payload.highlighted2}</div>
                </div>
            </div>`;

            // Show DP matrix for small strings
            if (payload.matrix && payload.text1.length <= 10 && payload.text2.length <= 10) {
                html += '<h3>DP Matrix</h3>';
                html += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-family:monospace">';
                html += '<tr><th style="padding:8px;border:1px solid #ddd"></th><th style="padding:8px;border:1px solid #ddd"></th>';
                for (const c of payload.text2) {
                    html += `<th style="padding:8px;border:1px solid #ddd">${c}</th>`;
                }
                html += '</tr>';
                for (let i = 0; i < payload.matrix.length; i++) {
                    html += '<tr>';
                    html += `<th style="padding:8px;border:1px solid #ddd">${i === 0 ? '' : payload.text1[i - 1]}</th>`;
                    for (let j = 0; j < payload.matrix[i].length; j++) {
                        const isPath = payload.path.some(p => p[0] === i && p[1] === j);
                        const bg = isPath ? '#e8f5e9' : 'white';
                        html += `<td style="padding:8px;border:1px solid #ddd;text-align:center;background:${bg}">${payload.matrix[i][j]}</td>`;
                    }
                    html += '</tr>';
                }
                html += '</table></div>';
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
        type: 'FIND',
        payload: {
            text1: elements.inputText1.value,
            text2: elements.inputText2.value
        }
    });
}
