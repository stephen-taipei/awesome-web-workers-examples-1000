const dataList = document.getElementById('dataList');
const searchQuery = document.getElementById('searchQuery');
const maxDistance = document.getElementById('maxDistance');
const maxDistVal = document.getElementById('maxDistVal');
const searchBtn = document.getElementById('searchBtn');
const resultContainer = document.getElementById('resultContainer');
const matchCount = document.getElementById('matchCount');
const processingTime = document.getElementById('processingTime');
const matchList = document.getElementById('matchList');

let worker;

maxDistance.addEventListener('input', (e) => {
    maxDistVal.textContent = e.target.value;
});

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { results, time } = data;

            matchCount.textContent = results.length;
            processingTime.textContent = `${time.toFixed(2)} ms`;

            matchList.innerHTML = '';
            results.forEach(item => {
                const el = document.createElement('div');
                el.style.marginBottom = '5px';
                el.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                el.style.display = 'flex';
                el.style.justifyContent = 'space-between';

                el.innerHTML = `
                    <span style="color: #10b981; font-weight: bold;">${item.item}</span>
                    <span style="color: #6ee7b7; font-size: 0.9em;">Distance: ${item.distance}</span>
                `;
                matchList.appendChild(el);
            });

            resultContainer.classList.remove('hidden');
            searchBtn.disabled = false;
        }
    };
}

searchBtn.addEventListener('click', () => {
    const list = dataList.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const query = searchQuery.value;
    const maxDist = parseInt(maxDistance.value);

    if (!query) return;

    searchBtn.disabled = true;
    resultContainer.classList.add('hidden');

    worker.postMessage({ list, query, maxDist });
});
