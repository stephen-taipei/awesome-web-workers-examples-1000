/**
 * #636 Master-Worker Pattern
 */
let workers = [], taskQueue = [], completedTasks = 0, totalTasks = 20;

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    workers.forEach(w => w.terminate());
    workers = [];
    taskQueue = Array.from({ length: totalTasks }, (_, i) => ({ id: i, data: Math.random() * 100 }));
    completedTasks = 0;

    // Create workers
    for (let i = 0; i < 4; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleResult(i, e.data);
        worker.postMessage({ type: 'init', id: i });
        workers.push({ worker, busy: false, tasksCompleted: 0 });
        assignTask(i);
    }

    updateMaster();
    updateWorkers();
}

function assignTask(workerId) {
    if (taskQueue.length === 0) return;
    const task = taskQueue.shift();
    workers[workerId].busy = true;
    workers[workerId].worker.postMessage({ type: 'task', task });
    updateWorkers();
}

function handleResult(workerId, result) {
    workers[workerId].busy = false;
    workers[workerId].tasksCompleted++;
    completedTasks++;
    updateMaster();
    updateWorkers();

    if (taskQueue.length > 0) {
        assignTask(workerId);
    }
}

function updateMaster() {
    document.getElementById('master').innerHTML = `
        <div class="stat-item"><span class="stat-label">Total Tasks:</span><span class="stat-value">${totalTasks}</span></div>
        <div class="stat-item"><span class="stat-label">Completed:</span><span class="stat-value">${completedTasks}</span></div>
        <div class="stat-item"><span class="stat-label">Remaining:</span><span class="stat-value">${taskQueue.length}</span></div>
    `;
}

function updateWorkers() {
    document.getElementById('workers').innerHTML = workers.map((w, i) => `
        <div style="padding:15px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;border-left:4px solid ${w.busy ? 'var(--warning-color)' : 'var(--success-color)'};">
            Worker ${i}: ${w.busy ? 'Busy' : 'Idle'} | Completed: ${w.tasksCompleted}
        </div>
    `).join('');
}
