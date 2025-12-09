// UI and Logic

const poolSizeSlider = document.getElementById('poolSize');
const poolSizeDisplay = document.getElementById('poolSizeDisplay');
const resetBtn = document.getElementById('resetBtn');
const poolVisual = document.getElementById('poolVisual');
const queueVisual = document.getElementById('queueVisual');
const queueCount = document.getElementById('queueCount');
const logger = document.getElementById('logger');

// Stats
const completedCountEl = document.getElementById('completedCount');
const avgTimeEl = document.getElementById('avgTime');
const throughputEl = document.getElementById('throughput');

let completedTasks = 0;
let totalTime = 0;
let startTime = Date.now();
let pool;

// Initialize
function initPool() {
    const size = parseInt(poolSizeSlider.value);
    pool = new WorkerPool(size, 'worker.js');

    // Hooks for UI updates
    pool.onPoolChange = updatePoolVisual;
    pool.onQueueChange = updateQueueVisual;

    updatePoolVisual();
    log(`Pool initialized with ${size} workers`, 'info');
}

// UI Updates
function updatePoolVisual() {
    poolVisual.innerHTML = '';
    pool.workers.forEach(w => {
        const div = document.createElement('div');
        div.className = `worker-node ${w.idle ? 'worker-idle' : 'worker-busy'}`;
        div.textContent = `Worker ${w.id + 1}\n${w.idle ? 'Idle' : 'Busy'}`;
        poolVisual.appendChild(div);
    });
}

function updateQueueVisual() {
    queueCount.textContent = pool.queue.length;
    queueVisual.innerHTML = '';

    // Show max 15 items to avoid perf issues
    pool.queue.slice(0, 15).forEach((task, i) => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.textContent = `Task ${task.taskId} (${task.duration}ms)`;
        queueVisual.appendChild(div);
    });

    if (pool.queue.length > 15) {
        const div = document.createElement('div');
        div.textContent = `+${pool.queue.length - 15} more...`;
        queueVisual.appendChild(div);
    }
}

function log(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logger.insertBefore(div, logger.firstChild);
}

// Stats Update
setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 0) {
        const tput = completedTasks / elapsed;
        throughputEl.textContent = `${tput.toFixed(1)}/s`;
    }
}, 1000);

// Event Listeners
poolSizeSlider.addEventListener('input', (e) => {
    poolSizeDisplay.textContent = e.target.value;
});

resetBtn.addEventListener('click', () => {
    initPool();
    completedTasks = 0;
    totalTime = 0;
    startTime = Date.now();
    completedCountEl.textContent = '0';
    avgTimeEl.textContent = '0ms';
});

// Task Generators
function addTask(duration) {
    pool.run({ duration })
        .then(res => {
            completedTasks++;
            totalTime += res.duration;

            completedCountEl.textContent = completedTasks;
            avgTimeEl.textContent = `${Math.round(totalTime / completedTasks)}ms`;

            log(`Task ${res.taskId} completed by Worker ${res.workerId + 1} in ${res.duration}ms`, 'success');
        })
        .catch(err => log(`Task failed: ${err}`, 'error'));
}

document.getElementById('addFastBtn').addEventListener('click', () => addTask(500));
document.getElementById('addSlowBtn').addEventListener('click', () => addTask(2000));
document.getElementById('addRandomBtn').addEventListener('click', () => addTask(Math.floor(Math.random() * 2500) + 200));

document.getElementById('addBatchBtn').addEventListener('click', () => {
    log('Adding batch of 10 tasks...', 'info');
    for(let i=0; i<10; i++) {
        addTask(Math.floor(Math.random() * 1000) + 200);
    }
});

// Start
initPool();
