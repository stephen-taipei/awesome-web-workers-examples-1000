// Barrier Synchronization - Main Thread

const workerCountInput = document.getElementById('workerCount');
const phaseCountInput = document.getElementById('phaseCount');
const workVarianceInput = document.getElementById('workVariance');
const baseWorkInput = document.getElementById('baseWork');

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const barrierCanvas = document.getElementById('barrierCanvas');
const barrierCtx = barrierCanvas.getContext('2d');

const logContainer = document.getElementById('logContainer');
const resultContainer = document.getElementById('resultContainer');

const totalPhasesEl = document.getElementById('totalPhases');
const totalWorkersEl = document.getElementById('totalWorkers');
const execTimeEl = document.getElementById('execTime');
const avgPhaseTimeEl = document.getElementById('avgPhaseTime');
const avgWaitTimeEl = document.getElementById('avgWaitTime');
const maxWaitTimeEl = document.getElementById('maxWaitTime');
const totalWorkEl = document.getElementById('totalWork');
const efficiencyEl = document.getElementById('efficiency');

let workers = [];
let sharedBuffer = null;
let sharedArray = null;
let startTime = 0;
let animationId = null;
let totalPhases = 0;
let workerCount = 0;

// Stats tracking
let stats = {
    workerStates: {},
    workerPhases: {},
    phaseStartTimes: {},
    phaseTimes: [],
    waitTimes: [],
    workTimes: [],
    totalWork: 0
};

// SharedArrayBuffer layout:
// [0]: count (threads at barrier)
// [1]: phase (current phase number)
// [2]: total (total thread count)
// [3]: sense (toggling flag for reusable barrier)
// [4+]: per-worker data
const COUNT = 0;
const PHASE = 1;
const TOTAL = 2;
const SENSE = 3;
const WORKER_DATA_START = 4;

function initSharedMemory(workers, phases) {
    const totalInts = WORKER_DATA_START + workers * 2;
    sharedBuffer = new SharedArrayBuffer(totalInts * 4);
    sharedArray = new Int32Array(sharedBuffer);

    Atomics.store(sharedArray, COUNT, 0);
    Atomics.store(sharedArray, PHASE, 0);
    Atomics.store(sharedArray, TOTAL, workers);
    Atomics.store(sharedArray, SENSE, 0);

    for (let i = 0; i < workers * 2; i++) {
        Atomics.store(sharedArray, WORKER_DATA_START + i, 0);
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
    workerCount = parseInt(workerCountInput.value);
    totalPhases = parseInt(phaseCountInput.value);
    const workVariance = parseInt(workVarianceInput.value);
    const baseWork = parseInt(baseWorkInput.value);

    reset();
    initSharedMemory(workerCount, totalPhases);

    startBtn.disabled = true;
    resultContainer.classList.add('hidden');
    startTime = performance.now();

    stats = {
        workerStates: {},
        workerPhases: {},
        phaseStartTimes: { 0: startTime },
        phaseTimes: [],
        waitTimes: [],
        workTimes: [],
        totalWork: 0
    };

    addLog('system', 'System', `Starting barrier demo with ${workerCount} workers, ${totalPhases} phases`);

    let completedWorkers = 0;

    // Worker colors for visualization
    const colors = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c', '#22d3ee', '#e879f9'];

    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        const workerId = `Worker-${i + 1}`;
        stats.workerStates[workerId] = 'idle';
        stats.workerPhases[workerId] = 0;

        worker.onmessage = (e) => {
            handleWorkerMessage(e, workerId, i);

            if (e.data.type === 'complete') {
                completedWorkers++;
                if (completedWorkers === workerCount) {
                    finishDemo();
                }
            }
        };

        worker.postMessage({
            type: 'start',
            workerId,
            workerIndex: i,
            buffer: sharedBuffer,
            phases: totalPhases,
            baseWork,
            workVariance,
            color: colors[i % colors.length]
        });

        workers.push(worker);
    }

    startVisualization();
}

function handleWorkerMessage(e, workerId, workerIndex) {
    const data = e.data;

    switch (data.type) {
        case 'log':
            addLog(data.logType || 'worker', workerId, data.message);
            stats.workerStates[workerId] = data.state || 'active';
            break;

        case 'working':
            stats.workerStates[workerId] = 'working';
            break;

        case 'waiting':
            stats.workerStates[workerId] = 'waiting';
            break;

        case 'phaseComplete':
            stats.workerPhases[workerId] = data.phase + 1;
            stats.workTimes.push(data.workTime);
            stats.waitTimes.push(data.waitTime);
            stats.totalWork += data.workTime;

            // Record phase time if all workers completed this phase
            const currentPhase = Atomics.load(sharedArray, PHASE);
            if (!stats.phaseStartTimes[currentPhase]) {
                const prevPhaseStart = stats.phaseStartTimes[currentPhase - 1] || startTime;
                stats.phaseTimes.push(performance.now() - prevPhaseStart);
                stats.phaseStartTimes[currentPhase] = performance.now();
            }
            break;

        case 'barrierReached':
            addLog('barrier', workerId, `Reached barrier for phase ${data.phase + 1}`);
            break;

        case 'barrierReleased':
            addLog('barrier', workerId, `Released from barrier, starting phase ${data.phase + 1}`);
            break;

        case 'complete':
            stats.workerStates[workerId] = 'done';
            addLog('worker', workerId, `Completed all ${data.phases} phases`);
            break;
    }
}

function finishDemo() {
    cancelAnimationFrame(animationId);
    startBtn.disabled = false;

    const execTime = performance.now() - startTime;
    const avgPhaseTime = stats.phaseTimes.length > 0
        ? stats.phaseTimes.reduce((a, b) => a + b, 0) / stats.phaseTimes.length
        : 0;
    const avgWaitTime = stats.waitTimes.length > 0
        ? stats.waitTimes.reduce((a, b) => a + b, 0) / stats.waitTimes.length
        : 0;
    const maxWaitTime = stats.waitTimes.length > 0
        ? Math.max(...stats.waitTimes)
        : 0;

    // Efficiency = actual work time / total time
    const totalPossibleWork = execTime * workerCount;
    const efficiency = (stats.totalWork / totalPossibleWork) * 100;

    totalPhasesEl.textContent = totalPhases;
    totalWorkersEl.textContent = workerCount;
    execTimeEl.textContent = (execTime / 1000).toFixed(3) + 's';
    avgPhaseTimeEl.textContent = avgPhaseTime.toFixed(2) + 'ms';
    avgWaitTimeEl.textContent = avgWaitTime.toFixed(2) + 'ms';
    maxWaitTimeEl.textContent = maxWaitTime.toFixed(2) + 'ms';
    totalWorkEl.textContent = (stats.totalWork / 1000).toFixed(2) + 's';
    efficiencyEl.textContent = efficiency.toFixed(1) + '%';

    resultContainer.classList.remove('hidden');
    addLog('system', 'System', `Demo complete in ${(execTime / 1000).toFixed(3)}s`);

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
    const w = barrierCanvas.width;
    const h = barrierCanvas.height;
    const ctx = barrierCtx;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const currentPhase = sharedArray ? Atomics.load(sharedArray, PHASE) : 0;
    const atBarrier = sharedArray ? Atomics.load(sharedArray, COUNT) : 0;

    // Layout
    const leftMargin = 100;
    const rightMargin = 50;
    const topMargin = 60;
    const bottomMargin = 80;
    const trackWidth = w - leftMargin - rightMargin;
    const trackHeight = h - topMargin - bottomMargin;
    const workerHeight = trackHeight / workerCount;

    // Draw phase grid lines (barriers)
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    for (let p = 0; p <= totalPhases; p++) {
        const x = leftMargin + (p / totalPhases) * trackWidth;
        ctx.beginPath();
        ctx.moveTo(x, topMargin);
        ctx.lineTo(x, h - bottomMargin);
        ctx.stroke();

        // Phase label
        ctx.fillStyle = '#4a7a5a';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        if (p < totalPhases) {
            ctx.fillText(`Phase ${p + 1}`, x + trackWidth / totalPhases / 2, topMargin - 10);
        }
    }
    ctx.setLineDash([]);

    // Draw current barrier line
    if (currentPhase < totalPhases) {
        const barrierX = leftMargin + ((currentPhase + 1) / totalPhases) * trackWidth;
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(barrierX, topMargin);
        ctx.lineTo(barrierX, h - bottomMargin);
        ctx.stroke();

        // Barrier label
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`BARRIER`, barrierX, h - bottomMargin + 20);
        ctx.fillText(`${atBarrier}/${workerCount}`, barrierX, h - bottomMargin + 35);
    }

    // Worker colors
    const colors = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c', '#22d3ee', '#e879f9'];

    // Draw workers
    Object.entries(stats.workerStates).forEach(([name, state], i) => {
        const y = topMargin + i * workerHeight + workerHeight / 2;
        const workerPhase = stats.workerPhases[name] || 0;
        const color = colors[i % colors.length];

        // Worker label
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(name, leftMargin - 15, y + 4);

        // Draw track
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(w - rightMargin, y);
        ctx.stroke();

        // Draw progress
        const progress = Math.min(workerPhase / totalPhases, 1);
        const progressX = leftMargin + progress * trackWidth;

        // Progress line
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(progressX, y);
        ctx.stroke();

        // Worker marker
        const markerX = progressX;
        ctx.fillStyle = state === 'working' ? color :
                        state === 'waiting' ? '#fbbf24' :
                        state === 'done' ? '#34d399' : '#666';

        ctx.beginPath();
        ctx.arc(markerX, y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect for active workers
        if (state === 'working') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(markerX, y, 12, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Waiting indicator
        if (state === 'waiting') {
            ctx.fillStyle = '#fbbf24';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('waiting...', markerX + 15, y + 3);
        }
    });

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Phase Progress (Current: ${currentPhase + 1}/${totalPhases})`, leftMargin, 30);

    // Legend
    ctx.font = '9px sans-serif';
    const legendY = h - 20;
    const legendItems = [
        { color: '#60a5fa', label: 'Working' },
        { color: '#fbbf24', label: 'At Barrier' },
        { color: '#34d399', label: 'Complete' },
        { color: '#f472b6', label: 'Barrier Line' }
    ];

    let legendX = 20;
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(legendX, legendY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legendX + 10, legendY + 3);
        legendX += 90;
    });

    // Stats
    ctx.fillStyle = '#4a7a5a';
    ctx.textAlign = 'right';
    ctx.fillText(`Work done: ${(stats.totalWork / 1000).toFixed(2)}s`, w - 20, legendY);
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
        workerStates: {},
        workerPhases: {},
        phaseStartTimes: {},
        phaseTimes: [],
        waitTimes: [],
        workTimes: [],
        totalWork: 0
    };

    barrierCtx.fillStyle = '#080f08';
    barrierCtx.fillRect(0, 0, barrierCanvas.width, barrierCanvas.height);
    barrierCtx.fillStyle = '#4a7a5a';
    barrierCtx.font = '14px sans-serif';
    barrierCtx.textAlign = 'center';
    barrierCtx.fillText('Click "Start Barrier Demo" to begin', barrierCanvas.width / 2, barrierCanvas.height / 2);
}

startBtn.addEventListener('click', startDemo);
resetBtn.addEventListener('click', reset);

reset();
