let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.delimiter = document.getElementById('delimiter');
    elements.columns = document.getElementById('columns');
    elements.hasHeader = document.getElementById('has-header');
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
                <div class="stat-item"><span class="stat-label">Rows:</span><span class="stat-value">${payload.rowCount}</span></div>
                <div class="stat-item"><span class="stat-label">Columns Extracted:</span><span class="stat-value">${payload.columnCount}</span></div>
            `;
            let html = `
                <h3>Extracted Text</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px">${escapeHtml(payload.result)}</pre>
            `;
            html += '<h3>Table View</h3>';
            html += '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%">';
            if (payload.headers.length > 0) {
                html += '<tr>';
                payload.headers.forEach(h => {
                    html += `<th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">${escapeHtml(h)}</th>`;
                });
                html += '</tr>';
            }
            payload.rows.slice(0, 20).forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                    html += `<td style="padding:8px;border:1px solid #ddd">${escapeHtml(cell)}</td>`;
                });
                html += '</tr>';
            });
            html += '</table></div>';
            if (payload.rows.length > 20) {
                html += `<p style="color:#666;margin-top:10px">Showing first 20 of ${payload.rows.length} rows</p>`;
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
        type: 'EXTRACT',
        payload: {
            text: elements.inputText.value,
            delimiter: elements.delimiter.value,
            columns: elements.columns.value,
            hasHeader: elements.hasHeader.checked
        }
    });
}
