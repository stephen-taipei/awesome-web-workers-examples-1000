// Message Queue with Ring Buffer - Main Thread

const bufferSizeInput = document.getElementById('bufferSize');
const producerCountInput = document.getElementById('producerCount');
const consumerCountInput = document.getElementById('consumerCount');
const messageCountInput = document.getElementById('messageCount');
const produceRateInput = document.getElementById('produceRate');
const consumeRateInput = document.getElementById('consumeRate');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const queueCanvas = document.getElementById('queueCanvas');
const queueCtx = queueCanvas.getContext('2d');

const logContainer = document.getElementById('logContainer');
const resultContainer = document.getElementById('resultContainer');

const totalSentEl = document.getElementById('totalSent');
const totalReceivedEl = document.getElementById('totalReceived');
const execTimeEl = document.getElementById('execTime');
const throughputEl = document.getElementById('throughput');
const avgQueueLenEl = document.getElementById('avgQueueLen');
const maxQueueLenEl = document.getElementById('maxQueueLen');
const avgLatencyEl = document.getElementById('avgLatency');
const queueFullEventsEl = document.getElementById('queueFullEvents');

let workers = [];
let sharedBuffer = null;
let sharedArray = null;
let bufferSize = 32;
let startTime = 0;
let animationId = null;

// Stats
let stats = {
    totalSent: 0,
    totalReceived: 0,
    queueLengths: [],
    maxQueueLen: 0,
    latencies: [],
    queueFullEvents: 0,
    workerStates: {},
    recentMessages: []
};

// SharedArrayBuffer layout:
// [0]: read position
// [1]: write position
// [2]: size (capacity)
// [3]: mutex for MPMC
// [4]: total sent counter
// [5]: total received counter
// [6+]: message buffer (each message: timestamp, producerId, value)
const READ_POS = 0;
const WRITE_POS = 1;
const SIZE = 2;
const MUTEX = 3;
const TOTAL_SENT = 4;
const TOTAL_RECEIVED = 5;
const BUFFER_START = 6;
const MSG_SIZE = 3; // ints per message

function initSharedMemory(size) {
    bufferSize = size;
    const totalInts = BUFFER_START + size * MSG_SIZE;
    sharedBuffer = new SharedArrayBuffer(totalInts * 4);
    sharedArray = new Int32Array(sharedBuffer);

    Atomics.store(sharedArray, READ_POS, 0);
    Atomics.store(sharedArray, WRITE_POS, 0);
    Atomics.store(sharedArray, SIZE, size);
    Atomics.store(sharedArray, MUTEX, 0);
    Atomics.store(sharedArray, TOTAL_SENT, 0);
    Atomics.store(sharedArray, TOTAL_RECEIVED, 0);

    // Clear buffer
    for (let i = 0; i < size * MSG_SIZE; i++) {
        Atomics.store(sharedArray, BUFFER_START + i, 0);
    }
}

function addLog(type, worker, message) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">${elapsed}s</span><span class="log-worker">${worker}</span><span>${message}</span>`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function startDemo() {
    const size = parseInt(bufferSizeInput.value);
    const producerCount = parseInt(producerCountInput.value);
    const consumerCount = parseInt(consumerCountInput.value);
    const messageCount = parseInt(messageCountInput.value);
    const produceRate = parseInt(produceRateInput.value);
    const consumeRate = parseInt(consumeRateInput.value);

    reset();
    initSharedMemory(size);

    startBtn.disabled = true;
    resultContainer.classList.add('hidden');
    startTime = performance.now();

    stats = {
        totalSent: 0,
        totalReceived: 0,
        queueLengths: [],
        maxQueueLen: 0,
        latencies: [],
        queueFullEvents: 0,
        workerStates: {},
        recentMessages: []
    };

    const totalMessages = producerCount * messageCount;
    addLog('system', 'System', `Starting queue with ${producerCount} producers, ${consumerCount} consumers`);
    addLog('system', 'System', `Buffer size: ${size}, Total messages: ${totalMessages}`);

    let producersComplete = 0;
    let consumersComplete = 0;

    // Create producers
    for (let i = 0; i < producerCount; i++) {
        const worker = new Worker('worker.js');
        const workerId = `Producer-${i + 1}`;
        stats.workerStates[workerId] = 'idle';

        worker.onmessage = (e) => {
            handleWorkerMessage(e, workerId, 'producer');

            if (e.data.type === 'complete') {
                producersComplete++;
                if (producersComplete === producerCount) {
                    addLog('system', 'System', 'All producers completed');
                    // Notify consumers
                    workers.forEach(w => {
                        if (w.isConsumer) {
                            w.postMessage({ type: 'producersDone', totalMessages });
                        }
                    });
                }
            }
        };

        worker.postMessage({
            type: 'producer',
            workerId,
            producerId: i + 1,
            buffer: sharedBuffer,
            messageCount,
            rate: produceRate
        });

        workers.push(worker);
    }

    // Create consumers
    for (let i = 0; i < consumerCount; i++) {
        const worker = new Worker('worker.js');
        const workerId = `Consumer-${i + 1}`;
        stats.workerStates[workerId] = 'idle';
        worker.isConsumer = true;

        worker.onmessage = (e) => {
            handleWorkerMessage(e, workerId, 'consumer');

            if (e.data.type === 'complete') {
                consumersComplete++;
                if (consumersComplete === consumerCount) {
                    finishDemo();
                }
            }
        };

        worker.postMessage({
            type: 'consumer',
            workerId,
            consumerId: i + 1,
            buffer: sharedBuffer,
            rate: consumeRate
        });

        workers.push(worker);
    }

    startVisualization();
}

function handleWorkerMessage(e, workerId, workerType) {
    const data = e.data;

    switch (data.type) {
        case 'log':
            if (stats.totalSent < 20 || stats.totalSent % 20 === 0) {
                addLog(workerType, workerId, data.message);
            }
            stats.workerStates[workerId] = data.state || 'active';
            break;

        case 'sent':
            stats.totalSent++;
            stats.recentMessages.push({
                type: 'sent',
                time: performance.now() - startTime,
                producer: data.producerId
            });
            if (stats.recentMessages.length > 50) stats.recentMessages.shift();
            break;

        case 'received':
            stats.totalReceived++;
            if (data.latency) {
                stats.latencies.push(data.latency);
            }
            stats.recentMessages.push({
                type: 'received',
                time: performance.now() - startTime,
                consumer: data.consumerId
            });
            if (stats.recentMessages.length > 50) stats.recentMessages.shift();
            break;

        case 'queueState':
            stats.queueLengths.push(data.length);
            if (data.length > stats.maxQueueLen) {
                stats.maxQueueLen = data.length;
            }
            break;

        case 'queueFull':
            stats.queueFullEvents++;
            break;

        case 'complete':
            stats.workerStates[workerId] = 'done';
            addLog(workerType, workerId, `Completed - ${data.count} messages`);
            break;
    }
}

function finishDemo() {
    cancelAnimationFrame(animationId);
    startBtn.disabled = false;

    const execTime = performance.now() - startTime;
    const throughput = stats.totalReceived / (execTime / 1000);
    const avgQueueLen = stats.queueLengths.length > 0
        ? stats.queueLengths.reduce((a, b) => a + b, 0) / stats.queueLengths.length
        : 0;
    const avgLatency = stats.latencies.length > 0
        ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
        : 0;

    totalSentEl.textContent = stats.totalSent;
    totalReceivedEl.textContent = stats.totalReceived;
    execTimeEl.textContent = (execTime / 1000).toFixed(3) + 's';
    throughputEl.textContent = throughput.toFixed(1) + '/s';
    avgQueueLenEl.textContent = avgQueueLen.toFixed(2);
    maxQueueLenEl.textContent = stats.maxQueueLen;
    avgLatencyEl.textContent = avgLatency.toFixed(2) + 'ms';
    queueFullEventsEl.textContent = stats.queueFullEvents;

    resultContainer.classList.remove('hidden');
    addLog('system', 'System', `Demo complete. Sent: ${stats.totalSent}, Received: ${stats.totalReceived}`);

    drawVisualization();
}

function startVisualization() {
    function animate() {
        drawVisualization();
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

function drawVisualization() {
    const w = queueCanvas.width;
    const h = queueCanvas.height;
    const ctx = queueCtx;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    // Get queue state
    const readPos = sharedArray ? Atomics.load(sharedArray, READ_POS) : 0;
    const writePos = sharedArray ? Atomics.load(sharedArray, WRITE_POS) : 0;
    const queueLen = writePos - readPos;

    // Draw ring buffer
    const centerX = w / 2;
    const centerY = 160;
    const outerRadius = 110;
    const innerRadius = 60;

    // Draw slots
    for (let i = 0; i < bufferSize; i++) {
        const angle = (i / bufferSize) * Math.PI * 2 - Math.PI / 2;
        const nextAngle = ((i + 1) / bufferSize) * Math.PI * 2 - Math.PI / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, angle, nextAngle);
        ctx.arc(centerX, centerY, innerRadius, nextAngle, angle, true);
        ctx.closePath();

        // Check if slot has data
        const slotIndex = i;
        const hasData = (readPos <= (readPos + slotIndex)) && ((readPos + slotIndex) < writePos) &&
                        (slotIndex === (readPos % bufferSize + (writePos - readPos - 1) - slotIndex >= 0 ? slotIndex : -1));

        // Simpler check: is this slot between read and write?
        const actualRead = readPos % bufferSize;
        const actualWrite = writePos % bufferSize;

        let isOccupied = false;
        if (queueLen > 0) {
            if (actualRead < actualWrite) {
                isOccupied = i >= actualRead && i < actualWrite;
            } else {
                isOccupied = i >= actualRead || i < actualWrite;
            }
        }

        if (isOccupied) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        }

        ctx.fill();

        const isReadPos = i === (readPos % bufferSize);
        const isWritePos = i === (writePos % bufferSize);

        ctx.strokeStyle = isReadPos ? '#60a5fa' : isWritePos ? '#f472b6' : '#2a5a3a';
        ctx.lineWidth = isReadPos || isWritePos ? 3 : 1;
        ctx.stroke();

        // Slot index
        const midAngle = (angle + nextAngle) / 2;
        const textRadius = (outerRadius + innerRadius) / 2;
        const textX = centerX + Math.cos(midAngle) * textRadius;
        const textY = centerY + Math.sin(midAngle) * textRadius;

        ctx.fillStyle = isOccupied ? '#fff' : '#4a7a5a';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), textX, textY);
    }

    // Center info
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${queueLen}`, centerX, centerY - 5);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#4a7a5a';
    ctx.fillText(`/ ${bufferSize}`, centerX, centerY + 12);

    // Read/Write pointers
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`READ: ${readPos % bufferSize}`, centerX - 80, centerY + outerRadius + 25);
    ctx.fillStyle = '#f472b6';
    ctx.fillText(`WRITE: ${writePos % bufferSize}`, centerX + 80, centerY + outerRadius + 25);

    // Draw workers
    const producers = Object.entries(stats.workerStates).filter(([k]) => k.startsWith('Producer'));
    const consumers = Object.entries(stats.workerStates).filter(([k]) => k.startsWith('Consumer'));

    // Producers on left
    ctx.font = 'bold 10px sans-serif';
    const workerStartY = 300;

    producers.forEach(([name, state], i) => {
        const x = 80;
        const y = workerStartY + i * 30;

        // Arrow to queue
        if (state === 'sending') {
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 45, y);
            ctx.lineTo(centerX - outerRadius - 10, centerY + 30);
            ctx.stroke();
        }

        ctx.fillStyle = state === 'sending' ? 'rgba(244, 114, 182, 0.5)' :
                        state === 'waiting' ? 'rgba(251, 191, 36, 0.3)' :
                        state === 'done' ? 'rgba(52, 211, 153, 0.3)' :
                        'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x - 35, y - 10, 70, 20, 4);
        ctx.fill();

        ctx.fillStyle = state === 'sending' ? '#f472b6' :
                        state === 'waiting' ? '#fbbf24' :
                        state === 'done' ? '#34d399' : '#666';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y + 4);
    });

    // Consumers on right
    consumers.forEach(([name, state], i) => {
        const x = w - 80;
        const y = workerStartY + i * 30;

        // Arrow from queue
        if (state === 'receiving') {
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX + outerRadius + 10, centerY + 30);
            ctx.lineTo(x - 45, y);
            ctx.stroke();
        }

        ctx.fillStyle = state === 'receiving' ? 'rgba(96, 165, 250, 0.5)' :
                        state === 'waiting' ? 'rgba(251, 191, 36, 0.3)' :
                        state === 'done' ? 'rgba(52, 211, 153, 0.3)' :
                        'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x - 35, y - 10, 70, 20, 4);
        ctx.fill();

        ctx.fillStyle = state === 'receiving' ? '#60a5fa' :
                        state === 'waiting' ? '#fbbf24' :
                        state === 'done' ? '#34d399' : '#666';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y + 4);
    });

    // Labels
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.textAlign = 'center';
    ctx.fillText('PRODUCERS', 80, 285);

    ctx.fillStyle = '#60a5fa';
    ctx.fillText('CONSUMERS', w - 80, 285);

    // Stats
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#4a7a5a';
    ctx.textAlign = 'left';
    ctx.fillText(`Sent: ${stats.totalSent}`, 20, h - 15);
    ctx.fillText(`Received: ${stats.totalReceived}`, 100, h - 15);
    ctx.fillText(`Full events: ${stats.queueFullEvents}`, 200, h - 15);

    // Throughput graph (mini)
    if (stats.queueLengths.length > 1) {
        const graphX = 400;
        const graphY = h - 60;
        const graphW = 280;
        const graphH = 40;

        ctx.strokeStyle = '#2a5a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(graphX, graphY, graphW, graphH);

        ctx.fillStyle = '#4a7a5a';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Queue length over time', graphX, graphY - 5);

        // Draw line
        const samples = stats.queueLengths.slice(-100);
        if (samples.length > 1) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let i = 0; i < samples.length; i++) {
                const x = graphX + (i / (samples.length - 1)) * graphW;
                const y = graphY + graphH - (samples[i] / bufferSize) * graphH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    sharedBuffer = null;
    sharedArray = null;
    startBtn.disabled = false;
    resultContainer.classList.add('hidden');
    logContainer.innerHTML = '';

    stats = {
        totalSent: 0,
        totalReceived: 0,
        queueLengths: [],
        maxQueueLen: 0,
        latencies: [],
        queueFullEvents: 0,
        workerStates: {},
        recentMessages: []
    };

    queueCtx.fillStyle = '#080f08';
    queueCtx.fillRect(0, 0, queueCanvas.width, queueCanvas.height);
    queueCtx.fillStyle = '#4a7a5a';
    queueCtx.font = '14px sans-serif';
    queueCtx.textAlign = 'center';
    queueCtx.fillText('Click "Start Message Queue" to begin', queueCanvas.width / 2, queueCanvas.height / 2);
}

startBtn.addEventListener('click', startDemo);
resetBtn.addEventListener('click', reset);

reset();
