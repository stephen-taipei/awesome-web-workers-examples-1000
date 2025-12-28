/**
 * #634 Event Bus Pattern
 */
const eventBus = { listeners: new Map() };
let workers = [];

document.getElementById('init-btn').addEventListener('click', init);
document.getElementById('emit-btn').addEventListener('click', emit);

function init() {
    workers.forEach(w => w.terminate());
    workers = [];
    eventBus.listeners.clear();

    for (let i = 0; i < 3; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            if (e.data.type === 'emit') {
                broadcast(e.data.event, e.data.data, i);
            } else if (e.data.type === 'log') {
                log(`Worker ${i}: ${e.data.message}`);
            }
        };
        worker.postMessage({ type: 'init', id: i });
        workers.push(worker);
        eventBus.listeners.set(i, worker);
    }

    updateWorkers();
    document.getElementById('emit-btn').disabled = false;
}

function broadcast(event, data, fromWorker) {
    log(`Bus: Broadcasting "${event}" from Worker ${fromWorker}`);
    workers.forEach((w, i) => {
        w.postMessage({ type: 'event', event, data, from: fromWorker });
    });
}

function emit() {
    const events = ['click', 'update', 'refresh'];
    const event = events[Math.floor(Math.random() * events.length)];
    broadcast(event, { value: Math.random() }, 'main');
}

function updateWorkers() {
    document.getElementById('workers').innerHTML = workers.map((_, i) => `
        <div style="display:inline-block;padding:15px 25px;background:var(--success-color);color:white;border-radius:8px;margin:5px;">Worker ${i}</div>
    `).join('');
}

function log(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:5px;border-bottom:1px solid var(--border-color);font-size:0.9rem;';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    document.getElementById('events').insertBefore(div, document.getElementById('events').firstChild);
}
