const runBtn = document.getElementById('runBtn');
const complexitySelect = document.getElementById('complexity');
const sizeInput = document.getElementById('size');
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
    const size = parseInt(sizeInput.value, 10);
    const complexity = complexitySelect.value;
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    resultsTableBody.innerHTML = '';

    worker.postMessage({ size, complexity });
});

function renderResults(results) {
    resultsTableBody.innerHTML = results.map(r => `
        <tr>
            <td>${r.op}</td>
            <td>${(r.size / 1024).toFixed(2)}</td>
            <td>${r.time.toFixed(2)}</td>
        </tr>
    `).join('');
}
