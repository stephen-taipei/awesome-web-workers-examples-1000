let worker = null;
const elements = {};
let debounceTimer;

document.addEventListener('DOMContentLoaded', function() {
    elements.searchInput = document.getElementById('search-input');
    elements.wordList = document.getElementById('word-list');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultOutput = document.getElementById('result-output');

    elements.searchInput.addEventListener('input', debounceSearch);

    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            elements.progressBar.style.width = payload.percent + '%';
            elements.progressBar.textContent = payload.percent + '%';
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            if (payload.suggestions.length > 0) {
                elements.resultOutput.innerHTML = payload.suggestions.map(s =>
                    `<div class="stat-item" style="cursor:pointer" onclick="document.getElementById('search-input').value='${s}'">${s}</div>`
                ).join('');
                elements.resultSection.classList.remove('hidden');
            } else {
                elements.resultSection.classList.add('hidden');
            }
        }
    };
});

function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const query = elements.searchInput.value;
        const words = elements.wordList.value;
        if (query.length > 0) {
            worker.postMessage({ type: 'SEARCH', payload: { query, words } });
        } else {
            elements.resultSection.classList.add('hidden');
        }
    }, 150);
}
