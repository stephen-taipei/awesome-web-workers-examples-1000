let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText1 = document.getElementById('input-text1');
    elements.inputText2 = document.getElementById('input-text2');
    elements.matchScore = document.getElementById('match-score');
    elements.mismatchScore = document.getElementById('mismatch-score');
    elements.gapScore = document.getElementById('gap-score');
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
                <div class="stat-item"><span class="stat-label">Alignment Score:</span><span class="stat-value">${payload.score}</span></div>
                <div class="stat-item"><span class="stat-label">Identity:</span><span class="stat-value">${(payload.identity * 100).toFixed(1)}%</span></div>
            `;

            let html = '<h3>Alignment</h3>';
            html += '<div style="font-family:monospace;font-size:16px;background:#f5f5f5;padding:20px;border-radius:4px;overflow-x:auto">';
            html += `<div style="margin-bottom:5px">${payload.alignedHtml1}</div>`;
            html += `<div style="margin-bottom:5px">${payload.matchLine}</div>`;
            html += `<div>${payload.alignedHtml2}</div>`;
            html += '</div>';

            html += '<h3 style="margin-top:20px">Statistics</h3>';
            html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
                <div style="text-align:center;padding:15px;background:#4caf5022;border-radius:4px">
                    <div style="font-size:24px;font-weight:bold">${payload.matches}</div>
                    <div>Matches</div>
                </div>
                <div style="text-align:center;padding:15px;background:#f4433622;border-radius:4px">
                    <div style="font-size:24px;font-weight:bold">${payload.mismatches}</div>
                    <div>Mismatches</div>
                </div>
                <div style="text-align:center;padding:15px;background:#ff980022;border-radius:4px">
                    <div style="font-size:24px;font-weight:bold">${payload.gaps}</div>
                    <div>Gaps</div>
                </div>
                <div style="text-align:center;padding:15px;background:#2196f322;border-radius:4px">
                    <div style="font-size:24px;font-weight:bold">${payload.aligned1.length}</div>
                    <div>Length</div>
                </div>
            </div>`;

            elements.resultOutput.innerHTML = html;
            elements.resultSection.classList.remove('hidden');
        }
    };
});

function processText() {
    if (!elements.inputText1.value || !elements.inputText2.value) {
        alert('Please enter both sequences');
        return;
    }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'ALIGN',
        payload: {
            text1: elements.inputText1.value.toUpperCase(),
            text2: elements.inputText2.value.toUpperCase(),
            matchScore: parseInt(elements.matchScore.value) || 1,
            mismatchScore: parseInt(elements.mismatchScore.value) || -1,
            gapScore: parseInt(elements.gapScore.value) || -2
        }
    });
}
