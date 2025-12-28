let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.replacements = document.getElementById('replacements');
    elements.caseSensitive = document.getElementById('case-sensitive');
    elements.useRegex = document.getElementById('use-regex');
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
                <div class="stat-item"><span class="stat-label">Replacements:</span><span class="stat-value">${payload.totalReplacements}</span></div>
            `;
            let html = `
                <h3>Original</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px">${escapeHtml(payload.original)}</pre>
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px">${escapeHtml(payload.result)}</pre>
            `;
            html += '<h3>Replacement Summary</h3>';
            html += '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%">';
            html += '<tr><th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Find</th>';
            html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Replace</th>';
            html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Count</th></tr>';
            payload.summary.forEach(s => {
                html += `<tr>
                    <td style="padding:8px;border:1px solid #ddd">${escapeHtml(s.find)}</td>
                    <td style="padding:8px;border:1px solid #ddd">${escapeHtml(s.replace)}</td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:center">${s.count}</td>
                </tr>`;
            });
            html += '</table></div>';
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
    if (!elements.replacements.value.trim()) { alert('Please enter replacements'); return; }
    elements.resultSection.classList.add('hidden');
    worker.postMessage({
        type: 'REPLACE',
        payload: {
            text: elements.inputText.value,
            replacements: elements.replacements.value,
            caseSensitive: elements.caseSensitive.checked,
            useRegex: elements.useRegex.checked
        }
    });
}
