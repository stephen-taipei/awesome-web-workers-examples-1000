// Message Priority - Main Thread

const messageContent = document.getElementById('messageContent');
const prioritySelect = document.getElementById('prioritySelect');
const taskComplexity = document.getElementById('taskComplexity');
const batchCount = document.getElementById('batchCount');

const addBtn = document.getElementById('addBtn');
const batchBtn = document.getElementById('batchBtn');
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');

const queueCount = document.getElementById('queueCount');
const queueContainer = document.getElementById('queueContainer');

const processedCount = document.getElementById('processedCount');
const avgWaitTime = document.getElementById('avgWaitTime');
const criticalCount = document.getElementById('criticalCount');
const lowDelayedCount = document.getElementById('lowDelayedCount');

const logContainer = document.getElementById('logContainer');

const canvas = document.getElementById('priorityCanvas');
const ctx = canvas.getContext('2d');

let worker = null;
let messageId = 0;
let processingHistory = [];

const priorityColors = {
    4: { bg: '#ef4444', label: 'CRITICAL' },
    3: { bg: '#f59e0b', label: 'HIGH' },
    2: { bg: '#3b82f6', label: 'NORMAL' },
    1: { bg: '#6b7280', label: 'LOW' }
};

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const data = e.data;

        switch (data.type) {
            case 'messageAdded':
                updateQueueDisplay(data.queueState);
                addLog(`Added: "${data.message.content}" [${priorityColors[data.message.priority].label}]`, 'info');
                break;

            case 'processingStarted':
                addLog('Processing started...', 'success');
                startBtn.disabled = true;
                break;

            case 'processingMessage':
                updateQueueDisplay(data.queueState);
                addLog(`Processing: "${data.message.content}" [${priorityColors[data.message.priority].label}] (waited ${data.waitTime.toFixed(0)}ms)`, 'processing');
                highlightProcessing(data.message);
                break;

            case 'messageProcessed':
                processingHistory.push({
                    priority: data.message.priority,
                    waitTime: data.waitTime,
                    processTime: data.processTime,
                    timestamp: Date.now()
                });
                updateStats(data.stats);
                drawVisualization();
                addLog(`Completed: "${data.message.content}" in ${data.processTime.toFixed(0)}ms`, 'success');
                break;

            case 'processingComplete':
                addLog('All messages processed!', 'complete');
                startBtn.disabled = false;
                break;

            case 'queueCleared':
                updateQueueDisplay([]);
                processingHistory = [];
                updateStats(data.stats);
                drawVisualization();
                addLog('Queue cleared', 'info');
                break;

            case 'queueState':
                updateQueueDisplay(data.queueState);
                updateStats(data.stats);
                break;
        }
    };
}

function updateQueueDisplay(queueState) {
    queueCount.textContent = queueState.length;

    if (queueState.length === 0) {
        queueContainer.innerHTML = '<p class="empty-message">No messages in queue</p>';
        return;
    }

    queueContainer.innerHTML = queueState.map((msg, idx) => `
        <div class="queue-item" data-id="${msg.id}" style="border-left-color: ${priorityColors[msg.priority].bg}">
            <div class="queue-item-header">
                <span class="priority-badge" style="background: ${priorityColors[msg.priority].bg}">
                    ${priorityColors[msg.priority].label}
                </span>
                <span class="queue-position">#${idx + 1}</span>
            </div>
            <div class="queue-item-content">${msg.content}</div>
            <div class="queue-item-meta">
                <span>Complexity: ${msg.complexity}ms</span>
                <span>ID: ${msg.id.slice(-8)}</span>
            </div>
        </div>
    `).join('');
}

function highlightProcessing(message) {
    const items = queueContainer.querySelectorAll('.queue-item');
    items.forEach(item => {
        if (item.dataset.id === message.id) {
            item.classList.add('processing');
        }
    });
}

function updateStats(stats) {
    processedCount.textContent = stats.processed;
    avgWaitTime.textContent = stats.avgWaitTime ? stats.avgWaitTime.toFixed(1) : '-';
    criticalCount.textContent = stats.criticalCount;
    lowDelayedCount.textContent = stats.lowDelayed;
}

function addLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
    logContainer.insertBefore(logEntry, logContainer.firstChild);

    // Keep only last 50 logs
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function addMessage() {
    const content = messageContent.value || `Task ${++messageId}`;
    const priority = parseInt(prioritySelect.value);
    const complexity = parseInt(taskComplexity.value);

    worker.postMessage({
        action: 'add',
        data: {
            content,
            priority,
            complexity
        }
    });
}

function generateBatch() {
    const count = parseInt(batchCount.value);
    const messages = [];

    for (let i = 0; i < count; i++) {
        const priority = Math.random() < 0.1 ? 4 :  // 10% critical
                        Math.random() < 0.3 ? 3 :   // 20% high
                        Math.random() < 0.7 ? 2 : 1; // 40% normal, 30% low

        messages.push({
            content: `Batch Task ${++messageId}`,
            priority,
            complexity: 200 + Math.floor(Math.random() * 800)
        });
    }

    worker.postMessage({
        action: 'addBatch',
        data: { messages }
    });

    addLog(`Generated ${count} random priority messages`, 'info');
}

function startProcessing() {
    worker.postMessage({ action: 'start' });
}

function clearAll() {
    worker.postMessage({ action: 'clear' });
    logContainer.innerHTML = '';
}

function drawVisualization() {
    const w = canvas.width, h = canvas.height;
    const padding = 50;
    const plotW = w - padding * 2;
    const plotH = h - padding * 2;

    // Clear canvas
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = '#1a2f1a';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
        const x = padding + (i / 10) * plotW;
        const y = padding + (i / 10) * plotH;

        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, h - padding);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(w - padding, y);
        ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Processing Order', w / 2, h - 10);
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Wait Time (ms)', 0, 0);
    ctx.restore();

    if (processingHistory.length === 0) {
        ctx.fillStyle = '#4a7a5a';
        ctx.font = '14px sans-serif';
        ctx.fillText('Start processing to see visualization', w / 2, h / 2);
        return;
    }

    // Calculate scales
    const maxWait = Math.max(...processingHistory.map(h => h.waitTime), 100);
    const barWidth = Math.min(30, plotW / processingHistory.length - 2);

    // Draw bars
    processingHistory.forEach((item, idx) => {
        const x = padding + (idx + 0.5) * (plotW / processingHistory.length) - barWidth / 2;
        const barH = (item.waitTime / maxWait) * plotH;
        const y = h - padding - barH;

        // Bar with priority color
        ctx.fillStyle = priorityColors[item.priority].bg;
        ctx.fillRect(x, y, barWidth, barH);

        // Bar outline
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barH);
    });

    // Legend
    ctx.font = '11px sans-serif';
    let legendX = padding;
    Object.entries(priorityColors).reverse().forEach(([priority, config]) => {
        ctx.fillStyle = config.bg;
        ctx.fillRect(legendX, 10, 15, 15);
        ctx.fillStyle = '#a7f3d0';
        ctx.textAlign = 'left';
        ctx.fillText(config.label, legendX + 20, 22);
        legendX += 90;
    });

    // Y-axis scale
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const val = Math.round((maxWait * i) / 4);
        const y = h - padding - (i / 4) * plotH;
        ctx.fillText(val.toString(), padding - 5, y + 3);
    }
}

// Event listeners
addBtn.addEventListener('click', addMessage);
batchBtn.addEventListener('click', generateBatch);
startBtn.addEventListener('click', startProcessing);
clearBtn.addEventListener('click', clearAll);

// Initialize
initWorker();
drawVisualization();
