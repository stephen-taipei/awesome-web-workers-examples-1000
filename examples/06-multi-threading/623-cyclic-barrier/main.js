/**
 * #623 Cyclic Barrier
 */

let sharedBuffer, sharedArray, workers = [], workerRounds = [];

const elements = {
    workers: document.getElementById('workers'),
    rounds: document.getElementById('rounds'),
    startBtn: document.getElementById('start-btn'),
    round: document.getElementById('round'),
    waiting: document.getElementById('waiting'),
    progress: document.getElementById('progress')
};

function start() {
    const workerCount = parseInt(elements.workers.value);
    const rounds = parseInt(elements.rounds.value);

    sharedBuffer = new SharedArrayBuffer(12);
    sharedArray = new Int32Array(sharedBuffer);

    workers.forEach(w => w.terminate());
    workers = [];
    workerRounds = new Array(workerCount).fill(0);

    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            if (e.data.type === 'round-complete') {
                workerRounds[i] = e.data.data.round;
                updateProgress();
            }
        };
        worker.postMessage({ type: 'init', data: { workerId: i, buffer: sharedBuffer, totalWorkers: workerCount } });
        worker.postMessage({ type: 'start', data: { rounds } });
        workers.push(worker);
    }

    elements.startBtn.disabled = true;
    updateDisplay();
}

function updateProgress() {
    const rounds = parseInt(elements.rounds.value);
    elements.progress.innerHTML = workerRounds.map((r, i) => `
        <div style="display:flex;align-items:center;gap:10px;margin:5px 0;">
            <span style="width:70px;">W${i}:</span>
            <div style="flex:1;display:flex;gap:3px;">
                ${Array(rounds).fill(0).map((_, idx) => `
                    <div style="flex:1;height:25px;background:${r > idx ? 'var(--success-color)' : 'var(--bg-secondary)'};border-radius:4px;"></div>
                `).join('')}
            </div>
        </div>
    `).join('');

    if (workerRounds.every(r => r >= rounds)) {
        elements.startBtn.disabled = false;
    }
}

function updateDisplay() {
    if (!sharedArray) return;
    elements.round.textContent = Atomics.load(sharedArray, 0);
    elements.waiting.textContent = Atomics.load(sharedArray, 1);
    if (elements.startBtn.disabled) requestAnimationFrame(updateDisplay);
}

elements.startBtn.addEventListener('click', start);
