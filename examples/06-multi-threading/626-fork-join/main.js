/**
 * #626 Fork-Join Pattern
 */
let workers = [], results = [], taskCount = 0;

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    const size = parseInt(document.getElementById('size').value);
    const workerCount = navigator.hardwareConcurrency || 4;
    const chunkSize = Math.ceil(size / workerCount);

    workers.forEach(w => w.terminate());
    workers = [];
    results = [];
    taskCount = workerCount;

    const startTime = performance.now();
    document.getElementById('results').innerHTML = '<p>Calculating...</p>';

    let tree = '<div style="text-align:center;">';
    tree += '<div style="background:var(--primary-color);color:white;padding:10px;border-radius:8px;display:inline-block;margin-bottom:20px;">Main Task (0-' + size + ')</div>';
    tree += '<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">';

    for (let i = 0; i < workerCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, size);

        tree += `<div id="task-${i}" style="background:var(--bg-secondary);padding:10px;border-radius:8px;min-width:100px;">Task ${i}<br>${start}-${end}</div>`;

        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            results[i] = e.data.sum;
            document.getElementById(`task-${i}`).style.background = 'var(--success-color)';
            document.getElementById(`task-${i}`).style.color = 'white';
            document.getElementById(`task-${i}`).innerHTML += `<br>=${e.data.sum.toExponential(2)}`;

            if (results.filter(r => r !== undefined).length === taskCount) {
                const total = results.reduce((a, b) => a + b, 0);
                const duration = performance.now() - startTime;
                document.getElementById('results').innerHTML = `
                    <div class="stat-item"><span class="stat-label">Sum:</span><span class="stat-value">${total.toExponential(4)}</span></div>
                    <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${duration.toFixed(2)} ms</span></div>
                    <div class="stat-item"><span class="stat-label">Workers:</span><span class="stat-value">${workerCount}</span></div>
                `;
            }
        };
        worker.postMessage({ start, end });
        workers.push(worker);
    }

    tree += '</div></div>';
    document.getElementById('tree').innerHTML = tree;
}
