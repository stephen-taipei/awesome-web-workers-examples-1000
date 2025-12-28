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
            const sentimentColor = payload.sentiment === 'positive' ? '#4caf50' :
                                   payload.sentiment === 'negative' ? '#f44336' : '#ff9800';
            elements.resultStats.innerHTML = `
                <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${payload.duration.toFixed(2)} ms</span></div>
                <div class="stat-item"><span class="stat-label">Score:</span><span class="stat-value">${payload.score.toFixed(2)}</span></div>
                <div class="stat-item"><span class="stat-label">Sentiment:</span><span class="stat-value" style="color:${sentimentColor}">${payload.sentiment.toUpperCase()}</span></div>
            `;
            let html = `<div style="margin-bottom:20px">
                <div style="background:#eee;border-radius:10px;height:20px;position:relative;overflow:hidden">
                    <div style="position:absolute;left:0;top:0;height:100%;width:${payload.positivePercent}%;background:#4caf50"></div>
                    <div style="position:absolute;right:0;top:0;height:100%;width:${payload.negativePercent}%;background:#f44336"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:5px">
                    <span style="color:#4caf50">Positive: ${payload.positivePercent.toFixed(0)}%</span>
                    <span style="color:#9e9e9e">Neutral</span>
                    <span style="color:#f44336">Negative: ${payload.negativePercent.toFixed(0)}%</span>
                </div>
            </div>`;
            html += '<h3>Word Analysis</h3><div style="display:flex;flex-wrap:wrap;gap:8px">';
            payload.words.forEach(w => {
                const color = w.score > 0 ? '#4caf50' : w.score < 0 ? '#f44336' : '#9e9e9e';
                html += `<span style="padding:4px 8px;border-radius:4px;background:${color}22;border:1px solid ${color}">${w.word} (${w.score > 0 ? '+' : ''}${w.score})</span>`;
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
    worker.postMessage({ type: 'ANALYZE', payload: { text: elements.inputText.value } });
}
