/**
 * #618 Semaphore Pattern
 * Counting semaphore for resource limiting
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let running = false;
let permits = 0;
let workerStates = [];

const elements = {
    permits: document.getElementById('permits'),
    workers: document.getElementById('workers'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    availablePermits: document.getElementById('available-permits'),
    workersInResource: document.getElementById('workers-in-resource'),
    workersWaiting: document.getElementById('workers-waiting'),
    resourceSlots: document.getElementById('resource-slots'),
    workerStates: document.getElementById('worker-states')
};

function startSimulation() {
    if (typeof SharedArrayBuffer === 'undefined') {
        alert('SharedArrayBuffer not supported');
        return;
    }

    permits = parseInt(elements.permits.value);
    const workerCount = parseInt(elements.workers.value);

    // Buffer: [0] = semaphore count
    sharedBuffer = new SharedArrayBuffer(4);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, permits);

    // Cleanup
    workers.forEach(w => w.terminate());
    workers = [];
    workerStates = new Array(workerCount).fill('idle');
    running = true;

    updateUI();
    createResourceSlots();
    updateWorkerStatesDisplay();

    // Create workers
    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer, permits }
        });
        workers.push(worker);
    }

    // Start all workers
    workers.forEach(w => {
        w.postMessage({ type: 'start' });
    });

    // Update display
    updateDisplay();
}

function stopSimulation() {
    running = false;
    workers.forEach(w => w.terminate());
    workers = [];
    updateUI();
}

function handleWorkerMessage(workerId, event) {
    const { type, data } = event.data;

    switch (type) {
        case 'waiting':
            workerStates[workerId] = 'waiting';
            updateWorkerStatesDisplay();
            break;

        case 'acquired':
            workerStates[workerId] = 'using';
            updateWorkerStatesDisplay();
            updateResourceSlots();
            break;

        case 'released':
            workerStates[workerId] = 'idle';
            updateWorkerStatesDisplay();
            updateResourceSlots();

            // Continue if still running
            if (running) {
                setTimeout(() => {
                    if (running && workers[workerId]) {
                        workers[workerId].postMessage({ type: 'start' });
                    }
                }, 500 + Math.random() * 1000);
            }
            break;
    }
}

function createResourceSlots() {
    let html = '';
    for (let i = 0; i < permits; i++) {
        html += `<div id="slot-${i}" style="width:80px;height:80px;border-radius:8px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid var(--border-color);">Empty</div>`;
    }
    elements.resourceSlots.innerHTML = html;
}

function updateResourceSlots() {
    const using = workerStates.map((s, i) => s === 'using' ? i : -1).filter(i => i >= 0);

    for (let i = 0; i < permits; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (i < using.length) {
            slot.style.background = 'var(--success-color)';
            slot.style.color = 'white';
            slot.textContent = `W${using[i]}`;
        } else {
            slot.style.background = 'var(--bg-secondary)';
            slot.style.color = 'var(--text-muted)';
            slot.textContent = 'Empty';
        }
    }
}

function updateWorkerStatesDisplay() {
    const colors = {
        'idle': 'var(--secondary-color)',
        'waiting': 'var(--warning-color)',
        'using': 'var(--success-color)'
    };

    elements.workerStates.innerHTML = workerStates.map((state, i) => `
        <div style="padding:8px 12px;background:${colors[state]};color:white;border-radius:4px;font-size:0.85rem;">
            W${i}: ${state}
        </div>
    `).join('');
}

function updateDisplay() {
    if (!sharedArray || !running) return;

    const available = Atomics.load(sharedArray, 0);
    const inResource = workerStates.filter(s => s === 'using').length;
    const waiting = workerStates.filter(s => s === 'waiting').length;

    elements.availablePermits.textContent = `${available} / ${permits}`;
    elements.workersInResource.textContent = inResource;
    elements.workersWaiting.textContent = waiting;

    if (running) {
        requestAnimationFrame(updateDisplay);
    }
}

function updateUI() {
    elements.startBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    elements.permits.disabled = running;
    elements.workers.disabled = running;
}

// Event listeners
elements.startBtn.addEventListener('click', startSimulation);
elements.stopBtn.addEventListener('click', stopSimulation);
