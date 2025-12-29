/**
 * #638 Task Parallelism
 */
const tasks = [
    { name: 'Calculate Primes', op: 'primes' },
    { name: 'Sort Array', op: 'sort' },
    { name: 'Fibonacci', op: 'fib' },
    { name: 'Matrix Multiply', op: 'matrix' }
];

let workers = [], taskStatus = [];

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    workers.forEach(w => w.terminate());
    workers = [];
    taskStatus = tasks.map(t => ({ ...t, status: 'running', result: null }));
    updateDisplay();

    tasks.forEach((task, i) => {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            taskStatus[i].status = 'done';
            taskStatus[i].result = e.data.result;
            taskStatus[i].time = e.data.time;
            updateDisplay();
        };
        worker.postMessage({ op: task.op });
        workers.push(worker);
    });
}

function updateDisplay() {
    document.getElementById('tasks').innerHTML = taskStatus.map(t => `
        <div style="padding:15px;background:var(--bg-secondary);margin:10px 0;border-radius:8px;border-left:4px solid ${t.status === 'done' ? 'var(--success-color)' : 'var(--warning-color)'};">
            <div style="display:flex;justify-content:space-between;">
                <strong>${t.name}</strong>
                <span style="color:${t.status === 'done' ? 'var(--success-color)' : 'var(--warning-color)'};">${t.status}</span>
            </div>
            ${t.result ? `<div style="margin-top:10px;color:var(--text-secondary);">Result: ${t.result} (${t.time}ms)</div>` : ''}
        </div>
    `).join('');
}
