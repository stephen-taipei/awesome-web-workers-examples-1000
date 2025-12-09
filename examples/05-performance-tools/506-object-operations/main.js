const runBtn = document.getElementById('runBtn');
const countSelect = document.getElementById('count');
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
    const count = parseInt(countSelect.value, 10);
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    resultsTableBody.innerHTML = '';

    worker.postMessage({ count });
});

function renderResults(results) {
    resultsTableBody.innerHTML = results.map(r => `
        <tr>
            <td>${r.op}</td>
            <td>${r.type}</td>
            <td>${r.time.toFixed(2)}</td>
        </tr>
    `).join('');
}
