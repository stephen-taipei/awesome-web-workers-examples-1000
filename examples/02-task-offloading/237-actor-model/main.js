// Actor Model - Main Thread (Actor System Supervisor)

const scenarioSelect = document.getElementById('scenario');
const actorCountSelect = document.getElementById('actorCount');
const messageCountSelect = document.getElementById('messageCount');
const processingTimeInput = document.getElementById('processingTime');
const scenarioDescription = document.getElementById('scenarioDescription');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const processedCountEl = document.getElementById('processedCount');
const totalActorsEl = document.getElementById('totalActors');
const execTimeEl = document.getElementById('execTime');
const avgResponseTimeEl = document.getElementById('avgResponseTime');
const maxMailboxEl = document.getElementById('maxMailbox');
const errorsEl = document.getElementById('errors');
const throughputEl = document.getElementById('throughput');
const actorStatesEl = document.getElementById('actorStates');

const logContainer = document.getElementById('logContainer');
const actorCanvas = document.getElementById('actorCanvas');
const ctx = actorCanvas.getContext('2d');

let actors = {};
let actorWorkers = {};
let messagesSent = 0;
let messagesProcessed = 0;
let errorCount = 0;
let startTime = 0;
let isRunning = false;
let responseTimes = [];
let maxMailboxSize = 0;
let pendingResponses = {};
let animationMessages = [];

const scenarios = {
    bank: {
        name: 'Bank Account Transfers',
        description: `Bank Account Simulation
Each actor represents a bank account with a balance.
Actors send money transfer requests to each other.
• Credit: Add money to account
• Debit: Remove money from account
• Transfer: Move money between accounts
Demonstrates: Request-Reply pattern, state management`
    },
    counter: {
        name: 'Distributed Counters',
        description: `Distributed Counter System
Each actor maintains a local counter.
Actors can increment, decrement, and query counters.
• Increment: Add 1 to counter
• Decrement: Subtract 1 from counter
• Broadcast: Tell all actors to increment
Demonstrates: Fire-and-forget, scatter-gather`
    },
    pipeline: {
        name: 'Processing Pipeline',
        description: `Data Processing Pipeline
Actors form a linear processing chain.
Data flows through stages: Parse → Validate → Transform → Store
• Each stage processes and passes to next
• Results flow back through the chain
Demonstrates: Pipeline pattern, stage processing`
    },
    supervisor: {
        name: 'Supervisor Hierarchy',
        description: `Supervisor-Worker Hierarchy
One supervisor actor manages worker actors.
Workers may randomly fail; supervisor restarts them.
• Supervisor monitors worker health
• Failed workers are restarted
• Work is redistributed on failure
Demonstrates: Supervision trees, fault tolerance`
    }
};

function updateScenarioDescription() {
    const scenario = scenarioSelect.value;
    scenarioDescription.textContent = scenarios[scenario].description;
}

function createActor(id, type, initialState) {
    const worker = new Worker('worker.js');

    worker.onmessage = (e) => handleActorMessage(id, e.data);
    worker.onerror = (e) => handleActorError(id, e);

    actorWorkers[id] = worker;
    actors[id] = {
        id,
        type,
        state: initialState,
        status: 'initializing',
        mailboxSize: 0,
        messagesProcessed: 0
    };

    worker.postMessage({
        type: 'init',
        actorId: id,
        actorType: type,
        initialState,
        processingTime: parseInt(processingTimeInput.value)
    });

    return id;
}

function sendMessage(fromId, toId, message, expectReply = false) {
    if (!actorWorkers[toId]) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (expectReply) {
        pendingResponses[messageId] = {
            from: fromId,
            sentAt: performance.now()
        };
    }

    actorWorkers[toId].postMessage({
        type: 'message',
        messageId,
        from: fromId,
        payload: message,
        expectReply
    });

    messagesSent++;
    actors[toId].mailboxSize++;
    maxMailboxSize = Math.max(maxMailboxSize, actors[toId].mailboxSize);

    addLogEntry(performance.now() - startTime, fromId, toId, message.action || message.type);
    animateMessage(fromId, toId);
    updateProgress();
}

function handleActorMessage(actorId, data) {
    switch (data.type) {
        case 'ready':
            actors[actorId].status = 'idle';
            actors[actorId].state = data.state;
            checkAllReady();
            break;

        case 'processing':
            actors[actorId].status = 'processing';
            actors[actorId].mailboxSize = data.mailboxSize;
            drawActors();
            break;

        case 'processed':
            actors[actorId].status = 'idle';
            actors[actorId].state = data.state;
            actors[actorId].mailboxSize = data.mailboxSize;
            actors[actorId].messagesProcessed++;
            messagesProcessed++;

            if (data.replyTo && pendingResponses[data.messageId]) {
                const pending = pendingResponses[data.messageId];
                responseTimes.push(performance.now() - pending.sentAt);
                delete pendingResponses[data.messageId];
            }

            updateProgress();
            drawActors();
            checkComplete();
            break;

        case 'send_message':
            // Actor wants to send a message to another actor
            sendMessage(actorId, data.to, data.payload, data.expectReply);
            break;

        case 'error':
            actors[actorId].status = 'error';
            errorCount++;
            addLogEntry(performance.now() - startTime, actorId, '-', `ERROR: ${data.error}`, true);

            // If supervisor scenario, handle restart
            if (scenarioSelect.value === 'supervisor' && actors['supervisor']) {
                sendMessage('system', 'supervisor', {
                    action: 'worker_failed',
                    workerId: actorId
                });
            }
            break;

        case 'restarted':
            actors[actorId].status = 'idle';
            actors[actorId].state = data.state;
            addLogEntry(performance.now() - startTime, 'system', actorId, 'RESTARTED');
            drawActors();
            break;
    }
}

function handleActorError(actorId, error) {
    console.error(`Actor ${actorId} error:`, error);
    actors[actorId].status = 'error';
    errorCount++;
}

function checkAllReady() {
    const allReady = Object.values(actors).every(a => a.status !== 'initializing');
    if (allReady && isRunning) {
        startScenario();
    }
}

function startScenario() {
    const scenario = scenarioSelect.value;
    const messageCount = parseInt(messageCountSelect.value);

    switch (scenario) {
        case 'bank':
            runBankScenario(messageCount);
            break;
        case 'counter':
            runCounterScenario(messageCount);
            break;
        case 'pipeline':
            runPipelineScenario(messageCount);
            break;
        case 'supervisor':
            runSupervisorScenario(messageCount);
            break;
    }
}

function runBankScenario(messageCount) {
    const actorIds = Object.keys(actors);

    // Send random transfers between accounts
    for (let i = 0; i < messageCount; i++) {
        setTimeout(() => {
            const from = actorIds[Math.floor(Math.random() * actorIds.length)];
            let to = actorIds[Math.floor(Math.random() * actorIds.length)];
            while (to === from) {
                to = actorIds[Math.floor(Math.random() * actorIds.length)];
            }

            const amount = Math.floor(Math.random() * 50) + 10;
            sendMessage(from, to, { action: 'transfer', amount, replyTo: from }, true);
        }, i * 50);
    }
}

function runCounterScenario(messageCount) {
    const actorIds = Object.keys(actors);

    for (let i = 0; i < messageCount; i++) {
        setTimeout(() => {
            const target = actorIds[Math.floor(Math.random() * actorIds.length)];
            const action = Math.random() > 0.3 ? 'increment' : 'decrement';
            sendMessage('system', target, { action });
        }, i * 30);
    }
}

function runPipelineScenario(messageCount) {
    // Send data through the pipeline
    for (let i = 0; i < messageCount; i++) {
        setTimeout(() => {
            const data = {
                id: i,
                value: Math.random() * 100,
                timestamp: Date.now()
            };
            sendMessage('system', 'stage_0', { action: 'process', data });
        }, i * 100);
    }
}

function runSupervisorScenario(messageCount) {
    const workerIds = Object.keys(actors).filter(id => id.startsWith('worker_'));

    for (let i = 0; i < messageCount; i++) {
        setTimeout(() => {
            const worker = workerIds[Math.floor(Math.random() * workerIds.length)];
            const shouldFail = Math.random() < 0.1; // 10% chance of failure

            sendMessage('supervisor', worker, {
                action: 'work',
                task: { id: i, data: Math.random() * 100 },
                shouldFail
            });
        }, i * 60);
    }
}

function checkComplete() {
    const targetMessages = parseInt(messageCountSelect.value);
    if (messagesProcessed >= targetMessages) {
        // Give a bit more time for final messages
        setTimeout(() => {
            if (isRunning) {
                showResults();
            }
        }, 500);
    }
}

function showResults() {
    isRunning = false;
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const execTime = performance.now() - startTime;
    const avgResponse = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    statusEl.textContent = 'Complete';
    statusEl.style.color = '#34d399';
    processedCountEl.textContent = messagesProcessed;
    totalActorsEl.textContent = Object.keys(actors).length;
    execTimeEl.textContent = execTime.toFixed(0) + ' ms';
    avgResponseTimeEl.textContent = avgResponse.toFixed(1) + ' ms';
    maxMailboxEl.textContent = maxMailboxSize;
    errorsEl.textContent = errorCount;
    errorsEl.style.color = errorCount > 0 ? '#ef4444' : '#34d399';
    throughputEl.textContent = (messagesProcessed / (execTime / 1000)).toFixed(1) + ' msg/s';

    renderActorStates();
    drawActors();
}

function renderActorStates() {
    let html = '';
    for (const [id, actor] of Object.entries(actors)) {
        const statusClass = actor.status === 'error' ? 'error' :
                           actor.status === 'processing' ? 'processing' : 'idle';

        let stateDisplay;
        if (typeof actor.state === 'object') {
            stateDisplay = JSON.stringify(actor.state).slice(0, 30);
        } else {
            stateDisplay = actor.state;
        }

        html += `
            <div class="actor-state ${statusClass}">
                <div class="actor-name">${id}</div>
                <div class="actor-value">${stateDisplay}</div>
                <div class="actor-mailbox">Processed: ${actor.messagesProcessed}</div>
                <div class="actor-status">${actor.status}</div>
            </div>
        `;
    }
    actorStatesEl.innerHTML = html;
}

function updateProgress() {
    const target = parseInt(messageCountSelect.value);
    const progress = Math.min(100, (messagesProcessed / target) * 100);
    progressBar.style.width = progress + '%';
    progressText.textContent = `Processed: ${messagesProcessed}/${target} | Sent: ${messagesSent}`;
}

function addLogEntry(time, from, to, action, isError = false) {
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (isError ? ' error' : '');
    entry.innerHTML = `
        <span class="time">${time.toFixed(0)}ms</span>
        <span class="from">${from}</span>
        <span class="arrow">→</span>
        <span class="to">${to}</span>
        <span class="msg">${action}</span>
    `;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function drawActors() {
    const w = actorCanvas.width;
    const h = actorCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const actorList = Object.values(actors);
    const positions = {};

    // Layout based on scenario
    const scenario = scenarioSelect.value;

    if (scenario === 'pipeline') {
        // Linear layout for pipeline
        const spacing = w / (actorList.length + 1);
        actorList.forEach((actor, idx) => {
            positions[actor.id] = {
                x: spacing * (idx + 1),
                y: cy
            };
        });

        // Draw pipeline arrows
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < actorList.length - 1; i++) {
            const from = positions[actorList[i].id];
            const to = positions[actorList[i + 1].id];
            ctx.beginPath();
            ctx.moveTo(from.x + 30, from.y);
            ctx.lineTo(to.x - 30, to.y);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(to.x - 35, to.y - 5);
            ctx.lineTo(to.x - 30, to.y);
            ctx.lineTo(to.x - 35, to.y + 5);
            ctx.stroke();
        }
    } else if (scenario === 'supervisor') {
        // Hierarchical layout
        const workers = actorList.filter(a => a.id.startsWith('worker_'));
        const supervisor = actorList.find(a => a.id === 'supervisor');

        if (supervisor) {
            positions[supervisor.id] = { x: cx, y: 80 };
        }

        const workerSpacing = w / (workers.length + 1);
        workers.forEach((actor, idx) => {
            positions[actor.id] = {
                x: workerSpacing * (idx + 1),
                y: h - 100
            };
        });

        // Draw supervision lines
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        workers.forEach(worker => {
            if (supervisor && positions[worker.id]) {
                ctx.beginPath();
                ctx.moveTo(positions[supervisor.id].x, positions[supervisor.id].y + 25);
                ctx.lineTo(positions[worker.id].x, positions[worker.id].y - 25);
                ctx.stroke();
            }
        });
        ctx.setLineDash([]);
    } else {
        // Circle layout for other scenarios
        const radius = Math.min(w, h) * 0.3;
        actorList.forEach((actor, idx) => {
            const angle = (idx / actorList.length) * Math.PI * 2 - Math.PI / 2;
            positions[actor.id] = {
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius
            };
        });
    }

    // Draw animated messages
    animationMessages = animationMessages.filter(anim => {
        const progress = (performance.now() - anim.startTime) / 400;
        if (progress >= 1) return false;

        const fromPos = positions[anim.from] || { x: cx, y: 50 };
        const toPos = positions[anim.to];
        if (!toPos) return false;

        const x = fromPos.x + (toPos.x - fromPos.x) * progress;
        const y = fromPos.y + (toPos.y - fromPos.y) * progress;

        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        return true;
    });

    // Draw actors
    for (const actor of actorList) {
        const pos = positions[actor.id];
        if (!pos) continue;

        // Actor circle
        let color = '#1a3a2a';
        let borderColor = '#10b981';

        if (actor.status === 'error') {
            color = '#3a1a1a';
            borderColor = '#ef4444';
        } else if (actor.status === 'processing') {
            color = '#3a1a3a';
            borderColor = '#f472b6';
        } else if (actor.status === 'idle') {
            color = '#1a3a2a';
            borderColor = '#10b981';
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Actor label
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = actor.id.length > 8 ? actor.id.slice(0, 8) : actor.id;
        ctx.fillText(label, pos.x, pos.y - 5);

        // State indicator
        ctx.font = '9px monospace';
        ctx.fillStyle = '#a7f3d0';
        const stateText = typeof actor.state === 'object'
            ? (actor.state.balance !== undefined ? `$${actor.state.balance}` : '...')
            : actor.state;
        ctx.fillText(stateText, pos.x, pos.y + 8);

        // Mailbox indicator
        if (actor.mailboxSize > 0) {
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(pos.x + 20, pos.y - 20, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(actor.mailboxSize, pos.x + 20, pos.y - 20);
        }
    }

    if (animationMessages.length > 0) {
        requestAnimationFrame(() => drawActors());
    }
}

function animateMessage(from, to) {
    animationMessages.push({
        from,
        to,
        startTime: performance.now()
    });
    if (animationMessages.length === 1) {
        requestAnimationFrame(() => drawActors());
    }
}

function start() {
    isRunning = true;
    startTime = performance.now();
    messagesSent = 0;
    messagesProcessed = 0;
    errorCount = 0;
    responseTimes = [];
    maxMailboxSize = 0;
    pendingResponses = {};
    animationMessages = [];
    actors = {};
    logContainer.innerHTML = '';

    // Terminate existing workers
    Object.values(actorWorkers).forEach(w => w.terminate());
    actorWorkers = {};

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Initializing actors...';

    const actorCount = parseInt(actorCountSelect.value);
    const scenario = scenarioSelect.value;

    // Create actors based on scenario
    switch (scenario) {
        case 'bank':
            for (let i = 0; i < actorCount; i++) {
                createActor(`account_${i}`, 'bank', { balance: 1000 });
            }
            break;

        case 'counter':
            for (let i = 0; i < actorCount; i++) {
                createActor(`counter_${i}`, 'counter', { count: 0 });
            }
            break;

        case 'pipeline':
            const stages = ['parse', 'validate', 'transform', 'store'];
            for (let i = 0; i < Math.min(actorCount, stages.length); i++) {
                const nextStage = i < stages.length - 1 ? `stage_${i + 1}` : null;
                createActor(`stage_${i}`, 'pipeline', {
                    stageName: stages[i],
                    nextStage,
                    processed: 0
                });
            }
            break;

        case 'supervisor':
            createActor('supervisor', 'supervisor', { restarts: 0 });
            for (let i = 0; i < actorCount - 1; i++) {
                createActor(`worker_${i}`, 'worker', { tasksCompleted: 0 });
            }
            break;
    }

    drawActors();
}

function reset() {
    isRunning = false;
    Object.values(actorWorkers).forEach(w => w.terminate());
    actorWorkers = {};
    actors = {};
    messagesSent = 0;
    messagesProcessed = 0;
    animationMessages = [];

    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    logContainer.innerHTML = '';

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, actorCanvas.width, actorCanvas.height);
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Start Simulation" to begin', actorCanvas.width / 2, actorCanvas.height / 2);
}

scenarioSelect.addEventListener('change', updateScenarioDescription);
startBtn.addEventListener('click', start);
resetBtn.addEventListener('click', reset);

updateScenarioDescription();
reset();
