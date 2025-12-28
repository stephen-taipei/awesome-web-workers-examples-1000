/**
 * #608 Port Transfer Pattern
 * Dynamic port redistribution between workers
 */

const workers = new Map();
const connections = new Set();

const elements = {
    createWorkersBtn: document.getElementById('create-workers-btn'),
    connect12Btn: document.getElementById('connect-1-2-btn'),
    connect23Btn: document.getElementById('connect-2-3-btn'),
    connect13Btn: document.getElementById('connect-1-3-btn'),
    topology: document.getElementById('topology'),
    commLog: document.getElementById('comm-log')
};

function createWorkers() {
    // Terminate existing
    workers.forEach(w => w.terminate());
    workers.clear();
    connections.clear();

    // Create 3 workers
    for (let i = 1; i <= 3; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e);
        worker.postMessage({ type: 'init', data: { id: i } });
        workers.set(i, worker);
        log(`Worker ${i} created`);
    }

    updateUI();
    updateTopology();
}

function connectWorkers(id1, id2) {
    const connKey = `${Math.min(id1, id2)}-${Math.max(id1, id2)}`;
    if (connections.has(connKey)) {
        log(`Workers ${id1} and ${id2} already connected`);
        return;
    }

    const channel = new MessageChannel();

    // Transfer port1 to worker1
    workers.get(id1).postMessage(
        { type: 'addPort', data: { peerId: id2 } },
        [channel.port1]
    );

    // Transfer port2 to worker2
    workers.get(id2).postMessage(
        { type: 'addPort', data: { peerId: id1 } },
        [channel.port2]
    );

    connections.add(connKey);
    log(`Connected workers ${id1} <-> ${id2}`);
    updateTopology();

    // Test the connection
    setTimeout(() => {
        workers.get(id1).postMessage({
            type: 'sendTo',
            data: { peerId: id2, message: `Hello from Worker ${id1}!` }
        });
    }, 100);
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'log':
            log(`[W${workerId}] ${data.message}`);
            break;
        case 'received':
            log(`[W${workerId}] Received from W${data.from}: "${data.message}"`);
            break;
    }
}

function log(message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border-color);font-size:0.9rem;';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    elements.commLog.insertBefore(div, elements.commLog.firstChild);

    while (elements.commLog.children.length > 30) {
        elements.commLog.removeChild(elements.commLog.lastChild);
    }
}

function updateTopology() {
    const hasConn = (a, b) => connections.has(`${Math.min(a, b)}-${Math.max(a, b)}`);

    let svg = `
        <svg width="300" height="200" viewBox="0 0 300 200">
            <!-- Workers -->
            <circle cx="150" cy="40" r="25" fill="var(--primary-color)" />
            <text x="150" y="45" fill="white" text-anchor="middle" font-weight="bold">W1</text>

            <circle cx="60" cy="160" r="25" fill="var(--primary-color)" />
            <text x="60" y="165" fill="white" text-anchor="middle" font-weight="bold">W2</text>

            <circle cx="240" cy="160" r="25" fill="var(--primary-color)" />
            <text x="240" y="165" fill="white" text-anchor="middle" font-weight="bold">W3</text>

            <!-- Connections -->
            ${hasConn(1, 2) ? '<line x1="135" y1="60" x2="75" y2="140" stroke="var(--success-color)" stroke-width="3"/>' : ''}
            ${hasConn(2, 3) ? '<line x1="85" y1="160" x2="215" y2="160" stroke="var(--success-color)" stroke-width="3"/>' : ''}
            ${hasConn(1, 3) ? '<line x1="165" y1="60" x2="225" y2="140" stroke="var(--success-color)" stroke-width="3"/>' : ''}
        </svg>
    `;
    elements.topology.innerHTML = svg;
}

function updateUI() {
    const hasWorkers = workers.size === 3;
    elements.connect12Btn.disabled = !hasWorkers;
    elements.connect23Btn.disabled = !hasWorkers;
    elements.connect13Btn.disabled = !hasWorkers;
}

// Event listeners
elements.createWorkersBtn.addEventListener('click', createWorkers);
elements.connect12Btn.addEventListener('click', () => connectWorkers(1, 2));
elements.connect23Btn.addEventListener('click', () => connectWorkers(2, 3));
elements.connect13Btn.addEventListener('click', () => connectWorkers(1, 3));

updateUI();
updateTopology();
