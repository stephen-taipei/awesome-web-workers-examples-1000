// CSP Model - Main Thread (Channel Manager)

const patternSelect = document.getElementById('pattern');
const channelTypeSelect = document.getElementById('channelType');
const bufferSizeInput = document.getElementById('bufferSize');
const messageCountSelect = document.getElementById('messageCount');
const patternDescription = document.getElementById('patternDescription');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const sentCountEl = document.getElementById('sentCount');
const recvCountEl = document.getElementById('recvCount');
const execTimeEl = document.getElementById('execTime');
const avgLatencyEl = document.getElementById('avgLatency');
const maxBufferEl = document.getElementById('maxBuffer');
const blockedOpsEl = document.getElementById('blockedOps');
const throughputEl = document.getElementById('throughput');
const processStatesEl = document.getElementById('processStates');

const logContainer = document.getElementById('logContainer');
const cspCanvas = document.getElementById('cspCanvas');
const ctx = cspCanvas.getContext('2d');

// State
let processes = {};
let channels = {};
let workers = {};
let startTime = 0;
let isRunning = false;
let totalSent = 0;
let totalReceived = 0;
let blockedCount = 0;
let latencies = [];
let maxBufferUsage = 0;
let animations = [];
let pendingSends = {};

const patterns = {
    pipeline: {
        name: 'Pipeline',
        description: `Pipeline Pattern
Data flows through a series of processing stages.
Each stage transforms the data and passes it to the next.

Producer → [ch1] → Stage1 → [ch2] → Stage2 → [ch3] → Consumer

Each channel connects exactly two processes.
Demonstrates sequential data transformation.`
    },
    fanout: {
        name: 'Fan-Out',
        description: `Fan-Out Pattern
One producer sends to multiple consumers.
Work is distributed across parallel workers.

                 ┌→ [ch1] → Worker1
Producer ────────┼→ [ch2] → Worker2
                 └→ [ch3] → Worker3

Load balancing: each message goes to one worker.
Demonstrates work distribution.`
    },
    fanin: {
        name: 'Fan-In',
        description: `Fan-In Pattern
Multiple producers send to one consumer.
Results are collected from parallel workers.

Producer1 → [ch1] ─┐
Producer2 → [ch2] ─┼→ Collector
Producer3 → [ch3] ─┘

The collector receives from any ready channel.
Demonstrates result aggregation.`
    },
    pingpong: {
        name: 'Ping-Pong',
        description: `Ping-Pong Pattern
Two processes exchange messages back and forth.
Each waits for the other before sending next.

Player1 ──[ping]──→ Player2
Player1 ←──[pong]── Player2

Synchronous communication: send blocks until received.
Demonstrates bidirectional communication.`
    }
};

function updatePatternDescription() {
    const pattern = patternSelect.value;
    patternDescription.textContent = patterns[pattern].description;
}

// Channel implementation (runs in main thread to coordinate)
class Channel {
    constructor(id, buffered = false, bufferSize = 0) {
        this.id = id;
        this.buffered = buffered;
        this.bufferSize = bufferSize;
        this.buffer = [];
        this.sendQueue = []; // Waiting senders
        this.recvQueue = []; // Waiting receivers
        this.closed = false;
    }

    canSend() {
        if (this.closed) return false;
        if (this.buffered) {
            return this.buffer.length < this.bufferSize || this.recvQueue.length > 0;
        }
        return this.recvQueue.length > 0;
    }

    canRecv() {
        if (this.buffered) {
            return this.buffer.length > 0 || this.sendQueue.length > 0;
        }
        return this.sendQueue.length > 0;
    }

    send(value, callback) {
        if (this.closed) {
            callback({ success: false, error: 'channel closed' });
            return;
        }

        if (this.buffered && this.buffer.length < this.bufferSize) {
            // Buffer has space
            this.buffer.push({ value, time: performance.now() });
            maxBufferUsage = Math.max(maxBufferUsage, this.buffer.length);
            callback({ success: true, blocked: false });
            this.tryMatch();
        } else if (this.recvQueue.length > 0) {
            // Receiver waiting
            const receiver = this.recvQueue.shift();
            receiver.callback({ success: true, value, blocked: false });
            callback({ success: true, blocked: false });
            latencies.push(performance.now() - receiver.time);
        } else {
            // Must wait
            this.sendQueue.push({ value, callback, time: performance.now() });
            blockedCount++;
        }
    }

    recv(callback) {
        if (this.buffered && this.buffer.length > 0) {
            // Get from buffer
            const item = this.buffer.shift();
            latencies.push(performance.now() - item.time);
            callback({ success: true, value: item.value, blocked: false });
            this.tryMatch();
        } else if (this.sendQueue.length > 0) {
            // Sender waiting
            const sender = this.sendQueue.shift();
            sender.callback({ success: true, blocked: true });
            latencies.push(performance.now() - sender.time);
            callback({ success: true, value: sender.value, blocked: false });
        } else if (this.closed) {
            callback({ success: false, error: 'channel closed' });
        } else {
            // Must wait
            this.recvQueue.push({ callback, time: performance.now() });
            blockedCount++;
        }
    }

    tryMatch() {
        // Try to match buffered senders with receivers
        while (this.sendQueue.length > 0 && this.buffer.length < this.bufferSize) {
            const sender = this.sendQueue.shift();
            this.buffer.push({ value: sender.value, time: performance.now() });
            maxBufferUsage = Math.max(maxBufferUsage, this.buffer.length);
            sender.callback({ success: true, blocked: true });
        }

        while (this.recvQueue.length > 0 && this.buffer.length > 0) {
            const receiver = this.recvQueue.shift();
            const item = this.buffer.shift();
            latencies.push(performance.now() - item.time);
            receiver.callback({ success: true, value: item.value, blocked: true });
        }
    }

    close() {
        this.closed = true;
        // Notify waiting receivers
        while (this.recvQueue.length > 0) {
            const receiver = this.recvQueue.shift();
            receiver.callback({ success: false, error: 'channel closed' });
        }
    }
}

function createProcess(id, type) {
    const worker = new Worker('worker.js');

    worker.onmessage = (e) => handleProcessMessage(id, e.data);

    workers[id] = worker;
    processes[id] = {
        id,
        type,
        status: 'initializing',
        sent: 0,
        received: 0
    };

    return id;
}

function handleProcessMessage(processId, data) {
    switch (data.type) {
        case 'ready':
            processes[processId].status = 'idle';
            checkAllReady();
            break;

        case 'send':
            processes[processId].status = 'sending';
            const sendChannel = channels[data.channel];
            if (sendChannel) {
                pendingSends[data.msgId] = { processId, time: performance.now() };

                sendChannel.send(data.value, (result) => {
                    workers[processId].postMessage({
                        type: 'send_result',
                        msgId: data.msgId,
                        ...result
                    });

                    if (result.success) {
                        processes[processId].sent++;
                        totalSent++;
                        addLogEntry(performance.now() - startTime, processId, 'SEND', data.channel, data.value, result.blocked);
                        animateChannelOp(processId, data.channel, 'send');
                    }

                    processes[processId].status = 'idle';
                    updateProgress();
                    draw();
                });
            }
            break;

        case 'recv':
            processes[processId].status = 'receiving';
            const recvChannel = channels[data.channel];
            if (recvChannel) {
                recvChannel.recv((result) => {
                    workers[processId].postMessage({
                        type: 'recv_result',
                        msgId: data.msgId,
                        ...result
                    });

                    if (result.success) {
                        processes[processId].received++;
                        totalReceived++;
                        addLogEntry(performance.now() - startTime, processId, 'RECV', data.channel, result.value, result.blocked);
                        animateChannelOp(data.channel, processId, 'recv');
                    }

                    processes[processId].status = 'idle';
                    updateProgress();
                    draw();
                });
            }
            break;

        case 'complete':
            processes[processId].status = 'complete';
            checkAllComplete();
            break;
    }

    draw();
}

function checkAllReady() {
    const allReady = Object.values(processes).every(p => p.status !== 'initializing');
    if (allReady && isRunning) {
        startPattern();
    }
}

function setupChannels() {
    const pattern = patternSelect.value;
    const buffered = channelTypeSelect.value === 'buffered';
    const bufferSize = parseInt(bufferSizeInput.value);

    channels = {};

    switch (pattern) {
        case 'pipeline':
            channels['ch1'] = new Channel('ch1', buffered, bufferSize);
            channels['ch2'] = new Channel('ch2', buffered, bufferSize);
            channels['ch3'] = new Channel('ch3', buffered, bufferSize);
            break;

        case 'fanout':
            channels['ch1'] = new Channel('ch1', buffered, bufferSize);
            channels['ch2'] = new Channel('ch2', buffered, bufferSize);
            channels['ch3'] = new Channel('ch3', buffered, bufferSize);
            break;

        case 'fanin':
            channels['ch1'] = new Channel('ch1', buffered, bufferSize);
            channels['ch2'] = new Channel('ch2', buffered, bufferSize);
            channels['ch3'] = new Channel('ch3', buffered, bufferSize);
            break;

        case 'pingpong':
            channels['ping'] = new Channel('ping', buffered, bufferSize);
            channels['pong'] = new Channel('pong', buffered, bufferSize);
            break;
    }
}

function setupProcesses() {
    const pattern = patternSelect.value;

    Object.values(workers).forEach(w => w.terminate());
    workers = {};
    processes = {};

    switch (pattern) {
        case 'pipeline':
            createProcess('producer', 'producer');
            createProcess('stage1', 'transformer');
            createProcess('stage2', 'transformer');
            createProcess('consumer', 'consumer');
            break;

        case 'fanout':
            createProcess('producer', 'producer');
            createProcess('worker1', 'consumer');
            createProcess('worker2', 'consumer');
            createProcess('worker3', 'consumer');
            break;

        case 'fanin':
            createProcess('producer1', 'producer');
            createProcess('producer2', 'producer');
            createProcess('producer3', 'producer');
            createProcess('collector', 'collector');
            break;

        case 'pingpong':
            createProcess('player1', 'pingpong');
            createProcess('player2', 'pingpong');
            break;
    }

    // Initialize workers
    const messageCount = parseInt(messageCountSelect.value);
    const channelIds = Object.keys(channels);

    for (const [id, worker] of Object.entries(workers)) {
        worker.postMessage({
            type: 'init',
            processId: id,
            processType: processes[id].type,
            channels: channelIds,
            messageCount,
            pattern: patternSelect.value
        });
    }
}

function startPattern() {
    const pattern = patternSelect.value;
    const messageCount = parseInt(messageCountSelect.value);

    for (const [id, worker] of Object.entries(workers)) {
        let config = {};

        switch (pattern) {
            case 'pipeline':
                if (id === 'producer') {
                    config = { sendChannel: 'ch1', count: messageCount };
                } else if (id === 'stage1') {
                    config = { recvChannel: 'ch1', sendChannel: 'ch2' };
                } else if (id === 'stage2') {
                    config = { recvChannel: 'ch2', sendChannel: 'ch3' };
                } else if (id === 'consumer') {
                    config = { recvChannel: 'ch3', count: messageCount };
                }
                break;

            case 'fanout':
                if (id === 'producer') {
                    config = { sendChannels: ['ch1', 'ch2', 'ch3'], count: messageCount };
                } else {
                    const workerNum = id.replace('worker', '');
                    config = { recvChannel: `ch${workerNum}` };
                }
                break;

            case 'fanin':
                if (id.startsWith('producer')) {
                    const prodNum = id.replace('producer', '');
                    config = { sendChannel: `ch${prodNum}`, count: Math.floor(messageCount / 3) };
                } else {
                    config = { recvChannels: ['ch1', 'ch2', 'ch3'], count: messageCount };
                }
                break;

            case 'pingpong':
                if (id === 'player1') {
                    config = { sendChannel: 'ping', recvChannel: 'pong', starter: true, count: messageCount };
                } else {
                    config = { sendChannel: 'pong', recvChannel: 'ping', starter: false };
                }
                break;
        }

        worker.postMessage({ type: 'start', config });
    }
}

function checkAllComplete() {
    const allComplete = Object.values(processes).every(p => p.status === 'complete');
    if (allComplete || totalReceived >= parseInt(messageCountSelect.value)) {
        setTimeout(() => {
            if (isRunning) showResults();
        }, 300);
    }
}

function showResults() {
    isRunning = false;
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const execTime = performance.now() - startTime;
    const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    statusEl.textContent = 'Complete';
    statusEl.style.color = '#34d399';
    sentCountEl.textContent = totalSent;
    recvCountEl.textContent = totalReceived;
    execTimeEl.textContent = execTime.toFixed(0) + ' ms';
    avgLatencyEl.textContent = avgLatency.toFixed(2) + ' ms';
    maxBufferEl.textContent = maxBufferUsage;
    blockedOpsEl.textContent = blockedCount;
    throughputEl.textContent = (totalReceived / (execTime / 1000)).toFixed(1) + ' msg/s';

    renderProcessStates();
    draw();
}

function renderProcessStates() {
    let html = '';
    for (const [id, process] of Object.entries(processes)) {
        const statusClass = process.status === 'sending' ? 'sending' :
                           process.status === 'receiving' ? 'receiving' :
                           process.status === 'blocked' ? 'blocked' : 'idle';

        html += `
            <div class="process-state ${statusClass}">
                <div class="process-name">${id}</div>
                <div class="process-sent">Sent: ${process.sent}</div>
                <div class="process-recv">Recv: ${process.received}</div>
                <div class="process-status">${process.status}</div>
            </div>
        `;
    }
    processStatesEl.innerHTML = html;
}

function updateProgress() {
    const target = parseInt(messageCountSelect.value);
    const progress = Math.min(100, (totalReceived / target) * 100);
    progressBar.style.width = progress + '%';
    progressText.textContent = `Sent: ${totalSent} | Received: ${totalReceived}/${target}`;
}

function addLogEntry(time, process, op, channel, value, blocked = false) {
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (blocked ? ' blocked' : '');

    const displayValue = typeof value === 'object' ? JSON.stringify(value).slice(0, 20) : value;

    entry.innerHTML = `
        <span class="time">${time.toFixed(0)}ms</span>
        <span class="process">${process}</span>
        <span class="op">${op}</span>
        <span class="channel">${channel}</span>
        <span class="value">${displayValue}</span>
    `;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function draw() {
    const w = cspCanvas.width;
    const h = cspCanvas.height;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const pattern = patternSelect.value;
    const processList = Object.values(processes);
    const channelList = Object.values(channels);

    // Calculate positions based on pattern
    const positions = {};
    const channelPositions = {};

    switch (pattern) {
        case 'pipeline':
            const pipeSpacing = w / 5;
            positions['producer'] = { x: pipeSpacing, y: h / 2 };
            positions['stage1'] = { x: pipeSpacing * 2, y: h / 2 };
            positions['stage2'] = { x: pipeSpacing * 3, y: h / 2 };
            positions['consumer'] = { x: pipeSpacing * 4, y: h / 2 };

            channelPositions['ch1'] = { x: pipeSpacing * 1.5, y: h / 2 };
            channelPositions['ch2'] = { x: pipeSpacing * 2.5, y: h / 2 };
            channelPositions['ch3'] = { x: pipeSpacing * 3.5, y: h / 2 };
            break;

        case 'fanout':
            positions['producer'] = { x: 100, y: h / 2 };
            positions['worker1'] = { x: w - 100, y: h / 4 };
            positions['worker2'] = { x: w - 100, y: h / 2 };
            positions['worker3'] = { x: w - 100, y: 3 * h / 4 };

            channelPositions['ch1'] = { x: w / 2, y: h / 4 };
            channelPositions['ch2'] = { x: w / 2, y: h / 2 };
            channelPositions['ch3'] = { x: w / 2, y: 3 * h / 4 };
            break;

        case 'fanin':
            positions['producer1'] = { x: 100, y: h / 4 };
            positions['producer2'] = { x: 100, y: h / 2 };
            positions['producer3'] = { x: 100, y: 3 * h / 4 };
            positions['collector'] = { x: w - 100, y: h / 2 };

            channelPositions['ch1'] = { x: w / 2, y: h / 4 };
            channelPositions['ch2'] = { x: w / 2, y: h / 2 };
            channelPositions['ch3'] = { x: w / 2, y: 3 * h / 4 };
            break;

        case 'pingpong':
            positions['player1'] = { x: w / 3, y: h / 2 };
            positions['player2'] = { x: 2 * w / 3, y: h / 2 };

            channelPositions['ping'] = { x: w / 2, y: h / 3 };
            channelPositions['pong'] = { x: w / 2, y: 2 * h / 3 };
            break;
    }

    // Draw channel connections
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 2;

    for (const [chId, chPos] of Object.entries(channelPositions)) {
        // Find connected processes
        for (const [pId, pPos] of Object.entries(positions)) {
            ctx.beginPath();
            ctx.moveTo(pPos.x, pPos.y);
            ctx.lineTo(chPos.x, chPos.y);
            ctx.stroke();
        }
    }

    // Draw channels
    for (const [chId, ch] of Object.entries(channels)) {
        const pos = channelPositions[chId];
        if (!pos) continue;

        const bufferFill = ch.buffered ? ch.buffer.length / ch.bufferSize : 0;

        // Channel box
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(pos.x - 25, pos.y - 15, 50, 30);

        // Buffer fill
        if (ch.buffered) {
            ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
            ctx.fillRect(pos.x - 25, pos.y - 15, 50 * bufferFill, 30);
        }

        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 25, pos.y - 15, 50, 30);

        // Channel label
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chId, pos.x, pos.y - 3);

        if (ch.buffered) {
            ctx.font = '8px sans-serif';
            ctx.fillStyle = '#a7f3d0';
            ctx.fillText(`${ch.buffer.length}/${ch.bufferSize}`, pos.x, pos.y + 8);
        }
    }

    // Draw animations
    animations = animations.filter(anim => {
        const progress = (performance.now() - anim.startTime) / 300;
        if (progress >= 1) return false;

        const fromPos = positions[anim.from] || channelPositions[anim.from];
        const toPos = positions[anim.to] || channelPositions[anim.to];
        if (!fromPos || !toPos) return false;

        const x = fromPos.x + (toPos.x - fromPos.x) * progress;
        const y = fromPos.y + (toPos.y - fromPos.y) * progress;

        ctx.fillStyle = anim.type === 'send' ? '#f472b6' : '#60a5fa';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        return true;
    });

    // Draw processes
    for (const process of processList) {
        const pos = positions[process.id];
        if (!pos) continue;

        let color = '#1a3a2a';
        let borderColor = '#10b981';

        if (process.status === 'sending') {
            color = '#3a1a2a';
            borderColor = '#f472b6';
        } else if (process.status === 'receiving') {
            color = '#1a2a3a';
            borderColor = '#60a5fa';
        } else if (process.status === 'blocked') {
            color = '#3a3a1a';
            borderColor = '#fbbf24';
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Process label
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = process.id.length > 10 ? process.id.slice(0, 10) : process.id;
        ctx.fillText(label, pos.x, pos.y - 5);

        // Stats
        ctx.font = '8px monospace';
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText(`S:${process.sent} R:${process.received}`, pos.x, pos.y + 10);
    }

    if (animations.length > 0) {
        requestAnimationFrame(() => draw());
    }
}

function animateChannelOp(from, to, type) {
    animations.push({
        from,
        to,
        type,
        startTime: performance.now()
    });
    if (animations.length === 1) {
        requestAnimationFrame(() => draw());
    }
}

function start() {
    isRunning = true;
    startTime = performance.now();
    totalSent = 0;
    totalReceived = 0;
    blockedCount = 0;
    latencies = [];
    maxBufferUsage = 0;
    animations = [];
    pendingSends = {};
    logContainer.innerHTML = '';

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Setting up channels...';

    setupChannels();
    setupProcesses();
    draw();
}

function reset() {
    isRunning = false;
    Object.values(workers).forEach(w => w.terminate());
    workers = {};
    processes = {};
    channels = {};
    animations = [];

    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    logContainer.innerHTML = '';

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, cspCanvas.width, cspCanvas.height);
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Start CSP Demo" to begin', cspCanvas.width / 2, cspCanvas.height / 2);
}

patternSelect.addEventListener('change', updatePatternDescription);
startBtn.addEventListener('click', start);
resetBtn.addEventListener('click', reset);

updatePatternDescription();
reset();
