let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.modeSelect = document.getElementById('mode-select');
    elements.formatSelect = document.getElementById('format-select');
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
                <div class="stat-item"><span class="stat-label">Mode:</span><span class="stat-value">${payload.mode}</span></div>
                <div class="stat-item"><span class="stat-label">Format:</span><span class="stat-value">${payload.format}</span></div>
            `;
            let html = `
                <h3>Original</h3>
                <pre style="background:#f5f5f5;padding:15px;border-radius:4px;word-wrap:break-word;white-space:pre-wrap">${escapeHtml(payload.original)}</pre>
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px;word-wrap:break-word;white-space:pre-wrap">${escapeHtml(payload.result)}</pre>
            `;
            if (payload.table && payload.table.length > 0) {
                html += '<h3>ASCII Table</h3>';
                html += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-family:monospace;width:100%">';
                html += '<tr><th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Char</th>';
                html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Dec</th>';
                html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Hex</th>';
                html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Oct</th>';
                html += '<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Binary</th></tr>';
                payload.table.forEach(row => {
                    html += `<tr>
                        <td style="padding:8px;border:1px solid #ddd;text-align:center">${escapeHtml(row.char)}</td>
                        <td style="padding:8px;border:1px solid #ddd;text-align:center">${row.dec}</td>
                        <td style="padding:8px;border:1px solid #ddd;text-align:center">${row.hex}</td>
                        <td style="padding:8px;border:1px solid #ddd;text-align:center">${row.oct}</td>
                        <td style="padding:8px;border:1px solid #ddd;text-align:center">${row.bin}</td>
                    </tr>`;
                });
                html += '</table></div>';
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
        type: 'PROCESS',
        payload: {
            text: elements.inputText.value,
            mode: elements.modeSelect.value,
            format: elements.formatSelect.value
        }
    });
}
