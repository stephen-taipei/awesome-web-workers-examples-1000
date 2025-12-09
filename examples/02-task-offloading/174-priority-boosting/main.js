// Main Thread

const addHighBtn = document.getElementById('add-high-btn');
const addLowBtn = document.getElementById('add-low-btn');
const toggleSchedulerBtn = document.getElementById('toggle-scheduler');
const queueContainer = document.getElementById('queue-container');
const workersContainer = document.getElementById('workers-container');
const completedContainer = document.getElementById('completed-container');
const logOutput = document.getElementById('log-output');

// Config
const WORKER_COUNT = 3;
const MAX_AGE_BEFORE_BOOST = 5000; // ms
const TASK_DURATION_MS = 2000; // Simulated work time

// State
let taskQueue = [];
let workers = [];
let isRunning = false;
let taskIdCounter = 1;

// Worker Pool Initialization
function initWorkers() {
    for (let i = 0; i < WORKER_COUNT; i++) {
        const worker = new Worker('worker.js');
        worker.id = i;
        worker.isBusy = false;

        worker.onmessage = handleWorkerMessage.bind(null, i);

        workers.push(worker);

        // Create UI slot
        const slot = document.createElement('div');
        slot.className = 'worker-slot';
        slot.id = `worker-slot-${i}`;
        slot.textContent = `Worker ${i} (Idle)`;
        workersContainer.appendChild(slot);
    }
}

// Event Listeners
addHighBtn.addEventListener('click', () => addTask('high'));
addLowBtn.addEventListener('click', () => addTask('low'));
toggleSchedulerBtn.addEventListener('click', toggleScheduler);

function toggleScheduler() {
    isRunning = !isRunning;
    toggleSchedulerBtn.textContent = isRunning ? 'Pause Scheduler' : 'Start Scheduler';
    toggleSchedulerBtn.classList.toggle('btn-control-active');

    if (isRunning) {
        log('Scheduler started');
        scheduleLoop();
    } else {
        log('Scheduler paused');
    }
}

function addTask(priority) {
    const task = {
        id: taskIdCounter++,
        priority: priority, // 'high', 'low', 'boosted'
        originalPriority: priority,
        addedAt: Date.now(),
        duration: TASK_DURATION_MS + Math.random() * 1000 // Randomize slightly
    };

    taskQueue.push(task);
    renderQueue();
    log(`Added Task #${task.id} (${priority})`);
}

function renderQueue() {
    queueContainer.innerHTML = '';

    // Sort queue for display?
    // Usually scheduler picks based on priority, but visual list might be chronological or priority based.
    // Let's just show them in list, but highlighting boosting is key.

    taskQueue.forEach(task => {
        const age = Date.now() - task.addedAt;
        const agePercent = Math.min(100, (age / MAX_AGE_BEFORE_BOOST) * 100);

        const div = document.createElement('div');
        div.className = `task-card priority-${task.priority}`;
        if (task.priority === 'boosted') {
             div.classList.add('priority-boosted');
        }

        div.innerHTML = `
            <div class="info">
                <span>#${task.id} ${task.priority.toUpperCase()}</span>
                <span style="font-size:10px; opacity:0.7">${(age/1000).toFixed(1)}s old</span>
            </div>
            <div class="age-bar">
                <div class="age-fill" style="width: ${agePercent}%"></div>
            </div>
        `;
        queueContainer.appendChild(div);
    });
}

function scheduleLoop() {
    if (!isRunning) return;

    // 1. Aging / Priority Boosting Logic
    const now = Date.now();
    let changed = false;

    taskQueue.forEach(task => {
        if (task.priority === 'low') {
            const age = now - task.addedAt;
            if (age > MAX_AGE_BEFORE_BOOST) {
                task.priority = 'boosted';
                log(`Task #${task.id} boosted due to aging!`);
                changed = true;
            }
        }
    });

    if (changed) renderQueue();

    // 2. Assign tasks to idle workers
    const idleWorker = workers.find(w => !w.isBusy);

    if (idleWorker && taskQueue.length > 0) {
        // Pick task: High/Boosted first, then Low
        // Boosted is treated as high (or even higher)

        // Simple priority sort: Boosted > High > Low
        // Or High = Boosted > Low

        let selectedTaskIndex = -1;

        // Find highest priority task
        // We prioritize Boosted/High over Low
        // Among same priority, FIFO

        // Strategy: Filter for high/boosted first
        let candidates = taskQueue.map((t, i) => ({...t, index: i}));

        // Sort:
        // 1. Priority (Boosted/High = 1, Low = 0)
        // 2. Age (older first)

        candidates.sort((a, b) => {
            const getScore = (p) => (p === 'high' || p === 'boosted') ? 1 : 0;
            const scoreA = getScore(a.priority);
            const scoreB = getScore(b.priority);

            if (scoreA !== scoreB) return scoreB - scoreA; // Higher score first
            return a.addedAt - b.addedAt; // Older first (FIFO)
        });

        const selectedTask = candidates[0];

        // Remove from queue
        // We need to find it in original queue since indices shifted if we removed before?
        // Ah, I used index map.
        taskQueue.splice(selectedTask.index, 1);

        assignTaskToWorker(idleWorker, selectedTask);
        renderQueue();
    }

    requestAnimationFrame(scheduleLoop);
}

function assignTaskToWorker(worker, task) {
    worker.isBusy = true;

    // Update UI
    const slot = document.getElementById(`worker-slot-${worker.id}`);
    slot.innerHTML = `
        <div class="task-card priority-${task.priority}" style="width:100%; border-left-width: 3px;">
            <span>Processing #${task.id}</span>
        </div>
    `;

    log(`Assigned Task #${task.id} to Worker ${worker.id}`);

    worker.postMessage({ taskId: task.id, duration: task.duration });
}

function handleWorkerMessage(workerIndex, e) {
    const { type, taskId } = e.data;

    if (type === 'complete') {
        const worker = workers[workerIndex];
        worker.isBusy = false;

        // Update UI
        const slot = document.getElementById(`worker-slot-${workerIndex}`);
        slot.textContent = `Worker ${workerIndex} (Idle)`;

        // Move to completed
        const completedDiv = document.createElement('div');
        completedDiv.className = 'task-card';
        completedDiv.style.opacity = '0.6';
        completedDiv.innerHTML = `<span>Task #${taskId} Done</span>`;
        completedContainer.insertBefore(completedDiv, completedContainer.firstChild);

        // Limit completed list size
        if (completedContainer.children.length > 5) {
            completedContainer.removeChild(completedContainer.lastChild);
        }

        log(`Worker ${workerIndex} finished Task #${taskId}`);
    }
}

function log(msg) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logOutput.insertBefore(div, logOutput.firstChild);
}

// Start
initWorkers();
// Auto start for demo
toggleScheduler();

// Auto add some tasks for demo
setTimeout(() => addTask('low'), 500);
setTimeout(() => addTask('low'), 1000);
setTimeout(() => addTask('high'), 1500); // Should jump queue
setTimeout(() => addTask('low'), 2000);
setTimeout(() => addTask('low'), 2500);
// Wait for boosting...
