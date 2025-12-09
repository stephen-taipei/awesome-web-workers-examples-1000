const runBtn = document.getElementById('runBtn');
const iterationsInput = document.getElementById('iterations');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const totalScoreDiv = document.getElementById('totalScore');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { type, results, totalTime } = e.data;

    if (type === 'complete') {
        renderResults(results);
        const totalOps = results.reduce((acc, curr) => acc + curr.ops, 0);
        // Approximation of MIPS (not real CPU MIPS, but JS Ops/sec)
        const mips = (totalOps / (totalTime / 1000) / 1000000).toFixed(2);
        totalScoreDiv.textContent = `Total Score: ${mips} Million Ops/sec (Aggregate)`;
        runBtn.disabled = false;
        runBtn.textContent = 'Run Benchmark';
    } else if (type === 'progress') {
        runBtn.textContent = `Running... ${e.data.percent}%`;
    }
};

runBtn.addEventListener('click', () => {
    const iterations = parseInt(iterationsInput.value, 10) * 1000000;
    if (isNaN(iterations) || iterations <= 0) return;

    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    resultsTableBody.innerHTML = '';
    totalScoreDiv.textContent = '';

    worker.postMessage({ iterations });
});

function renderResults(results) {
    resultsTableBody.innerHTML = results.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.time.toFixed(2)}</td>
            <td>${(r.opsPerSec).toLocaleString()}</td>
        </tr>
    `).join('');
}
