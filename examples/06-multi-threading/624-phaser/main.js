/**
 * #624 Phaser Pattern
 */
let workers = [], workerPhases = [], nextId = 0;

document.getElementById('start-btn').addEventListener('click', () => {
    for (let i = 0; i < 3; i++) addWorker();
});

document.getElementById('add-btn').addEventListener('click', addWorker);

function addWorker() {
    const id = nextId++;
    const worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        if (e.data.type === 'phase') {
            workerPhases[id] = e.data.phase;
            updateDisplay();
        }
    };
    worker.postMessage({ type: 'start', id });
    workers.push({ id, worker });
    workerPhases[id] = 0;
    updateDisplay();
}

function updateDisplay() {
    document.getElementById('status').innerHTML = `
        <div class="stat-item"><span class="stat-label">Workers:</span><span class="stat-value">${workers.length}</span></div>
    `;
    document.getElementById('workers').innerHTML = workers.map(w => `
        <div style="padding:10px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;">
            Worker ${w.id}: Phase ${workerPhases[w.id] || 0}
            <div style="height:10px;background:var(--primary-color);width:${(workerPhases[w.id] || 0) * 10}%;border-radius:5px;margin-top:5px;"></div>
        </div>
    `).join('');
}
