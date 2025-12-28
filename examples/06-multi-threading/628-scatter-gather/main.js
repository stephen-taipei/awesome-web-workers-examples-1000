/**
 * #628 Scatter-Gather Pattern
 */
let workers = [], gathered = [];
const WORKER_COUNT = 4;

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    workers.forEach(w => w.terminate());
    workers = [];
    gathered = [];

    const data = Array.from({ length: 100 }, () => Math.random() * 100);
    const chunks = scatter(data, WORKER_COUNT);

    document.getElementById('workers').innerHTML = chunks.map((_, i) =>
        `<div id="worker-${i}" style="padding:15px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;">Worker ${i}: Processing...</div>`
    ).join('');

    const startTime = performance.now();

    chunks.forEach((chunk, i) => {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            gathered[i] = e.data;
            document.getElementById(`worker-${i}`).innerHTML = `Worker ${i}: Done (sum=${e.data.sum.toFixed(2)}, max=${e.data.max.toFixed(2)})`;
            document.getElementById(`worker-${i}`).style.borderLeft = '4px solid var(--success-color)';

            if (gathered.filter(g => g).length === WORKER_COUNT) {
                const finalResult = gatherResults(gathered);
                const duration = performance.now() - startTime;
                document.getElementById('results').innerHTML = `
                    <div class="stat-item"><span class="stat-label">Total Sum:</span><span class="stat-value">${finalResult.totalSum.toFixed(2)}</span></div>
                    <div class="stat-item"><span class="stat-label">Global Max:</span><span class="stat-value">${finalResult.globalMax.toFixed(2)}</span></div>
                    <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${duration.toFixed(2)} ms</span></div>
                `;
            }
        };
        worker.postMessage({ data: chunk });
        workers.push(worker);
    });
}

function scatter(data, n) {
    const chunks = [];
    const size = Math.ceil(data.length / n);
    for (let i = 0; i < n; i++) {
        chunks.push(data.slice(i * size, (i + 1) * size));
    }
    return chunks;
}

function gatherResults(results) {
    return {
        totalSum: results.reduce((acc, r) => acc + r.sum, 0),
        globalMax: Math.max(...results.map(r => r.max))
    };
}
