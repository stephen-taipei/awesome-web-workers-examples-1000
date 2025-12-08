// Define the DAG structure
// Tasks with dependencies.
// Example:
// A -> B -> D
// A -> C -> D
// C -> E
//
// Dependencies:
// B depends on A
// C depends on A
// D depends on B and C
// E depends on C

const tasks = {
    'A': { id: 'A', duration: 1000, dependencies: [] },
    'B': { id: 'B', duration: 1500, dependencies: ['A'] },
    'C': { id: 'C', duration: 800, dependencies: ['A'] },
    'D': { id: 'D', duration: 1200, dependencies: ['B', 'C'] },
    'E': { id: 'E', duration: 1000, dependencies: ['C'] },
    'F': { id: 'F', duration: 500, dependencies: ['D', 'E'] }
};

const taskStatus = {}; // 'pending', 'running', 'completed'
let workers = [];
const maxWorkers = 4; // Thread pool size
let completedTasks = 0;
const totalTasks = Object.keys(tasks).length;

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const graphContainer = document.getElementById('graphContainer');
const statusDiv = document.getElementById('status');
const logDiv = document.getElementById('log');

// Initialize visual graph (simplified visualization)
function drawGraph() {
    graphContainer.innerHTML = '';

    // We'll just list them in a flex container for simplicity in this example,
    // but in a real app you might use D3 or similar to draw actual edges.
    // Here we sort them topologically just for display order if possible, or just keys.
    // Let's just display them.

    Object.keys(tasks).forEach(taskId => {
        const node = document.createElement('div');
        node.className = `task-node ${taskStatus[taskId] || 'pending'}`;
        node.id = `node-${taskId}`;
        node.innerText = taskId;
        node.title = `Depends on: ${tasks[taskId].dependencies.join(', ') || 'None'}`;
        graphContainer.appendChild(node);
    });
}

function log(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function updateNodeStatus(taskId, status) {
    taskStatus[taskId] = status;
    const node = document.getElementById(`node-${taskId}`);
    if (node) {
        node.className = `task-node ${status}`;
    }
}

function init() {
    Object.keys(tasks).forEach(taskId => {
        taskStatus[taskId] = 'pending';
    });
    completedTasks = 0;
    statusDiv.textContent = 'Ready';
    logDiv.innerHTML = '';
    drawGraph();
}

// Check if a task is ready to run (all dependencies are completed)
function isTaskReady(taskId) {
    if (taskStatus[taskId] !== 'pending') return false;

    const dependencies = tasks[taskId].dependencies;
    for (const depId of dependencies) {
        if (taskStatus[depId] !== 'completed') {
            return false;
        }
    }
    return true;
}

// Get list of ready tasks
function getReadyTasks() {
    return Object.keys(tasks).filter(taskId => isTaskReady(taskId));
}

function schedule() {
    if (completedTasks === totalTasks) {
        statusDiv.textContent = 'All tasks completed!';
        log('All tasks completed successfully.');
        startBtn.disabled = false;
        return;
    }

    const readyTasks = getReadyTasks();

    // While we have workers available and tasks ready to run
    // Note: In a real pool, we would manage worker objects. Here we just spawn one for simplicity
    // or use a pool. Let's use a simple pool concept.

    // Actually, let's create a pool of workers at start.
}

class WorkerPool {
    constructor(size) {
        this.size = size;
        this.workers = [];
        this.freeWorkers = [];
        this.tasksQueue = [];

        for (let i = 0; i < size; i++) {
            const worker = new Worker('worker.js');
            worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
            this.workers.push(worker);
            this.freeWorkers.push(worker);
        }
    }

    handleWorkerMessage(worker, e) {
        const { taskId, status, result } = e.data;
        if (status === 'completed') {
            log(`Task ${taskId} completed.`);
            updateNodeStatus(taskId, 'completed');
            completedTasks++;

            // Return worker to pool
            this.freeWorkers.push(worker);

            // Trigger next scheduling cycle
            this.processQueue();
        }
    }

    runTask(taskId) {
        if (this.freeWorkers.length > 0) {
            const worker = this.freeWorkers.pop();
            const task = tasks[taskId];
            log(`Starting task ${taskId} (Duration: ${task.duration}ms)...`);
            updateNodeStatus(taskId, 'running');
            worker.postMessage({ taskId: taskId, duration: task.duration });
        } else {
            // This shouldn't happen if we logic correctly, but for safety
            console.error("No workers available");
        }
    }

    processQueue() {
        if (completedTasks === totalTasks) {
            statusDiv.textContent = 'All tasks completed!';
            log('All tasks completed successfully.');
            startBtn.disabled = false;
            return;
        }

        const readyTasks = getReadyTasks();

        // We need to avoid scheduling tasks that are already running.
        // The readyTasks only checks if deps are completed and status is pending.

        readyTasks.forEach(taskId => {
            if (this.freeWorkers.length > 0) {
                this.runTask(taskId);
            }
        });
    }

    terminate() {
        this.workers.forEach(w => w.terminate());
    }
}

let pool = null;

startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    init();

    if (pool) {
        pool.terminate();
    }
    pool = new WorkerPool(maxWorkers);

    statusDiv.textContent = 'Running...';
    log('Starting DAG execution...');

    pool.processQueue();
});

resetBtn.addEventListener('click', () => {
    if (pool) {
        pool.terminate();
        pool = null;
    }
    startBtn.disabled = false;
    init();
    log('Reset.');
});

init();
