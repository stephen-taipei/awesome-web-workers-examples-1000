// Message Routing - Main Thread Router

class MessageRouter {
    constructor() {
        this.rules = [];
        this.workers = new Map();
        this.roundRobinIndex = 0;
        this.stats = {
            totalSent: 0,
            totalRouted: 0,
            noMatch: 0,
            broadcasts: 0
        };
    }

    addRule(pattern, target, priority = 10) {
        const rule = {
            id: Date.now().toString(36),
            pattern,
            regex: this.patternToRegex(pattern),
            target,
            priority
        };
        this.rules.push(rule);
        this.rules.sort((a, b) => b.priority - a.priority);
        return rule;
    }

    removeRule(ruleId) {
        this.rules = this.rules.filter(r => r.id !== ruleId);
    }

    patternToRegex(pattern) {
        if (pattern.startsWith('/') && pattern.endsWith('/')) {
            return new RegExp(pattern.slice(1, -1));
        }
        // Convert glob-like pattern to regex
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`);
    }

    registerWorker(id, worker) {
        this.workers.set(id, worker);
    }

    route(topic, payload) {
        this.stats.totalSent++;
        const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
        const routedAt = performance.now();

        // Find matching rule
        const matchedRule = this.rules.find(rule => rule.regex.test(topic));

        if (!matchedRule) {
            this.stats.noMatch++;
            return { success: false, reason: 'no_match', messageId };
        }

        const message = {
            action: 'process',
            data: { messageId, topic, payload, routedAt }
        };

        const targets = this.resolveTarget(matchedRule.target);

        targets.forEach(targetId => {
            const worker = this.workers.get(targetId);
            if (worker) {
                worker.postMessage(message);
                this.stats.totalRouted++;
            }
        });

        if (matchedRule.target === 'broadcast') {
            this.stats.broadcasts++;
        }

        return {
            success: true,
            messageId,
            targets,
            rule: matchedRule
        };
    }

    resolveTarget(target) {
        if (target === 'broadcast') {
            return Array.from(this.workers.keys());
        }

        if (target === 'round-robin') {
            const workerIds = Array.from(this.workers.keys());
            const targetId = workerIds[this.roundRobinIndex % workerIds.length];
            this.roundRobinIndex++;
            return [targetId];
        }

        return [target];
    }

    getStats() {
        return { ...this.stats };
    }

    getRules() {
        return [...this.rules];
    }
}

// Initialize router and workers
const router = new MessageRouter();
const workerConfigs = [
    { id: 'worker-1', type: 'compute' },
    { id: 'worker-2', type: 'io' },
    { id: 'worker-3', type: 'analytics' }
];

const workerCounts = { 'worker-1': 0, 'worker-2': 0, 'worker-3': 0 };
const routingHistory = [];

// DOM Elements
const rulesContainer = document.getElementById('rulesContainer');
const rulePattern = document.getElementById('rulePattern');
const ruleTarget = document.getElementById('ruleTarget');
const rulePriority = document.getElementById('rulePriority');
const addRuleBtn = document.getElementById('addRuleBtn');

const messageTopic = document.getElementById('messageTopic');
const messagePayload = document.getElementById('messagePayload');
const sendBtn = document.getElementById('sendBtn');
const sendBatchBtn = document.getElementById('sendBatchBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');

const canvas = document.getElementById('routingCanvas');
const ctx = canvas.getContext('2d');

// Initialize workers
function initWorkers() {
    workerConfigs.forEach(config => {
        const worker = new Worker('worker.js');

        worker.onmessage = function(e) {
            const data = e.data;

            switch (data.type) {
                case 'initialized':
                    updateWorkerStatus(data.workerId, 'Idle', 'idle');
                    break;

                case 'processing':
                    updateWorkerStatus(data.workerId, 'Processing', 'active');
                    addWorkerLog(data.workerId, `Processing: ${data.topic}`);
                    highlightWorker(data.workerId);
                    break;

                case 'completed':
                    workerCounts[data.workerId] = data.processedCount;
                    updateWorkerCount(data.workerId, data.processedCount);
                    updateWorkerStatus(data.workerId, 'Idle', 'idle');
                    addWorkerLog(data.workerId, `Done: ${data.topic} (${data.processTime.toFixed(1)}ms)`);

                    routingHistory.push({
                        workerId: data.workerId,
                        topic: data.topic,
                        time: Date.now()
                    });

                    drawVisualization();
                    break;
            }
        };

        worker.postMessage({ action: 'init', data: config });
        router.registerWorker(config.id, worker);
    });
}

function updateWorkerStatus(workerId, text, className) {
    const statusEl = document.getElementById(`${workerId}-status`);
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.className = `status-indicator ${className}`;
    }
}

function updateWorkerCount(workerId, count) {
    const countEl = document.getElementById(`${workerId}-count`);
    if (countEl) {
        countEl.textContent = count;
    }
}

function addWorkerLog(workerId, message) {
    const logEl = document.getElementById(`${workerId}-log`);
    if (logEl) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = message;
        logEl.insertBefore(entry, logEl.firstChild);

        while (logEl.children.length > 5) {
            logEl.removeChild(logEl.lastChild);
        }
    }
}

function highlightWorker(workerId) {
    const card = document.getElementById(`${workerId}-card`);
    if (card) {
        card.classList.add('highlight');
        setTimeout(() => card.classList.remove('highlight'), 500);
    }
}

// Routing rules management
function renderRules() {
    const rules = router.getRules();

    if (rules.length === 0) {
        rulesContainer.innerHTML = '<p class="empty-message">No routing rules defined</p>';
        return;
    }

    rulesContainer.innerHTML = rules.map(rule => `
        <div class="rule-item">
            <div class="rule-info">
                <span class="rule-pattern">${rule.pattern}</span>
                <span class="rule-arrow">→</span>
                <span class="rule-target">${rule.target}</span>
                <span class="rule-priority">Priority: ${rule.priority}</span>
            </div>
            <button class="btn-remove" onclick="removeRule('${rule.id}')">×</button>
        </div>
    `).join('');
}

function addRule() {
    const pattern = rulePattern.value.trim();
    const target = ruleTarget.value;
    const priority = parseInt(rulePriority.value);

    if (!pattern) return;

    router.addRule(pattern, target, priority);
    renderRules();
    drawVisualization();

    rulePattern.value = '';
}

window.removeRule = function(ruleId) {
    router.removeRule(ruleId);
    renderRules();
    drawVisualization();
};

// Message sending
function sendMessage() {
    const topic = messageTopic.value.trim();
    let payload;

    try {
        payload = JSON.parse(messagePayload.value);
    } catch (e) {
        payload = { text: messagePayload.value };
    }

    const result = router.route(topic, payload);
    updateStats();

    if (!result.success) {
        alert(`Message not routed: ${result.reason}`);
    }
}

function sendBatch() {
    const topics = [
        'data.process', 'data.transform', 'user.login', 'user.update',
        'analytics.track', 'analytics.report', 'io.read', 'io.write',
        'system.health', 'system.metrics'
    ];

    for (let i = 0; i < 10; i++) {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const payload = { batch: true, index: i, timestamp: Date.now() };
        router.route(topic, payload);
    }

    updateStats();
}

function updateStats() {
    const stats = router.getStats();
    document.getElementById('totalSent').textContent = stats.totalSent;
    document.getElementById('totalRouted').textContent = stats.totalRouted;
    document.getElementById('noMatch').textContent = stats.noMatch;
    document.getElementById('broadcasts').textContent = stats.broadcasts;
}

function clearLogs() {
    workerConfigs.forEach(config => {
        const logEl = document.getElementById(`${config.id}-log`);
        if (logEl) logEl.innerHTML = '';
    });
}

// Visualization
function drawVisualization() {
    const w = canvas.width, h = canvas.height;
    const centerX = w / 2;
    const topY = 80;
    const bottomY = h - 100;

    // Clear
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, w, h);

    // Draw main thread (router)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(centerX, topY, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Router', centerX, topY + 4);

    // Draw workers
    const workerPositions = [
        { x: 150, y: bottomY },
        { x: centerX, y: bottomY },
        { x: w - 150, y: bottomY }
    ];

    const workerColors = ['#3b82f6', '#f59e0b', '#8b5cf6'];

    workerConfigs.forEach((config, idx) => {
        const pos = workerPositions[idx];
        const color = workerColors[idx];
        const count = workerCounts[config.id];

        // Worker circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
        ctx.fill();

        // Worker label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Worker ${idx + 1}`, pos.x, pos.y - 5);
        ctx.font = '10px sans-serif';
        ctx.fillText(config.type, pos.x, pos.y + 10);

        // Count badge
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(pos.x + 25, pos.y - 25, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(count.toString(), pos.x + 25, pos.y - 21);

        // Connection line
        ctx.strokeStyle = 'rgba(16,185,129,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(centerX, topY + 40);
        ctx.lineTo(pos.x, pos.y - 35);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Draw routing rules
    const rules = router.getRules();
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    const ruleStartY = 160;
    ctx.fillStyle = '#34d399';
    ctx.fillText('Routing Rules:', 20, ruleStartY);

    rules.slice(0, 5).forEach((rule, idx) => {
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText(`${rule.pattern} → ${rule.target}`, 20, ruleStartY + 20 + idx * 18);
    });

    if (rules.length > 5) {
        ctx.fillStyle = '#4a7a5a';
        ctx.fillText(`... and ${rules.length - 5} more`, 20, ruleStartY + 20 + 5 * 18);
    }

    // Draw recent routing activity
    const recentHistory = routingHistory.slice(-10);
    if (recentHistory.length > 0) {
        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'right';
        ctx.fillText('Recent Activity:', w - 20, ruleStartY);

        recentHistory.slice(-5).forEach((entry, idx) => {
            ctx.fillStyle = '#a7f3d0';
            ctx.fillText(`${entry.topic} → ${entry.workerId}`, w - 20, ruleStartY + 20 + idx * 18);
        });
    }

    // Animation for active routing
    drawActiveRoutes();
}

function drawActiveRoutes() {
    // Animate recent messages
    const now = Date.now();
    const activeRoutes = routingHistory.filter(r => now - r.time < 1000);

    activeRoutes.forEach(route => {
        const progress = (now - route.time) / 1000;
        const workerIdx = workerConfigs.findIndex(c => c.id === route.workerId);

        if (workerIdx >= 0) {
            const workerPositions = [
                { x: 150, y: canvas.height - 100 },
                { x: canvas.width / 2, y: canvas.height - 100 },
                { x: canvas.width - 150, y: canvas.height - 100 }
            ];

            const startX = canvas.width / 2;
            const startY = 120;
            const endX = workerPositions[workerIdx].x;
            const endY = workerPositions[workerIdx].y - 35;

            const x = startX + (endX - startX) * progress;
            const y = startY + (endY - startY) * progress;

            ctx.fillStyle = `rgba(16, 185, 129, ${1 - progress})`;
            ctx.beginPath();
            ctx.arc(x, y, 8 * (1 - progress) + 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    if (activeRoutes.length > 0) {
        requestAnimationFrame(() => drawVisualization());
    }
}

// Default rules
function addDefaultRules() {
    router.addRule('data.*', 'worker-1', 20);
    router.addRule('user.*', 'worker-2', 15);
    router.addRule('analytics.*', 'worker-3', 15);
    router.addRule('io.*', 'worker-2', 10);
    router.addRule('system.*', 'broadcast', 5);
    renderRules();
}

// Event listeners
addRuleBtn.addEventListener('click', addRule);
sendBtn.addEventListener('click', sendMessage);
sendBatchBtn.addEventListener('click', sendBatch);
clearLogsBtn.addEventListener('click', clearLogs);

// Initialize
initWorkers();
addDefaultRules();
drawVisualization();
