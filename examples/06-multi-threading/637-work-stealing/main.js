/**
 * #637 Work Stealing Pattern
 */
let workers = [], queues = [], stolen = 0;

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    workers.forEach(w => w.terminate());
    workers = [];
    queues = [[], [], [], []];
    stolen = 0;

    // Uneven initial distribution
    queues[0] = Array.from({ length: 15 }, (_, i) => i);
    queues[1] = Array.from({ length: 2 }, (_, i) => i + 15);

    for (let i = 0; i < 4; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleMessage(i, e.data);
        worker.postMessage({ type: 'init', id: i });
        workers.push(worker);
    }

    updateDisplay();
    processQueues();
}

function processQueues() {
    workers.forEach((w, i) => {
        if (queues[i].length > 0) {
            const task = queues[i].shift();
            w.postMessage({ type: 'process', task });
        } else {
            // Try to steal
            const victim = queues.findIndex(q => q.length > 1);
            if (victim >= 0) {
                const task = queues[victim].pop();
                stolen++;
                w.postMessage({ type: 'process', task, stolen: true });
            }
        }
    });
    updateDisplay();
}

function handleMessage(workerId, data) {
    if (data.type === 'done') {
        setTimeout(() => processQueues(), 100);
    }
}

function updateDisplay() {
    document.getElementById('queues').innerHTML = queues.map((q, i) => `
        <div style="padding:15px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;">
            <strong>Worker ${i}</strong>: ${q.length} tasks
            <div style="display:flex;gap:3px;margin-top:5px;">
                ${q.slice(0, 10).map(() => '<div style="width:20px;height:20px;background:var(--primary-color);border-radius:3px;"></div>').join('')}
                ${q.length > 10 ? '...' : ''}
            </div>
        </div>
    `).join('');

    document.getElementById('stats').innerHTML = `
        <div class="stat-item"><span class="stat-label">Tasks Stolen:</span><span class="stat-value">${stolen}</span></div>
        <div class="stat-item"><span class="stat-label">Remaining:</span><span class="stat-value">${queues.reduce((a, q) => a + q.length, 0)}</span></div>
    `;
}
