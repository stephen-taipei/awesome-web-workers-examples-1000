const runBtn = document.getElementById('runBtn');
const sizeSelect = document.getElementById('size');
const resultsTableBody = document.querySelector('#resultsTable tbody');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { type, results } = e.data;

    if (type === 'complete') {
        renderResults(results);
        runBtn.disabled = false;
        runBtn.textContent = 'Run Benchmark';
    } else if (type === 'progress') {
        runBtn.textContent = `Running... ${e.data.percent}%`;
    }
};

runBtn.addEventListener('click', () => {
    const size = parseInt(sizeSelect.value, 10);
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    resultsTableBody.innerHTML = '';

    worker.postMessage({ size });
});

function renderResults(results) {
    resultsTableBody.innerHTML = results.map(r => `
        <tr>
            <td>${r.test}</td>
            <td>${r.type}</td>
            <td>${r.time.toFixed(2)}</td>
        </tr>
    `).join('');
}
