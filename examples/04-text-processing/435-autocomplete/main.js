const dictionaryInput = document.getElementById('dictionaryInput');
const buildBtn = document.getElementById('buildBtn');
const buildStatus = document.getElementById('buildStatus');
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const searchTime = document.getElementById('searchTime');

let worker;

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'built') {
            buildStatus.textContent = `Index built with ${data.count} words in ${data.time.toFixed(2)} ms.`;
            searchInput.disabled = false;
            searchInput.focus();
        } else if (type === 'suggestions') {
            const { suggestions, time } = data;
            searchTime.textContent = `${time.toFixed(2)} ms`;
            showSuggestions(suggestions);
        }
    };
}

buildBtn.addEventListener('click', () => {
    const words = dictionaryInput.value.split(/[\s\n]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 0);

    if (words.length === 0) return;

    buildBtn.disabled = true;
    searchInput.disabled = true;
    buildStatus.textContent = 'Building Trie...';

    worker.postMessage({ type: 'build', words });
});

searchInput.addEventListener('input', () => {
    const prefix = searchInput.value.trim().toLowerCase();
    if (prefix.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    worker.postMessage({ type: 'search', prefix });
});

function showSuggestions(suggestions) {
    suggestionsBox.innerHTML = '';

    if (suggestions.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    suggestions.forEach(word => {
        const div = document.createElement('div');
        div.textContent = word;
        div.style.padding = '8px 12px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #333';
        div.style.color = '#eee';

        div.onmouseover = () => { div.style.backgroundColor = '#333'; };
        div.onmouseout = () => { div.style.backgroundColor = 'transparent'; };

        div.onclick = () => {
            searchInput.value = word;
            suggestionsBox.style.display = 'none';
        };

        suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = 'block';
}

// Close suggestions on click outside
document.addEventListener('click', (e) => {
    if (e.target !== searchInput && e.target !== suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
});
