// Main Thread

const addTaskABtn = document.getElementById('add-task-a');
const addTaskBBtn = document.getElementById('add-task-b');
const addTaskCBtn = document.getElementById('add-task-c');
const affinityToggle = document.getElementById('affinity-toggle');
const queueContainer = document.getElementById('queue-container');
const workersContainer = document.getElementById('workers-container');

const hitsVal = document.getElementById('hits-val');
const missesVal = document.getElementById('misses-val');
const timeVal = document.getElementById('time-val');

// Config
const WORKER_COUNT = 2;
const DATA_LOAD_TIME = 1500; // ms to load dataset
const PROCESS_TIME = 1000;   // ms to process task

// State
let workers = [];
let taskQueue = [];
let taskCounter = 1;

let stats = {
    hits: 0,
    misses: 0,
    startTime: null
};

// Initialize
initWorkers();
requestAnimationFrame(schedulerLoop);

// Event Listeners
addTaskABtn.addEventListener('click', () => addTask('A'));
addTaskBBtn.addEventListener('click', () => addTask('B'));
addTaskCBtn.addEventListener('click', () => addTask('C'));

function initWorkers() {
    for (let i = 0; i < WORKER_COUNT; i++) {
        const worker = new Worker('worker.js');
        worker.id = i;
        worker.isBusy = false;
        worker.currentCache = null; // 'A', 'B', 'C', or null

        worker.onmessage = handleWorkerMessage.bind(null, i);
        workers.push(worker);

        // UI
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.id = `worker-card-${i}`;
        card.innerHTML = `
            <div class="worker-header">
                <span>Worker ${i}</span>
                <span id="worker-status-${i}">Idle</span>
            </div>
            <div class="cache-status">
                Cache: <span id="worker-cache-${i}" class="cache-None">None</span>
            </div>
            <div id="worker-task-${i}" class="current-task" style="display:none"></div>
        `;
        workersContainer.appendChild(card);
    }
}

function addTask(dataset) {
    if (!stats.startTime) stats.startTime = Date.now();

    const task = {
        id: taskCounter++,
        dataset: dataset,
        addedAt: Date.now()
    };

    taskQueue.push(task);
    renderQueue();
}

function renderQueue() {
    queueContainer.innerHTML = '';
    taskQueue.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.style.borderLeft = `5px solid ${getColor(task.dataset)}`;
        div.innerHTML = `
            <span>#${task.id}</span>
            <span>Dataset ${task.dataset}</span>
        `;
        queueContainer.appendChild(div);
    });
}

function getColor(dataset) {
    if (dataset === 'A') return '#e74c3c';
    if (dataset === 'B') return '#3498db';
    if (dataset === 'C') return '#f1c40f';
    return '#ccc';
}

function schedulerLoop() {
    const useAffinity = affinityToggle.checked;

    // Find idle workers
    const idleWorkers = workers.filter(w => !w.isBusy);

    if (idleWorkers.length > 0 && taskQueue.length > 0) {

        // Strategy
        if (useAffinity) {
            // Try to find a match: Task needs D, Worker has D
            let bestMatch = findBestTaskWorkerMatch(idleWorkers, taskQueue);

            if (bestMatch) {
                assignTask(bestMatch.worker, bestMatch.task);
                // Remove task
                const idx = taskQueue.indexOf(bestMatch.task);
                if (idx > -1) taskQueue.splice(idx, 1);
            } else {
                // No perfect match.
                // Pick first available worker and first task?
                // Or maybe keep worker idle if task queue has future tasks? (Too complex for simple demo)
                // Just fallback to FIFO
                const worker = idleWorkers[0]; // Just pick one
                const task = taskQueue.shift();
                assignTask(worker, task);
            }
        } else {
            // Simple FIFO
            const worker = idleWorkers[0];
            const task = taskQueue.shift();
            assignTask(worker, task);
        }

        renderQueue();
    }

    // Update timer
    if (stats.startTime) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        timeVal.textContent = elapsed.toFixed(1) + 's';
    }

    requestAnimationFrame(schedulerLoop);
}

function findBestTaskWorkerMatch(idleWorkers, queue) {
    // 1. Look for Exact Match (Worker has Cache = Task Dataset)
    for (let w of idleWorkers) {
        if (w.currentCache) {
            const task = queue.find(t => t.dataset === w.currentCache);
            if (task) {
                return { worker: w, task: task };
            }
        }
    }

    // 2. Look for Worker with NO cache (Cost is Load Time)
    // vs Worker WITH cache (Cost is Load Time + maybe evict cost?)
    // Here we assume overwriting cache is same cost as fresh load.

    // If no affinity match, we still need to assign something to keep throughput up.
    // However, if we have multiple idle workers, we should prefer one that is 'cold'
    // over one that has a cache that might be useful for a later task?
    // For this demo, if no direct match, just take first available.

    return null;
}

function assignTask(worker, task) {
    worker.isBusy = true;

    // Check Cache Hit/Miss
    const isHit = worker.currentCache === task.dataset;
    if (isHit) {
        stats.hits++;
        hitsVal.textContent = stats.hits;
    } else {
        stats.misses++;
        missesVal.textContent = stats.misses;
        worker.currentCache = task.dataset; // Will load it
    }

    // UI Updates
    updateWorkerUI(worker, task, isHit);

    worker.postMessage({
        taskId: task.id,
        dataset: task.dataset,
        loadTime: isHit ? 0 : DATA_LOAD_TIME,
        processTime: PROCESS_TIME
    });
}

function updateWorkerUI(worker, task, isHit) {
    const card = document.getElementById(`worker-card-${worker.id}`);
    const status = document.getElementById(`worker-status-${worker.id}`);
    const cache = document.getElementById(`worker-cache-${worker.id}`);
    const taskDiv = document.getElementById(`worker-task-${worker.id}`);

    card.classList.add('busy');
    status.textContent = isHit ? 'Processing (Hot)' : 'Loading Data...';

    cache.className = `cache-loaded cache-${worker.currentCache}`;
    cache.textContent = worker.currentCache;

    taskDiv.style.display = 'block';
    taskDiv.innerHTML = `Task #${task.id} (${task.dataset})`;
}

function handleWorkerMessage(workerIndex, e) {
    const { type } = e.data;
    if (type === 'complete') {
        const worker = workers[workerIndex];
        worker.isBusy = false;

        // UI Reset
        const card = document.getElementById(`worker-card-${workerIndex}`);
        const status = document.getElementById(`worker-status-${workerIndex}`);
        const taskDiv = document.getElementById(`worker-task-${workerIndex}`);

        card.classList.remove('busy');
        status.textContent = 'Idle';
        taskDiv.style.display = 'none';
    } else if (type === 'processing') {
        // State change from Loading to Processing
        const status = document.getElementById(`worker-status-${workerIndex}`);
        status.textContent = 'Processing...';
    }
}
