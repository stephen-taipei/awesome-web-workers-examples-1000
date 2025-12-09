// Master-Worker Pattern - Main Thread (Master)

const taskSelect = document.getElementById('taskSelect');
const taskDescription = document.getElementById('taskDescription');
const workerCountInput = document.getElementById('workerCount');
const taskCountInput = document.getElementById('taskCount');
const taskVarianceInput = document.getElementById('taskVariance');
const dynamicAddSelect = document.getElementById('dynamicAdd');

const runBtn = document.getElementById('runBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
const resetBtn = document.getElementById('resetBtn');

const pendingCountEl = document.getElementById('pendingCount');
const processingCountEl = document.getElementById('processingCount');
const completedCountEl = document.getElementById('completedCount');
const taskQueueEl = document.getElementById('taskQueue');

const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const tasksCompletedEl = document.getElementById('tasksCompleted');
const totalTimeEl = document.getElementById('totalTime');
const throughputEl = document.getElementById('throughput');
const avgTaskTimeEl = document.getElementById('avgTaskTime');
const loadBalanceEl = document.getElementById('loadBalance');
const mostProductiveEl = document.getElementById('mostProductive');
const efficiencyEl = document.getElementById('efficiency');
const workerStatsEl = document.getElementById('workerStats');

const canvas = document.getElementById('mwCanvas');
const ctx = canvas.getContext('2d');

let workers = [];
let taskQueue = [];
let completedTasks = [];
let workerStats = [];
let isRunning = false;
let nextTaskId = 0;
let startTime = null;

const workerColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const taskTypes = {
    imageRender: {
        name: 'Image Rendering',
        description: `模擬影像渲染任務
每個任務代表渲染一個圖塊
任務大小不一，需要動態分配

Master 追蹤每個 Worker 狀態
將新任務分配給空閒 Worker`,
        baseTime: 100
    },
    dataProcess: {
        name: 'Data Processing',
        description: `批量資料處理任務
每個任務處理一批記錄
處理時間取決於資料複雜度

適用於 ETL、日誌分析等場景`,
        baseTime: 80
    },
    primeFind: {
        name: 'Prime Finder',
        description: `搜尋指定範圍內的質數
每個任務搜尋一個數值範圍
範圍大小決定計算時間

計算密集型任務的典型範例`,
        baseTime: 120
    },
    webCrawl: {
        name: 'Web Crawl Simulation',
        description: `模擬網頁爬取任務
每個任務代表爬取一個頁面
包含模擬網路延遲

I/O 密集型任務的範例`,
        baseTime: 150
    }
};

function updateTaskDescription() {
    const selected = taskSelect.value;
    taskDescription.textContent = taskTypes[selected].description;
}

function initVisualization() {
    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const workerCount = parseInt(workerCountInput.value);

    // Draw Master node
    const masterX = canvas.width / 2;
    const masterY = 60;

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(masterX, masterY, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MASTER', masterX, masterY + 5);

    // Draw Workers
    const workerY = 280;
    const workerSpacing = canvas.width / (workerCount + 1);

    for (let i = 0; i < workerCount; i++) {
        const x = (i + 1) * workerSpacing;

        // Connection line
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(masterX, masterY + 35);
        ctx.lineTo(x, workerY - 30);
        ctx.stroke();
        ctx.setLineDash([]);

        // Worker node
        ctx.fillStyle = workerColors[i % workerColors.length];
        ctx.beginPath();
        ctx.arc(x, workerY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`W${i}`, x, workerY + 5);

        // Idle indicator
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.font = '10px sans-serif';
        ctx.fillText('Idle', x, workerY + 50);
    }

    // Task queue visualization
    ctx.fillStyle = '#34d399';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Master: Manages task queue, distributes work, collects results', 20, 25);

    // Queue box
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(masterX - 100, masterY + 50, 200, 30, 5);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Task Queue', masterX, masterY + 70);
}

function drawWorkerState(workerIndex, state, taskId = null, progress = 0) {
    const workerCount = parseInt(workerCountInput.value);
    const workerSpacing = canvas.width / (workerCount + 1);
    const x = (workerIndex + 1) * workerSpacing;
    const workerY = 280;

    // Clear worker area
    ctx.fillStyle = '#080f08';
    ctx.beginPath();
    ctx.arc(x, workerY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 40, workerY + 35, 80, 30);

    const color = workerColors[workerIndex % workerColors.length];

    // Progress ring
    if (state === 'working' && progress > 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, workerY, 35, -Math.PI / 2, -Math.PI / 2 + (progress / 100) * Math.PI * 2);
        ctx.stroke();
    }

    // Worker circle
    ctx.fillStyle = state === 'working' ? color : 'rgba(100, 100, 100, 0.5)';
    ctx.beginPath();
    ctx.arc(x, workerY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Worker label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`W${workerIndex}`, x, workerY + 5);

    // Status text
    ctx.font = '10px sans-serif';
    if (state === 'working') {
        ctx.fillStyle = color;
        ctx.fillText(`Task ${taskId}`, x, workerY + 50);
    } else {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.fillText('Idle', x, workerY + 50);
    }
}

function drawTaskFlow(workerIndex, taskId) {
    const workerCount = parseInt(workerCountInput.value);
    const workerSpacing = canvas.width / (workerCount + 1);
    const workerX = (workerIndex + 1) * workerSpacing;
    const masterX = canvas.width / 2;
    const masterY = 95;
    const workerY = 250;

    const color = workerColors[workerIndex % workerColors.length];

    // Animate task assignment
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(masterX, masterY);
    ctx.lineTo(workerX, workerY);
    ctx.stroke();

    // Task indicator
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc((masterX + workerX) / 2, (masterY + workerY) / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`T${taskId}`, (masterX + workerX) / 2, (masterY + workerY) / 2 + 3);
}

function updateQueueDisplay() {
    const pending = taskQueue.filter(t => t.status === 'pending');
    const processing = taskQueue.filter(t => t.status === 'processing');
    const completed = completedTasks.length;

    pendingCountEl.textContent = pending.length;
    processingCountEl.textContent = processing.length;
    completedCountEl.textContent = completed;

    // Update task chips
    let html = '';
    taskQueue.forEach(task => {
        html += `<span class="task-chip ${task.status}" id="task${task.id}">T${task.id}</span>`;
    });
    taskQueueEl.innerHTML = html;
}

function generateTasks(count, taskType) {
    const variance = parseInt(taskVarianceInput.value) / 100;
    const baseTime = taskTypes[taskType].baseTime;
    const tasks = [];

    for (let i = 0; i < count; i++) {
        const varianceFactor = 1 + (Math.random() - 0.5) * 2 * variance;
        const complexity = Math.max(0.2, varianceFactor);

        tasks.push({
            id: nextTaskId++,
            type: taskType,
            complexity,
            estimatedTime: Math.round(baseTime * complexity),
            status: 'pending',
            assignedWorker: null,
            startTime: null,
            endTime: null
        });
    }

    return tasks;
}

function getNextTask() {
    return taskQueue.find(t => t.status === 'pending');
}

function getIdleWorker() {
    return workerStats.findIndex(w => !w.busy);
}

function assignTask(workerIndex, task) {
    task.status = 'processing';
    task.assignedWorker = workerIndex;
    task.startTime = performance.now();

    workerStats[workerIndex].busy = true;
    workerStats[workerIndex].currentTask = task.id;

    drawWorkerState(workerIndex, 'working', task.id, 0);
    drawTaskFlow(workerIndex, task.id);
    updateQueueDisplay();

    workers[workerIndex].postMessage({
        taskId: task.id,
        taskType: task.type,
        complexity: task.complexity
    });
}

function onTaskComplete(workerIndex, taskId, result) {
    const task = taskQueue.find(t => t.id === taskId);
    if (task) {
        task.status = 'completed';
        task.endTime = performance.now();
        task.result = result;
        completedTasks.push(task);

        // Remove from active queue
        const idx = taskQueue.indexOf(task);
        if (idx !== -1) {
            taskQueue.splice(idx, 1);
        }
    }

    workerStats[workerIndex].busy = false;
    workerStats[workerIndex].currentTask = null;
    workerStats[workerIndex].tasksCompleted++;
    workerStats[workerIndex].totalTime += result.processingTime;

    drawWorkerState(workerIndex, 'idle');
    updateQueueDisplay();

    // Assign next task if available
    const nextTask = getNextTask();
    if (nextTask) {
        setTimeout(() => assignTask(workerIndex, nextTask), 50);
    } else if (taskQueue.filter(t => t.status === 'processing').length === 0) {
        // All tasks completed
        onAllTasksComplete();
    }
}

function onAllTasksComplete() {
    isRunning = false;
    addTaskBtn.disabled = true;

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    resultContainer.classList.remove('hidden');
    statusEl.textContent = 'Completed';
    statusEl.style.color = '#34d399';
    tasksCompletedEl.textContent = completedTasks.length;
    totalTimeEl.textContent = totalTime.toFixed(2) + ' ms';
    throughputEl.textContent = (completedTasks.length / (totalTime / 1000)).toFixed(2) + ' tasks/s';

    const avgTime = completedTasks.reduce((s, t) => s + (t.endTime - t.startTime), 0) / completedTasks.length;
    avgTaskTimeEl.textContent = avgTime.toFixed(2) + ' ms';

    // Calculate load balance (coefficient of variation)
    const taskCounts = workerStats.map(w => w.tasksCompleted);
    const avgTasks = taskCounts.reduce((a, b) => a + b, 0) / taskCounts.length;
    const stdDev = Math.sqrt(taskCounts.reduce((s, c) => s + Math.pow(c - avgTasks, 2), 0) / taskCounts.length);
    const cv = stdDev / avgTasks;
    const balanceScore = Math.max(0, (1 - cv) * 100);
    loadBalanceEl.textContent = balanceScore.toFixed(1) + '%';

    // Most productive worker
    const maxTasks = Math.max(...taskCounts);
    const mostProductiveIdx = taskCounts.indexOf(maxTasks);
    mostProductiveEl.textContent = `Worker ${mostProductiveIdx} (${maxTasks} tasks)`;

    // Efficiency (busy time / total time)
    const workerCount = workers.length;
    const totalBusyTime = workerStats.reduce((s, w) => s + w.totalTime, 0);
    const efficiency = (totalBusyTime / (totalTime * workerCount)) * 100;
    efficiencyEl.textContent = efficiency.toFixed(1) + '%';

    renderWorkerStats();
    terminateWorkers();
}

function renderWorkerStats() {
    const maxTasks = Math.max(...workerStats.map(w => w.tasksCompleted));

    let html = '';
    workerStats.forEach((stat, i) => {
        const color = workerColors[i % workerColors.length];
        const widthPercent = (stat.tasksCompleted / maxTasks) * 100;
        const avgTime = stat.tasksCompleted > 0 ? (stat.totalTime / stat.tasksCompleted).toFixed(2) : 0;

        html += `
            <div class="worker-stat-card" style="border-left-color: ${color}">
                <div class="worker-stat-header">
                    <span class="worker-stat-name" style="color: ${color}">Worker ${i}</span>
                    <span class="worker-stat-count">${stat.tasksCompleted} tasks</span>
                </div>
                <div class="worker-stat-bar">
                    <div class="worker-stat-fill" style="width: ${widthPercent}%; background: ${color}"></div>
                </div>
                <div class="worker-stat-details">
                    <span>Avg: ${avgTime} ms</span>
                    <span>Total: ${stat.totalTime.toFixed(0)} ms</span>
                </div>
            </div>
        `;
    });

    workerStatsEl.innerHTML = html;
}

function terminateWorkers() {
    workers.forEach(w => w.terminate());
    workers = [];
}

async function startMasterWorker() {
    if (isRunning) return;
    isRunning = true;

    const taskType = taskSelect.value;
    const workerCount = parseInt(workerCountInput.value);
    const taskCount = parseInt(taskCountInput.value);
    const dynamicAdd = dynamicAddSelect.value === 'true';

    resultContainer.classList.add('hidden');
    completedTasks = [];
    nextTaskId = 0;

    // Initialize workers
    terminateWorkers();
    workerStats = [];

    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        workers.push(worker);
        workerStats.push({
            busy: false,
            currentTask: null,
            tasksCompleted: 0,
            totalTime: 0
        });

        worker.onmessage = (e) => {
            if (e.data.type === 'progress') {
                drawWorkerState(i, 'working', e.data.taskId, e.data.percent);
            } else if (e.data.type === 'complete') {
                onTaskComplete(i, e.data.taskId, e.data.result);
            }
        };
    }

    // Generate initial tasks
    taskQueue = generateTasks(taskCount, taskType);
    updateQueueDisplay();
    initVisualization();

    startTime = performance.now();
    addTaskBtn.disabled = !dynamicAdd;

    // Initial task distribution
    for (let i = 0; i < workerCount; i++) {
        const task = getNextTask();
        if (task) {
            setTimeout(() => assignTask(i, task), i * 100);
        }
    }
}

function addMoreTasks() {
    if (!isRunning) return;

    const taskType = taskSelect.value;
    const newTasks = generateTasks(5, taskType);
    taskQueue.push(...newTasks);
    updateQueueDisplay();

    // Assign to idle workers
    workers.forEach((worker, i) => {
        if (!workerStats[i].busy) {
            const task = getNextTask();
            if (task) {
                assignTask(i, task);
            }
        }
    });
}

function reset() {
    terminateWorkers();
    isRunning = false;
    taskQueue = [];
    completedTasks = [];
    workerStats = [];
    nextTaskId = 0;
    addTaskBtn.disabled = true;
    resultContainer.classList.add('hidden');
    updateQueueDisplay();
    initVisualization();
}

taskSelect.addEventListener('change', updateTaskDescription);
workerCountInput.addEventListener('change', initVisualization);
runBtn.addEventListener('click', startMasterWorker);
addTaskBtn.addEventListener('click', addMoreTasks);
resetBtn.addEventListener('click', reset);

updateTaskDescription();
initVisualization();
