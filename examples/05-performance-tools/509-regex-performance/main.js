const runBtn = document.getElementById('runBtn');
const patternSelect = document.getElementById('patternType');
const corpusSizeInput = document.getElementById('corpusSize');
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
    const size = parseInt(corpusSizeInput.value, 10);
    const pattern = patternSelect.value;
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    resultsTableBody.innerHTML = '';

    worker.postMessage({ size, pattern });
});

function renderResults(results) {
    resultsTableBody.innerHTML = results.map(r => `
        <tr>
            <td>${r.test}</td>
            <td>${r.matches}</td>
            <td>${r.time.toFixed(2)}</td>
        </tr>
    `).join('');
}
