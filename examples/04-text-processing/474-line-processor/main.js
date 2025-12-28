let worker = null;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    elements.inputText = document.getElementById('input-text');
    elements.addNumbers = document.getElementById('add-numbers');
    elements.sortLines = document.getElementById('sort-lines');
    elements.reverseSort = document.getElementById('reverse-sort');
    elements.removeDuplicates = document.getElementById('remove-duplicates');
    elements.removeEmpty = document.getElementById('remove-empty');
    elements.trimLines = document.getElementById('trim-lines');
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
                <div class="stat-item"><span class="stat-label">Original Lines:</span><span class="stat-value">${payload.originalLines}</span></div>
                <div class="stat-item"><span class="stat-label">Result Lines:</span><span class="stat-value">${payload.resultLines}</span></div>
                <div class="stat-item"><span class="stat-label">Removed:</span><span class="stat-value">${payload.removed}</span></div>
            `;
            let html = `
                <h3>Result</h3>
                <pre style="background:#e3f2fd;padding:15px;border-radius:4px">${escapeHtml(payload.result)}</pre>
            `;
            if (payload.duplicates.length > 0) {
                html += '<h3>Duplicates Found</h3>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
                payload.duplicates.forEach(d => {
                    html += `<span style="padding:4px 8px;border-radius:4px;background:#ff980022;border:1px solid #ff9800">${escapeHtml(d.value)} (x${d.count})</span>`;
                });
                html += '</div>';
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
            options: {
                addNumbers: elements.addNumbers.checked,
                sortLines: elements.sortLines.checked,
                reverseSort: elements.reverseSort.checked,
                removeDuplicates: elements.removeDuplicates.checked,
                removeEmpty: elements.removeEmpty.checked,
                trimLines: elements.trimLines.checked
            }
        }
    });
}
