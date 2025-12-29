/**
 * #620 Spinlock Pattern
 * Busy-waiting lock implementation
 */

let sharedBuffer = null;
let sharedArray = null;
let workers = [];
let completedCount = 0;
let startTime = 0;
let workerStats = [];
let totalSpins = 0;

const elements = {
    workerCount: document.getElementById('worker-count'),
    iterations: document.getElementById('iterations'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    lockVisual: document.getElementById('lock-visual'),
    spinCount: document.getElementById('spin-count'),
    workerStats: document.getElementById('worker-stats'),
    results: document.getElementById('results')
};

function startTest() {
    if (typeof SharedArrayBuffer === 'undefined') {
        alert('SharedArrayBuffer not supported');
        return;
    }

    const workerCount = parseInt(elements.workerCount.value);
    const iterations = parseInt(elements.iterations.value);

    // Buffer: [0] = spinlock, [1] = counter, [2] = total spins
    sharedBuffer = new SharedArrayBuffer(12);
    sharedArray = new Int32Array(sharedBuffer);
    Atomics.store(sharedArray, 0, 0); // Unlocked
    Atomics.store(sharedArray, 1, 0); // Counter
    Atomics.store(sharedArray, 2, 0); // Spin count

    // Reset state
    workers.forEach(w => w.terminate());
    workers = [];
    completedCount = 0;
    workerStats = new Array(workerCount).fill(null).map(() => ({
        state: 'idle',
        spins: 0,
        acquired: 0
    }));
    totalSpins = 0;
    startTime = performance.now();

    elements.startBtn.disabled = true;
    elements.results.innerHTML = '<p style="color:var(--text-secondary);">Running...</p>';
    updateWorkerStats();

    // Create workers
    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => handleWorkerMessage(i, e, workerCount, iterations);
        worker.postMessage({
            type: 'init',
            data: { workerId: i, buffer: sharedBuffer }
        });
        workers.push(worker);
    }

    // Start all workers
    workers.forEach(w => {
        w.postMessage({
            type: 'start',
            data: { iterations }
        });
    });

    // Update display
    updateDisplay();
}

function handleWorkerMessage(workerId, event, workerCount, iterations) {
    const { type, data } = event.data;

    switch (type) {
        case 'spinning':
            workerStats[workerId].state = 'spinning';
            workerStats[workerId].spins = data.spins;
            updateWorkerStats();
            break;

        case 'acquired':
            workerStats[workerId].state = 'holding';
            workerStats[workerId].acquired++;
            elements.lockVisual.style.background = 'var(--danger-color)';
            elements.lockVisual.textContent = `W${workerId}`;
            updateWorkerStats();
            break;

        case 'released':
            workerStats[workerId].state = 'idle';
            elements.lockVisual.style.background = 'var(--success-color)';
            elements.lockVisual.textContent = 'UNLOCKED';
            updateWorkerStats();
            break;

        case 'complete':
            workerStats[workerId].state = 'done';
            workerStats[workerId].totalSpins = data.totalSpins;
            workerStats[workerId].duration = data.duration;
            completedCount++;
            updateWorkerStats();

            if (completedCount === workerCount) {
                showResults(workerCount, iterations);
            }
            break;
    }
}

function updateDisplay() {
    if (!sharedArray) return;

    const spins = Atomics.load(sharedArray, 2);
    elements.spinCount.textContent = `Total spins: ${spins.toLocaleString()}`;

    if (completedCount < workers.length) {
        requestAnimationFrame(updateDisplay);
    }
}

function updateWorkerStats() {
    const stateColors = {
        'idle': 'var(--secondary-color)',
        'spinning': 'var(--warning-color)',
        'holding': 'var(--danger-color)',
        'done': 'var(--success-color)'
    };

    elements.workerStats.innerHTML = workerStats.map((s, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;border-left:4px solid ${stateColors[s.state]};">
            <div>
                <strong>Worker ${i}</strong>
                <span style="color:var(--text-muted);margin-left:10px;">${s.state}</span>
            </div>
            <div style="text-align:right;font-size:0.9rem;">
                <div>Spins: ${(s.totalSpins || s.spins || 0).toLocaleString()}</div>
                <div style="color:var(--text-muted);">Acquired: ${s.acquired}x</div>
            </div>
        </div>
    `).join('');
}

function showResults(workerCount, iterations) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const counter = Atomics.load(sharedArray, 1);
    const expectedCounter = workerCount * iterations;
    const totalSpins = Atomics.load(sharedArray, 2);
    const correct = counter === expectedCounter;

    elements.results.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Expected Counter:</span>
            <span class="stat-value">${expectedCounter.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Actual Counter:</span>
            <span class="stat-value" style="color:${correct ? 'var(--success-color)' : 'var(--danger-color)'};">${counter.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Spins:</span>
            <span class="stat-value">${totalSpins.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Time:</span>
            <span class="stat-value">${duration.toFixed(0)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Result:</span>
            <span class="stat-value" style="color:${correct ? 'var(--success-color)' : 'var(--danger-color)'};">${correct ? 'CORRECT' : 'ERROR'}</span>
        </div>
    `;

    elements.startBtn.disabled = false;
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    workerStats = [];
    elements.lockVisual.style.background = 'var(--success-color)';
    elements.lockVisual.textContent = 'UNLOCKED';
    elements.spinCount.textContent = 'Total spins: 0';
    elements.workerStats.innerHTML = '<p style="color:var(--text-muted);">No test running</p>';
    elements.results.innerHTML = '';
    elements.startBtn.disabled = false;
}

// Event listeners
elements.startBtn.addEventListener('click', startTest);
elements.resetBtn.addEventListener('click', reset);

reset();
