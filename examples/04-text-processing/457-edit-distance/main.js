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
                <div class="stat-item"><span class="stat-label">Edit Distance:</span><span class="stat-value">${payload.distance}</span></div>
                <div class="stat-item"><span class="stat-label">Similarity:</span><span class="stat-value">${(payload.similarity * 100).toFixed(1)}%</span></div>
            `;
            let html = `<div style="text-align:center;font-size:48px;margin:20px 0;color:var(--primary)">${payload.distance}</div>`;
            html += '<h3>Edit Operations</h3><div style="font-family:monospace">';
            payload.operations.forEach((op, i) => {
                const color = op.type === 'insert' ? '#4caf50' : op.type === 'delete' ? '#f44336' : op.type === 'replace' ? '#ff9800' : '#9e9e9e';
                html += `<div style="padding:8px;margin-bottom:4px;background:${color}22;border-left:3px solid ${color}">
                    ${i + 1}. <strong>${op.type.toUpperCase()}</strong>: ${op.description}
                </div>`;
            });
            if (payload.operations.length === 0) {
                html += '<div style="color:#4caf50">Strings are identical - no operations needed</div>';
            }
            html += '</div>';

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
                        const bg = payload.path.some(p => p[0] === i && p[1] === j) ? '#e3f2fd' : 'white';
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
    if (elements.inputText1.value === '' && elements.inputText2.value === '') {
        alert('Please enter at least one string');
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
