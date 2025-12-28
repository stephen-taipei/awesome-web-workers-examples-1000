/**
 * #685 Memory Barrier
 * Memory fence operations
 */
let workers = [], running = false;

document.getElementById('start-btn').addEventListener('click', start);
document.getElementById('reset-btn').addEventListener('click', reset);

function start() {
    reset();
    running = true;
    log('Starting Memory Barrier demo...');
    
    const worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        if (e.data.type === 'status') {
            updateStatus(e.data);
        } else if (e.data.type === 'log') {
            log(e.data.message);
        } else if (e.data.type === 'complete') {
            log('Demo complete!');
            running = false;
        }
    };
    worker.onerror = (e) => log('Error: ' + e.message);
    worker.postMessage({ type: 'start' });
    workers.push(worker);
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    running = false;
    document.getElementById('status').innerHTML = '<p style="color:var(--text-muted);">Ready</p>';
    document.getElementById('output').innerHTML = '';
}

function updateStatus(data) {
    document.getElementById('status').innerHTML = `
        <div class="stat-item"><span class="stat-label">Status:</span><span class="stat-value">${data.status || 'Running'}</span></div>
        <div class="stat-item"><span class="stat-label">Progress:</span><span class="stat-value">${data.progress || 0}%</span></div>
    `;
}

function log(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:5px;border-bottom:1px solid var(--border-color);font-size:0.9rem;';
    div.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
    document.getElementById('output').insertBefore(div, document.getElementById('output').firstChild);
}