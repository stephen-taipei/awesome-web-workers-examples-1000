/**
 * #606 Broadcast Channel Pattern
 * Cross-context communication using BroadcastChannel API
 */

let channel = null;
const workers = [];
let workerIdCounter = 0;
const mainId = 'main-' + Math.random().toString(36).substr(2, 6);

const elements = {
    channelName: document.getElementById('channel-name'),
    messageInput: document.getElementById('message-input'),
    broadcastBtn: document.getElementById('broadcast-btn'),
    workerBroadcastBtn: document.getElementById('worker-broadcast-btn'),
    spawnWorkerBtn: document.getElementById('spawn-worker-btn'),
    workersList: document.getElementById('workers-list'),
    messages: document.getElementById('messages')
};

function initChannel() {
    const channelName = elements.channelName.value || 'demo-channel';

    if (channel) {
        channel.close();
    }

    channel = new BroadcastChannel(channelName);

    channel.onmessage = (event) => {
        const { from, message, timestamp, type } = event.data;
        addMessage(from, message, type, timestamp);
    };

    addMessage('System', `Joined channel: ${channelName}`, 'system');
}

function broadcastFromMain() {
    const message = elements.messageInput.value.trim();
    if (!message || !channel) return;

    channel.postMessage({
        from: mainId,
        message,
        type: 'main',
        timestamp: Date.now()
    });

    elements.messageInput.value = '';
}

function broadcastFromWorker() {
    if (workers.length === 0) {
        alert('Spawn a worker first!');
        return;
    }

    const message = elements.messageInput.value.trim() || 'Hello from worker!';

    // Tell first worker to broadcast
    workers[0].worker.postMessage({
        type: 'broadcast',
        data: { message }
    });

    elements.messageInput.value = '';
}

function spawnWorker() {
    const id = ++workerIdCounter;
    const channelName = elements.channelName.value || 'demo-channel';

    const worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
            addMessage('System', `Worker #${id} joined channel`, 'system');
        }
    };

    worker.postMessage({
        type: 'init',
        data: { workerId: id, channelName }
    });

    workers.push({ id, worker });
    updateWorkersList();
}

function terminateWorker(id) {
    const index = workers.findIndex(w => w.id === id);
    if (index !== -1) {
        workers[index].worker.terminate();
        workers.splice(index, 1);
        updateWorkersList();
        addMessage('System', `Worker #${id} terminated`, 'system');
    }
}

function updateWorkersList() {
    if (workers.length === 0) {
        elements.workersList.innerHTML = '<p style="color:var(--text-muted);">No workers spawned</p>';
        return;
    }

    elements.workersList.innerHTML = workers.map(w => `
        <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 15px;background:var(--bg-secondary);border-radius:8px;margin:5px;">
            <span>Worker #${w.id}</span>
            <button onclick="terminateWorker(${w.id})" style="background:var(--danger-color);color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">X</button>
        </div>
    `).join('');
}

function addMessage(from, message, type, timestamp = Date.now()) {
    const colors = {
        main: 'var(--primary-color)',
        worker: 'var(--success-color)',
        system: 'var(--warning-color)'
    };

    const div = document.createElement('div');
    div.style.cssText = 'padding:10px;border-bottom:1px solid var(--border-color);';
    div.innerHTML = `
        <span style="color:${colors[type] || 'var(--text-secondary)'};font-weight:bold;">[${from}]</span>
        <span style="color:var(--text-primary);">${message}</span>
        <span style="color:var(--text-muted);font-size:0.8rem;float:right;">${new Date(timestamp).toLocaleTimeString()}</span>
    `;
    elements.messages.insertBefore(div, elements.messages.firstChild);

    while (elements.messages.children.length > 30) {
        elements.messages.removeChild(elements.messages.lastChild);
    }
}

// Make terminateWorker available globally
window.terminateWorker = terminateWorker;

// Event listeners
elements.broadcastBtn.addEventListener('click', broadcastFromMain);
elements.workerBroadcastBtn.addEventListener('click', broadcastFromWorker);
elements.spawnWorkerBtn.addEventListener('click', spawnWorker);
elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') broadcastFromMain();
});
elements.channelName.addEventListener('change', initChannel);

// Initialize
initChannel();
updateWorkersList();
