// Condition Variable - Main Thread

const producerCountInput = document.getElementById('producerCount');
const consumerCountInput = document.getElementById('consumerCount');
const bufferSizeInput = document.getElementById('bufferSize');
const itemsPerProducerInput = document.getElementById('itemsPerProducer');
const produceDelayInput = document.getElementById('produceDelay');
const consumeDelayInput = document.getElementById('consumeDelay');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const bufferCanvas = document.getElementById('bufferCanvas');
const bufferCtx = bufferCanvas.getContext('2d');

const logContainer = document.getElementById('logContainer');
const resultContainer = document.getElementById('resultContainer');

const totalProducedEl = document.getElementById('totalProduced');
const totalConsumedEl = document.getElementById('totalConsumed');
const execTimeEl = document.getElementById('execTime');
const throughputEl = document.getElementById('throughput');
const avgProducerWaitEl = document.getElementById('avgProducerWait');
const avgConsumerWaitEl = document.getElementById('avgConsumerWait');
const bufferFullEventsEl = document.getElementById('bufferFullEvents');
const bufferEmptyEventsEl = document.getElementById('bufferEmptyEvents');

let workers = [];
let sharedBuffer = null;
let sharedArray = null;
let bufferSize = 5;
let startTime = 0;
let animationId = null;

// Stats tracking
let stats = {
    totalProduced: 0,
    totalConsumed: 0,
    producerWaitTimes: [],
    consumerWaitTimes: [],
    bufferFullEvents: 0,
    bufferEmptyEvents: 0,
    workerStates: {},
    bufferHistory: []
};

// SharedArrayBuffer layout:
// [0]: mutex (0=unlocked, 1=locked)
// [1]: notEmpty condition (for consumers to wait)
// [2]: notFull condition (for producers to wait)
// [3]: count (items in buffer)
// [4]: head (read index)
// [5]: tail (write index)
// [6]: total produced
// [7]: total consumed
// [8+]: buffer data
const MUTEX = 0;
const NOT_EMPTY = 1;
const NOT_FULL = 2;
const COUNT = 3;
const HEAD = 4;
const TAIL = 5;
const TOTAL_PRODUCED = 6;
const TOTAL_CONSUMED = 7;
const BUFFER_START = 8;

function initSharedMemory(size) {
    bufferSize = size;
    const totalInts = BUFFER_START + size;
    sharedBuffer = new SharedArrayBuffer(totalInts * 4);
    sharedArray = new Int32Array(sharedBuffer);

    // Initialize
    Atomics.store(sharedArray, MUTEX, 0);
    Atomics.store(sharedArray, NOT_EMPTY, 0);
    Atomics.store(sharedArray, NOT_FULL, 0);
    Atomics.store(sharedArray, COUNT, 0);
    Atomics.store(sharedArray, HEAD, 0);
    Atomics.store(sharedArray, TAIL, 0);
    Atomics.store(sharedArray, TOTAL_PRODUCED, 0);
    Atomics.store(sharedArray, TOTAL_CONSUMED, 0);

    // Clear buffer
    for (let i = 0; i < size; i++) {
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
    const producerCount = parseInt(producerCountInput.value);
    const consumerCount = parseInt(consumerCountInput.value);
    const size = parseInt(bufferSizeInput.value);
    const itemsPerProducer = parseInt(itemsPerProducerInput.value);
    const produceDelay = parseInt(produceDelayInput.value);
    const consumeDelay = parseInt(consumeDelayInput.value);

    reset();
    initSharedMemory(size);

    startBtn.disabled = true;
    resultContainer.classList.add('hidden');
    startTime = performance.now();

    stats = {
        totalProduced: 0,
        totalConsumed: 0,
        producerWaitTimes: [],
        consumerWaitTimes: [],
        bufferFullEvents: 0,
        bufferEmptyEvents: 0,
        workerStates: {},
        bufferHistory: []
    };

    const totalItems = producerCount * itemsPerProducer;
    addLog('system', 'System', `Starting with ${producerCount} producers, ${consumerCount} consumers, buffer size ${size}`);
    addLog('system', 'System', `Total items to produce: ${totalItems}`);

    let producersComplete = 0;
    let consumersComplete = 0;
    let allProduced = false;

    // Create producer workers
    for (let i = 0; i < producerCount; i++) {
        const worker = new Worker('worker.js');
        const workerId = `Producer-${i + 1}`;
        stats.workerStates[workerId] = 'idle';

        worker.onmessage = (e) => {
            handleWorkerMessage(e, workerId, 'producer');

            if (e.data.type === 'complete') {
                producersComplete++;
                if (producersComplete === producerCount) {
                    allProduced = true;
                    addLog('system', 'System', 'All producers completed');
                    // Signal consumers that production is done
                    workers.forEach(w => {
                        if (w.isConsumer) {
                            w.postMessage({ type: 'producersDone', totalItems });
                        }
                    });
                }
            }
        };

        worker.postMessage({
            type: 'producer',
            workerId,
            buffer: sharedBuffer,
            bufferSize: size,
            items: itemsPerProducer,
            delay: produceDelay,
            producerId: i + 1
        });

        workers.push(worker);
    }

    // Create consumer workers
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
            buffer: sharedBuffer,
            bufferSize: size,
            delay: consumeDelay,
            consumerId: i + 1
        });

        workers.push(worker);
    }

    startVisualization();
}

function handleWorkerMessage(e, workerId, workerType) {
    const data = e.data;

    switch (data.type) {
        case 'log':
            addLog(workerType, workerId, data.message);
            stats.workerStates[workerId] = data.state || 'active';
            break;

        case 'produced':
            stats.totalProduced++;
            stats.producerWaitTimes.push(data.waitTime);
            break;

        case 'consumed':
            stats.totalConsumed++;
            stats.consumerWaitTimes.push(data.waitTime);
            break;

        case 'bufferFull':
            stats.bufferFullEvents++;
            break;

        case 'bufferEmpty':
            stats.bufferEmptyEvents++;
            break;

        case 'bufferState':
            stats.bufferHistory.push({
                time: performance.now() - startTime,
                count: data.count
            });
            break;

        case 'complete':
            stats.workerStates[workerId] = 'done';
            addLog(workerType, workerId, `Completed - ${data.operations} operations`);
            break;
    }
}

function finishDemo() {
    cancelAnimationFrame(animationId);
    startBtn.disabled = false;

    const execTime = performance.now() - startTime;

    const avgProducerWait = stats.producerWaitTimes.length > 0
        ? stats.producerWaitTimes.reduce((a, b) => a + b, 0) / stats.producerWaitTimes.length
        : 0;
    const avgConsumerWait = stats.consumerWaitTimes.length > 0
        ? stats.consumerWaitTimes.reduce((a, b) => a + b, 0) / stats.consumerWaitTimes.length
        : 0;

    const throughput = stats.totalConsumed / (execTime / 1000);

    totalProducedEl.textContent = stats.totalProduced;
    totalConsumedEl.textContent = stats.totalConsumed;
    execTimeEl.textContent = (execTime / 1000).toFixed(3) + 's';
    throughputEl.textContent = throughput.toFixed(2) + '/s';
    avgProducerWaitEl.textContent = avgProducerWait.toFixed(2) + 'ms';
    avgConsumerWaitEl.textContent = avgConsumerWait.toFixed(2) + 'ms';
    bufferFullEventsEl.textContent = stats.bufferFullEvents;
    bufferEmptyEventsEl.textContent = stats.bufferEmptyEvents;

    resultContainer.classList.remove('hidden');
    addLog('system', 'System', `Demo complete. Produced: ${stats.totalProduced}, Consumed: ${stats.totalConsumed}`);

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
    const w = bufferCanvas.width;
    const h = bufferCanvas.height;
    const ctx = bufferCtx;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    // Get current state
    const count = sharedArray ? Atomics.load(sharedArray, COUNT) : 0;
    const head = sharedArray ? Atomics.load(sharedArray, HEAD) : 0;
    const tail = sharedArray ? Atomics.load(sharedArray, TAIL) : 0;

    // Draw buffer as circular queue
    const centerX = w / 2;
    const centerY = 150;
    const outerRadius = 100;
    const innerRadius = 50;

    // Draw buffer slots
    for (let i = 0; i < bufferSize; i++) {
        const angle = (i / bufferSize) * Math.PI * 2 - Math.PI / 2;
        const nextAngle = ((i + 1) / bufferSize) * Math.PI * 2 - Math.PI / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, angle, nextAngle);
        ctx.arc(centerX, centerY, innerRadius, nextAngle, angle, true);
        ctx.closePath();

        // Color based on state
        const isOccupied = sharedArray && Atomics.load(sharedArray, BUFFER_START + i) !== 0;
        const isHead = i === head && count > 0;
        const isTail = i === tail;

        if (isOccupied) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        }

        ctx.fill();
        ctx.strokeStyle = isHead ? '#60a5fa' : isTail ? '#f472b6' : '#2a5a3a';
        ctx.lineWidth = isHead || isTail ? 3 : 1;
        ctx.stroke();

        // Draw slot number and value
        const midAngle = (angle + nextAngle) / 2;
        const textRadius = (outerRadius + innerRadius) / 2;
        const textX = centerX + Math.cos(midAngle) * textRadius;
        const textY = centerY + Math.sin(midAngle) * textRadius;

        ctx.fillStyle = '#a7f3d0';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isOccupied) {
            const value = Atomics.load(sharedArray, BUFFER_START + i);
            ctx.fillText(value.toString(), textX, textY);
        }
    }

    // Center info
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${count}/${bufferSize}`, centerX, centerY - 5);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#4a7a5a';
    ctx.fillText('items', centerX, centerY + 10);

    // Draw head/tail indicators
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('HEAD (read)', centerX - 100, centerY + outerRadius + 25);
    ctx.fillStyle = '#f472b6';
    ctx.fillText('TAIL (write)', centerX + 100, centerY + outerRadius + 25);

    // Draw worker states
    const workers = Object.entries(stats.workerStates);
    const producers = workers.filter(([k]) => k.startsWith('Producer'));
    const consumers = workers.filter(([k]) => k.startsWith('Consumer'));

    // Producers on left
    ctx.font = 'bold 11px sans-serif';
    const producerStartY = 290;
    producers.forEach(([name, state], i) => {
        const x = 100;
        const y = producerStartY + i * 35;

        // Arrow to buffer
        if (state === 'producing') {
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 50, y);
            ctx.lineTo(centerX - outerRadius - 20, centerY);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(centerX - outerRadius - 20, centerY);
            ctx.lineTo(centerX - outerRadius - 30, centerY - 5);
            ctx.lineTo(centerX - outerRadius - 30, centerY + 5);
            ctx.closePath();
            ctx.fillStyle = '#f472b6';
            ctx.fill();
        }

        ctx.fillStyle = state === 'producing' ? 'rgba(244, 114, 182, 0.5)' :
                        state === 'waiting' ? 'rgba(251, 191, 36, 0.3)' :
                        state === 'done' ? 'rgba(52, 211, 153, 0.3)' :
                        'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x - 40, y - 12, 80, 24, 5);
        ctx.fill();

        ctx.fillStyle = state === 'producing' ? '#f472b6' :
                        state === 'waiting' ? '#fbbf24' :
                        state === 'done' ? '#34d399' : '#666';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y + 4);
    });

    // Consumers on right
    consumers.forEach(([name, state], i) => {
        const x = w - 100;
        const y = producerStartY + i * 35;

        // Arrow from buffer
        if (state === 'consuming') {
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX + outerRadius + 20, centerY);
            ctx.lineTo(x - 50, y);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(x - 50, y);
            ctx.lineTo(x - 60, y - 5);
            ctx.lineTo(x - 60, y + 5);
            ctx.closePath();
            ctx.fillStyle = '#60a5fa';
            ctx.fill();
        }

        ctx.fillStyle = state === 'consuming' ? 'rgba(96, 165, 250, 0.5)' :
                        state === 'waiting' ? 'rgba(251, 191, 36, 0.3)' :
                        state === 'done' ? 'rgba(52, 211, 153, 0.3)' :
                        'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x - 40, y - 12, 80, 24, 5);
        ctx.fill();

        ctx.fillStyle = state === 'consuming' ? '#60a5fa' :
                        state === 'waiting' ? '#fbbf24' :
                        state === 'done' ? '#34d399' : '#666';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y + 4);
    });

    // Labels
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.textAlign = 'center';
    ctx.fillText('PRODUCERS', 100, 275);

    ctx.fillStyle = '#60a5fa';
    ctx.fillText('CONSUMERS', w - 100, 275);

    // Stats at bottom
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#4a7a5a';
    ctx.textAlign = 'left';
    ctx.fillText(`Produced: ${stats.totalProduced}`, 20, h - 15);
    ctx.fillText(`Consumed: ${stats.totalConsumed}`, 120, h - 15);
    ctx.fillText(`Full events: ${stats.bufferFullEvents}`, 230, h - 15);
    ctx.fillText(`Empty events: ${stats.bufferEmptyEvents}`, 350, h - 15);
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
        totalProduced: 0,
        totalConsumed: 0,
        producerWaitTimes: [],
        consumerWaitTimes: [],
        bufferFullEvents: 0,
        bufferEmptyEvents: 0,
        workerStates: {},
        bufferHistory: []
    };

    bufferCtx.fillStyle = '#080f08';
    bufferCtx.fillRect(0, 0, bufferCanvas.width, bufferCanvas.height);
    bufferCtx.fillStyle = '#4a7a5a';
    bufferCtx.font = '14px sans-serif';
    bufferCtx.textAlign = 'center';
    bufferCtx.fillText('Click "Start Producer-Consumer" to begin', bufferCanvas.width / 2, bufferCanvas.height / 2);
}

startBtn.addEventListener('click', startDemo);
resetBtn.addEventListener('click', reset);

reset();
