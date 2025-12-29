/**
 * #605 Shared Worker Pattern
 * Cross-tab communication using SharedWorker
 */

let sharedWorker = null;
const tabId = Math.random().toString(36).substr(2, 9);

const elements = {
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    incrementBtn: document.getElementById('increment-btn'),
    getStateBtn: document.getElementById('get-state-btn'),
    stateDisplay: document.getElementById('state-display'),
    messages: document.getElementById('messages')
};

function initSharedWorker() {
    if (typeof SharedWorker === 'undefined') {
        elements.stateDisplay.innerHTML = `
            <div class="error-message">
                SharedWorker is not supported in this browser.
                Try Chrome, Firefox, or Edge.
            </div>
        `;
        return;
    }

    try {
        sharedWorker = new SharedWorker('worker.js');

        sharedWorker.port.onmessage = (e) => {
            const { type, data } = e.data;

            switch (type) {
                case 'state':
                    updateStateDisplay(data);
                    break;
                case 'broadcast':
                    addMessage(data.from, data.message);
                    break;
                case 'connected':
                    addMessage('System', `Connected as ${data.clientId} (${data.totalClients} total clients)`);
                    requestState();
                    break;
                case 'client-joined':
                    addMessage('System', `New client joined (${data.totalClients} total)`);
                    break;
                case 'client-left':
                    addMessage('System', `Client left (${data.totalClients} total)`);
                    break;
            }
        };

        sharedWorker.port.start();

        // Register this tab
        sharedWorker.port.postMessage({
            type: 'register',
            data: { tabId }
        });

    } catch (error) {
        elements.stateDisplay.innerHTML = `
            <div class="error-message">
                Error initializing SharedWorker: ${error.message}
            </div>
        `;
    }
}

function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;

    sharedWorker.port.postMessage({
        type: 'broadcast',
        data: { message, from: tabId }
    });

    elements.messageInput.value = '';
}

function incrementCounter() {
    sharedWorker.port.postMessage({
        type: 'increment'
    });
}

function requestState() {
    sharedWorker.port.postMessage({
        type: 'getState'
    });
}

function updateStateDisplay(state) {
    elements.stateDisplay.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Connected Clients:</span>
            <span class="stat-value">${state.clientCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Shared Counter:</span>
            <span class="stat-value">${state.counter}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Your Tab ID:</span>
            <span class="stat-value">${tabId}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Last Update:</span>
            <span class="stat-value">${new Date(state.lastUpdate).toLocaleTimeString()}</span>
        </div>
    `;
}

function addMessage(from, message) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px;border-bottom:1px solid var(--border-color);';
    div.innerHTML = `
        <span style="color:var(--primary-color);font-weight:bold;">[${from.substr(0, 6)}]</span>
        <span style="color:var(--text-secondary);">${message}</span>
        <span style="color:var(--text-muted);font-size:0.8rem;float:right;">${new Date().toLocaleTimeString()}</span>
    `;
    elements.messages.insertBefore(div, elements.messages.firstChild);

    // Limit messages
    while (elements.messages.children.length > 20) {
        elements.messages.removeChild(elements.messages.lastChild);
    }
}

// Event listeners
elements.sendBtn.addEventListener('click', sendMessage);
elements.incrementBtn.addEventListener('click', incrementCounter);
elements.getStateBtn.addEventListener('click', requestState);
elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Initialize
initSharedWorker();
