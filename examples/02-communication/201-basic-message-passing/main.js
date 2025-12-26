// DOM Elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const clearLogBtn = document.getElementById('clearLogBtn');
const logList = document.getElementById('logList');
const mainStatus = document.getElementById('mainStatus');
const workerStatus = document.getElementById('workerStatus');
const messageArrow = document.getElementById('messageArrow');
const sentCountDisplay = document.getElementById('sentCount');
const receivedCountDisplay = document.getElementById('receivedCount');
const avgLatencyDisplay = document.getElementById('avgLatency');

// Stats
let sentCount = 0;
let receivedCount = 0;
let totalLatency = 0;

// Create Worker
const worker = new Worker('worker.js');

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
clearLogBtn.addEventListener('click', clearLog);

document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const msg = btn.dataset.msg;
        sendQuickMessage(msg);
    });
});

// Worker message handler
worker.onmessage = function(e) {
    const data = e.data;

    // Calculate latency if timestamp exists
    if (data.sentTimestamp) {
        const latency = data.processedTimestamp - data.sentTimestamp;
        totalLatency += latency;
        receivedCount++;
        updateStats();
    } else {
        receivedCount++;
        updateStats();
    }

    // Animate message arrival
    animateMessage('from-worker', data.type);

    // Update worker status
    workerStatus.textContent = '回應中...';
    workerStatus.className = 'endpoint-status status-active';

    setTimeout(() => {
        workerStatus.textContent = '就緒';
        workerStatus.className = 'endpoint-status';
    }, 500);

    // Log the response
    addLog('received', data.type, data.result || JSON.stringify(data));
};

worker.onerror = function(e) {
    console.error('Worker error:', e);
    addLog('error', 'ERROR', e.message);
};

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    const data = {
        type: 'TEXT',
        payload: message,
        timestamp: Date.now()
    };

    worker.postMessage(data);
    sentCount++;
    updateStats();

    // Animate message sending
    animateMessage('to-worker', 'TEXT');

    // Update main thread status
    mainStatus.textContent = '發送中...';
    mainStatus.className = 'endpoint-status status-active';

    setTimeout(() => {
        mainStatus.textContent = '就緒';
        mainStatus.className = 'endpoint-status';
    }, 300);

    // Log the sent message
    addLog('sent', 'TEXT', message);
}

function sendQuickMessage(type) {
    const typeMap = {
        'ping': 'PING',
        'calculate': 'CALCULATE',
        'getTime': 'GET_TIME',
        'random': 'RANDOM'
    };

    const data = {
        type: typeMap[type] || type.toUpperCase(),
        payload: null,
        timestamp: Date.now()
    };

    worker.postMessage(data);
    sentCount++;
    updateStats();

    animateMessage('to-worker', data.type);

    mainStatus.textContent = '發送中...';
    mainStatus.className = 'endpoint-status status-active';

    setTimeout(() => {
        mainStatus.textContent = '就緒';
        mainStatus.className = 'endpoint-status';
    }, 300);

    addLog('sent', data.type, '(quick message)');
}

function animateMessage(direction, type) {
    const arrow = messageArrow;
    const arrowText = arrow.querySelector('.arrow-text');

    arrow.className = 'message-arrow ' + direction;
    arrowText.textContent = type;

    setTimeout(() => {
        arrow.className = 'message-arrow hidden';
    }, 600);
}

function addLog(direction, type, content) {
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString();

    let icon, className;
    if (direction === 'sent') {
        icon = '📤';
        className = 'log-sent';
    } else if (direction === 'received') {
        icon = '📥';
        className = 'log-received';
    } else {
        icon = '❌';
        className = 'log-error';
    }

    li.className = className;
    li.innerHTML = `
        <span class="log-icon">${icon}</span>
        <span class="log-time">[${time}]</span>
        <span class="log-type">${type}</span>
        <span class="log-content">${content}</span>
    `;

    logList.insertBefore(li, logList.firstChild);

    // Keep only recent logs
    while (logList.children.length > 50) {
        logList.removeChild(logList.lastChild);
    }
}

function clearLog() {
    logList.innerHTML = '';
    sentCount = 0;
    receivedCount = 0;
    totalLatency = 0;
    updateStats();
}

function updateStats() {
    sentCountDisplay.textContent = sentCount;
    receivedCountDisplay.textContent = receivedCount;

    const avgLatency = receivedCount > 0 ? (totalLatency / receivedCount).toFixed(1) : 0;
    avgLatencyDisplay.textContent = avgLatency + ' ms';
}
