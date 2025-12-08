// Peer-to-Peer Pattern - Main Thread

const peerCountSelect = document.getElementById('peerCount');
const algorithmSelect = document.getElementById('algorithm');
const dataSizeSelect = document.getElementById('dataSize');
const messageDelayInput = document.getElementById('messageDelay');
const algorithmDescription = document.getElementById('algorithmDescription');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const totalMessagesEl = document.getElementById('totalMessages');
const roundsEl = document.getElementById('rounds');
const execTimeEl = document.getElementById('execTime');
const consensusValueEl = document.getElementById('consensusValue');
const leaderEl = document.getElementById('leader');
const coverageEl = document.getElementById('coverage');
const convergenceEl = document.getElementById('convergence');
const peerStatesEl = document.getElementById('peerStates');

const logContainer = document.getElementById('logContainer');
const networkCanvas = document.getElementById('networkCanvas');
const ctx = networkCanvas.getContext('2d');

let workers = [];
let peerCount = 0;
let messageCount = 0;
let roundCount = 0;
let startTime = 0;
let peerStates = {};
let messageLog = [];
let animationQueue = [];
let isRunning = false;

const algorithms = {
    gossip: {
        name: 'Gossip Protocol',
        description: `Gossip Protocol - Information Dissemination
Each peer periodically selects random peers and shares its information.
Information spreads exponentially until all peers have the same data.
• Round 1: 1 peer knows → tells 2 peers
• Round 2: 3 peers know → each tells 2 more
• Round N: Information reaches all peers in O(log n) rounds`
    },
    consensus: {
        name: 'Distributed Consensus',
        description: `Distributed Consensus - Agreement Protocol
Peers iteratively average their values with neighbors until convergence.
Uses gossip-based averaging: new_value = (my_value + neighbor_value) / 2
All peers eventually converge to the same value (the global average).`
    },
    election: {
        name: 'Leader Election',
        description: `Leader Election - Bully Algorithm
Each peer has a unique ID. The peer with the highest ID becomes leader.
• Peers broadcast their IDs to all neighbors
• If a peer receives a higher ID, it forwards that ID
• The highest ID propagates through the network
• Peer with highest ID declares itself the leader`
    },
    aggregate: {
        name: 'Distributed Aggregation',
        description: `Distributed Aggregation - Parallel Computation
Data is distributed across peers. Each peer computes partial results.
Peers exchange and combine partial results using a reduce operation.
Final aggregated result (sum, max, min) is computed without central coordinator.`
    }
};

function updateAlgorithmDescription() {
    const algo = algorithmSelect.value;
    algorithmDescription.textContent = algorithms[algo].description;
}

function initNetwork() {
    peerCount = parseInt(peerCountSelect.value);
    messageCount = 0;
    roundCount = 0;
    peerStates = {};
    messageLog = [];
    animationQueue = [];
    logContainer.innerHTML = '';

    // Terminate existing workers
    workers.forEach(w => w.terminate());
    workers = [];

    // Create workers and establish peer connections
    const channels = [];

    // Create all workers first
    for (let i = 0; i < peerCount; i++) {
        const worker = new Worker('worker.js');
        workers.push(worker);
        peerStates[i] = { id: i, value: 0, status: 'initializing', connections: [] };
    }

    // Create MessageChannels for peer-to-peer communication
    // Full mesh: each pair of peers gets a channel
    for (let i = 0; i < peerCount; i++) {
        for (let j = i + 1; j < peerCount; j++) {
            const channel = new MessageChannel();
            channels.push({ from: i, to: j, channel });
        }
    }

    // Set up message handlers from workers to main thread
    workers.forEach((worker, idx) => {
        worker.onmessage = (e) => handleWorkerMessage(idx, e.data);
    });

    // Initialize each worker with its ID and peer ports
    workers.forEach((worker, idx) => {
        const peerPorts = [];
        const peerIds = [];

        channels.forEach(({ from, to, channel }) => {
            if (from === idx) {
                peerPorts.push(channel.port1);
                peerIds.push(to);
                peerStates[idx].connections.push(to);
            } else if (to === idx) {
                peerPorts.push(channel.port2);
                peerIds.push(from);
                peerStates[idx].connections.push(from);
            }
        });

        worker.postMessage({
            type: 'init',
            peerId: idx,
            peerIds: peerIds,
            totalPeers: peerCount
        }, peerPorts);
    });

    drawNetwork();
}

function handleWorkerMessage(peerId, data) {
    switch (data.type) {
        case 'ready':
            peerStates[peerId].status = 'ready';
            peerStates[peerId].value = data.initialValue;
            checkAllReady();
            break;

        case 'message_sent':
            messageCount++;
            addLogEntry(data.time, peerId, data.to, data.msgType);
            animateMessage(peerId, data.to);
            break;

        case 'state_update':
            peerStates[peerId].value = data.value;
            peerStates[peerId].status = data.status;
            if (data.isLeader) {
                peerStates[peerId].isLeader = true;
            }
            updateProgress();
            drawNetwork();
            break;

        case 'round_complete':
            roundCount = Math.max(roundCount, data.round);
            updateProgress();
            break;

        case 'complete':
            peerStates[peerId].status = 'complete';
            peerStates[peerId].value = data.finalValue;
            peerStates[peerId].isLeader = data.isLeader;
            checkAllComplete();
            break;
    }
}

function checkAllReady() {
    const allReady = Object.values(peerStates).every(p => p.status === 'ready');
    if (allReady && isRunning) {
        startAlgorithm();
    }
}

function startAlgorithm() {
    const algorithm = algorithmSelect.value;
    const dataSize = parseInt(dataSizeSelect.value);
    const messageDelay = parseInt(messageDelayInput.value);

    // Generate initial data based on algorithm
    workers.forEach((worker, idx) => {
        let initialData;

        switch (algorithm) {
            case 'gossip':
                // First peer has the "rumor", others don't
                initialData = idx === 0 ? generateData(dataSize) : null;
                break;
            case 'consensus':
                // Each peer has a random value
                initialData = Math.random() * 100;
                break;
            case 'election':
                // Each peer has a unique random ID
                initialData = Math.floor(Math.random() * 10000) + idx * 10000;
                break;
            case 'aggregate':
                // Each peer has a portion of the data
                initialData = generateData(Math.floor(dataSize / peerCount));
                break;
        }

        worker.postMessage({
            type: 'start',
            algorithm,
            data: initialData,
            messageDelay
        });
    });
}

function generateData(size) {
    const data = [];
    for (let i = 0; i < size; i++) {
        data.push(Math.floor(Math.random() * 1000));
    }
    return data;
}

function checkAllComplete() {
    const allComplete = Object.values(peerStates).every(p => p.status === 'complete');
    if (allComplete) {
        showResults();
    }
}

function showResults() {
    isRunning = false;
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const execTime = performance.now() - startTime;
    const algorithm = algorithmSelect.value;

    statusEl.textContent = 'Complete';
    statusEl.style.color = '#34d399';
    totalMessagesEl.textContent = messageCount;
    roundsEl.textContent = roundCount;
    execTimeEl.textContent = execTime.toFixed(0) + ' ms';

    // Algorithm-specific results
    switch (algorithm) {
        case 'gossip':
            const covered = Object.values(peerStates).filter(p => p.value !== null && p.value !== 0).length;
            coverageEl.textContent = `${covered}/${peerCount} (${(covered/peerCount*100).toFixed(0)}%)`;
            consensusValueEl.textContent = 'N/A';
            leaderEl.textContent = 'N/A';
            convergenceEl.textContent = covered === peerCount ? 'Yes' : 'Partial';
            break;

        case 'consensus':
            const values = Object.values(peerStates).map(p => p.value);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
            consensusValueEl.textContent = avg.toFixed(4);
            coverageEl.textContent = '100%';
            leaderEl.textContent = 'N/A';
            convergenceEl.textContent = variance < 0.01 ? 'Converged' : `Var: ${variance.toFixed(4)}`;
            break;

        case 'election':
            const leader = Object.values(peerStates).find(p => p.isLeader);
            leaderEl.textContent = leader ? `Peer ${leader.id}` : 'None';
            consensusValueEl.textContent = leader ? leader.value : 'N/A';
            coverageEl.textContent = '100%';
            convergenceEl.textContent = leader ? 'Elected' : 'Failed';
            break;

        case 'aggregate':
            const total = Object.values(peerStates).reduce((s, p) => s + (p.value || 0), 0);
            consensusValueEl.textContent = total.toFixed(0);
            coverageEl.textContent = '100%';
            leaderEl.textContent = 'N/A';
            convergenceEl.textContent = 'Aggregated';
            break;
    }

    renderPeerStates();
    drawNetwork();
}

function renderPeerStates() {
    let html = '';
    for (let i = 0; i < peerCount; i++) {
        const state = peerStates[i];
        const leaderClass = state.isLeader ? 'leader' : '';
        const activeClass = state.status === 'complete' ? 'active' : '';

        let valueDisplay;
        if (Array.isArray(state.value)) {
            valueDisplay = `[${state.value.length} items]`;
        } else if (typeof state.value === 'number') {
            valueDisplay = state.value.toFixed(2);
        } else {
            valueDisplay = state.value || 'null';
        }

        html += `
            <div class="peer-state ${activeClass} ${leaderClass}">
                <div class="peer-id">Peer ${i}</div>
                <div class="peer-value">${valueDisplay}</div>
                <div class="peer-status">${state.isLeader ? 'LEADER' : state.status}</div>
            </div>
        `;
    }
    peerStatesEl.innerHTML = html;
}

function updateProgress() {
    const progress = Math.min(100, (messageCount / (peerCount * peerCount)) * 50 + roundCount * 10);
    progressBar.style.width = progress + '%';
    progressText.textContent = `Round ${roundCount} | Messages: ${messageCount}`;
}

function addLogEntry(time, from, to, msgType) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="time">${time.toFixed(0)}ms</span>
        <span class="from">Peer ${from}</span>
        <span class="arrow">→</span>
        <span class="to">Peer ${to}</span>
        <span class="msg">${msgType}</span>
    `;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Limit log entries
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function drawNetwork() {
    const w = networkCanvas.width;
    const h = networkCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    // Calculate peer positions (circle layout)
    const positions = [];
    for (let i = 0; i < peerCount; i++) {
        const angle = (i / peerCount) * Math.PI * 2 - Math.PI / 2;
        positions.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        });
    }

    // Draw connections (mesh)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < peerCount; i++) {
        for (let j = i + 1; j < peerCount; j++) {
            ctx.beginPath();
            ctx.moveTo(positions[i].x, positions[i].y);
            ctx.lineTo(positions[j].x, positions[j].y);
            ctx.stroke();
        }
    }

    // Draw animated messages
    animationQueue = animationQueue.filter(anim => {
        const progress = (performance.now() - anim.startTime) / 500;
        if (progress >= 1) return false;

        const fromPos = positions[anim.from];
        const toPos = positions[anim.to];
        const x = fromPos.x + (toPos.x - fromPos.x) * progress;
        const y = fromPos.y + (toPos.y - fromPos.y) * progress;

        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        return true;
    });

    // Draw peers
    for (let i = 0; i < peerCount; i++) {
        const pos = positions[i];
        const state = peerStates[i] || {};

        // Peer circle
        let color = '#1a3a2a';
        if (state.isLeader) {
            color = '#fbbf24';
        } else if (state.status === 'complete') {
            color = '#10b981';
        } else if (state.status === 'ready') {
            color = '#059669';
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = state.isLeader ? '#fbbf24' : '#10b981';
        ctx.lineWidth = state.isLeader ? 3 : 2;
        ctx.stroke();

        // Peer label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${i}`, pos.x, pos.y);
    }

    // Legend
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'left';
    ctx.fillText('● Active  ● Leader  ● Idle', 10, h - 10);

    if (animationQueue.length > 0) {
        requestAnimationFrame(() => drawNetwork());
    }
}

function animateMessage(from, to) {
    animationQueue.push({
        from,
        to,
        startTime: performance.now()
    });
    if (animationQueue.length === 1) {
        requestAnimationFrame(() => drawNetwork());
    }
}

function start() {
    isRunning = true;
    startTime = performance.now();

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Initializing peers...';

    initNetwork();
}

function reset() {
    isRunning = false;
    workers.forEach(w => w.terminate());
    workers = [];
    peerStates = {};
    messageCount = 0;
    roundCount = 0;
    messageLog = [];
    animationQueue = [];

    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    logContainer.innerHTML = '';

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, networkCanvas.width, networkCanvas.height);
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Start P2P Network" to begin', networkCanvas.width / 2, networkCanvas.height / 2);
}

algorithmSelect.addEventListener('change', updateAlgorithmDescription);
startBtn.addEventListener('click', start);
resetBtn.addEventListener('click', reset);

updateAlgorithmDescription();
reset();
