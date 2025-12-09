const runBtn = document.getElementById('runBtn');
const iterationsInput = document.getElementById('iterations');
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
    const iterations = parseInt(iterationsInput.value, 10) * 1000000;
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    resultsTableBody.innerHTML = '';

    worker.postMessage({ iterations });
});

function renderResults(results) {
    resultsTableBody.innerHTML = results.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.time.toFixed(2)}</td>
        </tr>
    `).join('');
}
