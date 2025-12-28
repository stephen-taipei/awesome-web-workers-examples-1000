let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
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
            const colors = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4'];
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Top Category:</span><span class="stat-value">${payload.categories[0].name}</span></div>
                <div class="stat-item"><span class="stat-label">Confidence:</span><span class="stat-value">${(payload.categories[0].confidence * 100).toFixed(1)}%</span></div>
            `;
            let html = '<h3>Category Scores</h3><div style="margin-top:15px">';
            payload.categories.forEach((cat, i) => {
                const width = cat.confidence * 100;
                const color = colors[i % colors.length];
                html += `<div style="margin-bottom:15px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                        <span><strong>${cat.name}</strong></span>
                        <span>${(cat.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div style="background:#eee;border-radius:4px;height:12px">
                        <div style="width:${width}%;background:${color};border-radius:4px;height:100%"></div>
                    </div>
                    <small style="color:#666">Keywords: ${cat.matchedKeywords.join(', ') || 'none'}</small>
                </div>`;
            });
            html += '</div>';
            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    if (!elements.inputText.value.trim()) { alert('Please enter text'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'CLASSIFY', payload: { text: elements.inputText.value } });
}
