const documentsInput = document.getElementById('documentsInput');
const indexBtn = document.getElementById('indexBtn');
const indexStatus = document.getElementById('indexStatus');
const searchQuery = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const resultContainer = document.getElementById('resultContainer');
const searchTime = document.getElementById('searchTime');
const resultList = document.getElementById('resultList');

let worker;

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'indexed') {
            indexStatus.textContent = `Indexed ${data.count} documents in ${data.time.toFixed(2)} ms.`;
            searchQuery.disabled = false;
            searchBtn.disabled = false;
        } else if (type === 'results') {
            const { results, time } = data;

            searchTime.textContent = `${time.toFixed(2)} ms`;

            resultList.innerHTML = '';
            if (results.length === 0) {
                resultList.innerHTML = '<div style="color: #bbb;">No relevant documents found.</div>';
            } else {
                results.forEach((res, idx) => {
                    const div = document.createElement('div');
                    div.style.marginBottom = '15px';
                    div.style.padding = '10px';
                    div.style.background = 'rgba(0,0,0,0.2)';
                    div.style.borderRadius = '8px';

                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span style="color:#10b981; font-weight:bold;">Rank ${idx + 1}</span>
                            <span style="color:#6ee7b7; font-size:0.8em;">Score: ${res.score.toFixed(4)}</span>
                        </div>
                        <div style="color:#ddd;">${res.doc}</div>
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
        if (!Array.isArray(docs)) throw new Error("Input must be a JSON array of strings");

        indexBtn.disabled = true;
        searchQuery.disabled = true;
        searchBtn.disabled = true;
        indexStatus.textContent = 'Indexing...';

        worker.postMessage({ type: 'index', docs });
    } catch (e) {
        alert("Invalid JSON: " + e.message);
    }
});

searchBtn.addEventListener('click', () => {
    const query = searchQuery.value.trim();
    if (!query) return;

    worker.postMessage({ type: 'search', query });
});
