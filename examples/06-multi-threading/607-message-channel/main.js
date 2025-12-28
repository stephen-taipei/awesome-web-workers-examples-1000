/**
 * #607 Message Channel Pattern
 * Direct worker-to-worker communication using MessageChannel
 */

let workerA = null;
let workerB = null;
let channelCreated = false;
let messageCount = { aToB: 0, bToA: 0 };
let pingPongRunning = false;

const elements = {
    createChannelBtn: document.getElementById('create-channel-btn'),
    sendAtoBBtn: document.getElementById('send-a-to-b-btn'),
    sendBtoABtn: document.getElementById('send-b-to-a-btn'),
    pingPongBtn: document.getElementById('ping-pong-btn'),
    workerALog: document.getElementById('worker-a-log'),
    workerBLog: document.getElementById('worker-b-log'),
    stats: document.getElementById('stats')
};

function createChannel() {
    // Terminate existing workers
    if (workerA) workerA.terminate();
    if (workerB) workerB.terminate();

    // Create workers
    workerA = new Worker('worker.js');
    workerB = new Worker('worker.js');

    // Create message channel
    const channel = new MessageChannel();

    // Set up message handlers for main thread communication
    workerA.onmessage = (e) => handleWorkerMessage('A', e);
    workerB.onmessage = (e) => handleWorkerMessage('B', e);

    // Initialize workers with their IDs
    workerA.postMessage({ type: 'init', data: { id: 'A' } });
    workerB.postMessage({ type: 'init', data: { id: 'B' } });

    // Transfer ports to workers
    workerA.postMessage(
        { type: 'setPort', data: { peerId: 'B' } },
        [channel.port1]
    );
    workerB.postMessage(
        { type: 'setPort', data: { peerId: 'A' } },
        [channel.port2]
    );

    channelCreated = true;
    messageCount = { aToB: 0, bToA: 0 };
    pingPongRunning = false;

    updateUI();
    clearLogs();
    logToWorker('A', 'Worker A initialized');
    logToWorker('B', 'Worker B initialized');
    logToWorker('A', 'MessageChannel port received');
    logToWorker('B', 'MessageChannel port received');
    updateStats();
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'log':
            logToWorker(workerId, data.message);
            break;
        case 'received':
            if (workerId === 'A') messageCount.bToA++;
            else messageCount.aToB++;
            updateStats();
            break;
        case 'pong-complete':
            pingPongRunning = false;
            updateUI();
            break;
    }
}

function sendAtoB() {
    workerA.postMessage({
        type: 'sendToPeer',
        data: { message: `Hello from A! (${Date.now()})` }
    });
}

function sendBtoA() {
    workerB.postMessage({
        type: 'sendToPeer',
        data: { message: `Hello from B! (${Date.now()})` }
    });
}

function startPingPong() {
    pingPongRunning = true;
    updateUI();

    workerA.postMessage({
        type: 'startPingPong',
        data: { count: 100 }
    });
}

function logToWorker(workerId, message) {
    const container = workerId === 'A' ? elements.workerALog : elements.workerBLog;
    const div = document.createElement('div');
    div.style.cssText = 'padding:4px 0;border-bottom:1px solid var(--border-color);';
    div.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    container.insertBefore(div, container.firstChild);

    while (container.children.length > 20) {
        container.removeChild(container.lastChild);
    }
}

function clearLogs() {
    elements.workerALog.innerHTML = '';
    elements.workerBLog.innerHTML = '';
}

function updateStats() {
    elements.stats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">A -> B Messages:</span>
            <span class="stat-value">${messageCount.aToB}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">B -> A Messages:</span>
            <span class="stat-value">${messageCount.bToA}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total:</span>
            <span class="stat-value">${messageCount.aToB + messageCount.bToA}</span>
        </div>
    `;
}

function updateUI() {
    elements.sendAtoBBtn.disabled = !channelCreated || pingPongRunning;
    elements.sendBtoABtn.disabled = !channelCreated || pingPongRunning;
    elements.pingPongBtn.disabled = !channelCreated || pingPongRunning;
    elements.pingPongBtn.textContent = pingPongRunning ? 'Ping-Pong Running...' : 'Start Ping-Pong';
}

// Event listeners
elements.createChannelBtn.addEventListener('click', createChannel);
elements.sendAtoBBtn.addEventListener('click', sendAtoB);
elements.sendBtoABtn.addEventListener('click', sendBtoA);
elements.pingPongBtn.addEventListener('click', startPingPong);

updateUI();
updateStats();
