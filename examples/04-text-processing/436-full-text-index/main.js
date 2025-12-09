const documentsInput = document.getElementById('documentsInput');
const indexBtn = document.getElementById('indexBtn');
const indexStatus = document.getElementById('indexStatus');
const searchQuery = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const resultContainer = document.getElementById('resultContainer');
const resultCount = document.getElementById('resultCount');
const searchTime = document.getElementById('searchTime');
const resultList = document.getElementById('resultList');

let worker;

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'indexed') {
            indexStatus.textContent = `Indexed ${data.docCount} documents (Total words: ${data.wordCount}) in ${data.time.toFixed(2)} ms.`;
            searchQuery.disabled = false;
            searchBtn.disabled = false;
        } else if (type === 'results') {
            const { results, time } = data;

            resultCount.textContent = results.length;
            searchTime.textContent = `${time.toFixed(2)} ms`;

            resultList.innerHTML = '';
            if (results.length === 0) {
                resultList.innerHTML = '<div style="color: #bbb;">No documents found.</div>';
            } else {
                results.forEach(doc => {
                    const div = document.createElement('div');
                    div.style.marginBottom = '10px';
                    div.style.padding = '10px';
                    div.style.border = '1px solid rgba(255,255,255,0.1)';
                    div.style.borderRadius = '6px';
                    div.style.background = 'rgba(255,255,255,0.05)';

                    div.innerHTML = `
                        <div style="color: #10b981; font-weight: bold; margin-bottom: 5px;">Document ID: ${doc.id}</div>
                        <div style="color: #ddd; font-size: 0.9em;">${highlight(doc.text, searchQuery.value)}</div>
                    `;
                    resultList.appendChild(div);
                });
            }

            resultContainer.classList.remove('hidden');
        } else if (type === 'error') {
            alert(data.message);
        }
    };
}

indexBtn.addEventListener('click', () => {
    try {
        const docs = JSON.parse(documentsInput.value);
        if (!Array.isArray(docs)) throw new Error("Input must be a JSON array");

        indexBtn.disabled = true;
        searchQuery.disabled = true;
        searchBtn.disabled = true;
        indexStatus.textContent = 'Indexing...';

        worker.postMessage({ type: 'build', docs });
    } catch (e) {
        alert("Invalid JSON: " + e.message);
    }
});

searchBtn.addEventListener('click', () => {
    const query = searchQuery.value.trim();
    if (!query) return;

    worker.postMessage({ type: 'search', query });
});

function highlight(text, query) {
    // Simple highlight logic
    // Extract words from query
    const words = query.toLowerCase().split(/[\s\(\)ANDORNOT]+/).filter(w => w.length > 0);
    let html = text;

    words.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        html = html.replace(regex, match => `<span style="background: rgba(16,185,129,0.4); border-radius: 3px; padding: 0 2px;">${match}</span>`);
    });

    return html;
}
