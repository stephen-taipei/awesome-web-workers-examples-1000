/**
 * #639 Data Parallelism
 */
let workers = [], chunkStatus = [], startTime;
const WORKERS = 4;

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    const data = Array.from({ length: 100000 }, () => Math.random() * 100);
    const chunkSize = Math.ceil(data.length / WORKERS);

    workers.forEach(w => w.terminate());
    workers = [];
    chunkStatus = Array(WORKERS).fill(null).map((_, i) => ({ id: i, status: 'processing', sum: null }));
    startTime = performance.now();

    updateDisplay();

    for (let i = 0; i < WORKERS; i++) {
        const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            chunkStatus[i].status = 'done';
            chunkStatus[i].sum = e.data.sum;
            chunkStatus[i].time = e.data.time;
            updateDisplay();
            checkComplete();
        };
        worker.postMessage({ data: chunk });
        workers.push(worker);
    }
}

function checkComplete() {
    if (chunkStatus.every(c => c.status === 'done')) {
        const total = chunkStatus.reduce((a, c) => a + c.sum, 0);
        const totalTime = performance.now() - startTime;
        document.getElementById('results').innerHTML = `
            <div class="stat-item"><span class="stat-label">Total Sum:</span><span class="stat-value">${total.toFixed(2)}</span></div>
            <div class="stat-item"><span class="stat-label">Total Time:</span><span class="stat-value">${totalTime.toFixed(0)} ms</span></div>
            <div class="stat-item"><span class="stat-label">Workers:</span><span class="stat-value">${WORKERS}</span></div>
        `;
    }
}

function updateDisplay() {
    document.getElementById('chunks').innerHTML = chunkStatus.map(c => `
        <div style="padding:10px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;border-left:4px solid ${c.status === 'done' ? 'var(--success-color)' : 'var(--warning-color)'};">
            Chunk ${c.id}: ${c.status} ${c.sum ? `- Sum: ${c.sum.toFixed(2)} (${c.time}ms)` : ''}
        </div>
    `).join('');
}
