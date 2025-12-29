/**
 * #621 Barrier Synchronization
 * Coordinate workers at synchronization points
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let workerPhases = [];

const elements = {
    workerCount: document.getElementById('worker-count'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    currentPhase: document.getElementById('current-phase'),
    workersWaiting: document.getElementById('workers-waiting'),
    workerProgress: document.getElementById('worker-progress')
};

function startPhases() {
    const workerCount = parseInt(elements.workerCount.value);

    // Buffer: [0]=phase, [1]=waiting count, [2]=generation
    sharedBuffer = new SharedArrayBuffer(12);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, 0);
    Atomics.store(sharedArray, 1, 0);
    Atomics.store(sharedArray, 2, 0);

    workers.forEach(w => w.terminate());
    workers = [];
    workerPhases = new Array(workerCount).fill(0);

    updateWorkerProgress();

    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleMessage(i, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer, totalWorkers: workerCount }
        });
        workers.push(worker);
    }

    workers.forEach(w => w.postMessage({ type: 'start', data: { phases: 5 } }));
    elements.startBtn.disabled = true;
    updateDisplay();
}

function handleMessage(workerId, event) {
    const { type, data } = event.data;
    if (type === 'phase-complete') {
        workerPhases[workerId] = data.phase;
        updateWorkerProgress();
    } else if (type === 'all-complete') {
        elements.startBtn.disabled = false;
    }
}

function updateWorkerProgress() {
    elements.workerProgress.innerHTML = workerPhases.map((phase, i) => `
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
            <span style="width:80px;">Worker ${i}:</span>
            <div style="flex:1;display:flex;gap:5px;">
                ${[1,2,3,4,5].map(p => `
                    <div style="flex:1;height:30px;background:${phase >= p ? 'var(--success-color)' : 'var(--bg-secondary)'};border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:0.8rem;">P${p}</div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function updateDisplay() {
    if (!sharedArray) return;
    elements.currentPhase.textContent = Atomics.load(sharedArray, 0);
    elements.workersWaiting.textContent = Atomics.load(sharedArray, 1);
    if (elements.startBtn.disabled) requestAnimationFrame(updateDisplay);
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    workerPhases = [];
    elements.startBtn.disabled = false;
    elements.currentPhase.textContent = '0';
    elements.workersWaiting.textContent = '0';
    elements.workerProgress.innerHTML = '';
}

elements.startBtn.addEventListener('click', startPhases);
elements.resetBtn.addEventListener('click', reset);
