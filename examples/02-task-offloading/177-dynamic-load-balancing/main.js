/**
 * 動態負載均衡 - 主程式
 */

// DOM 元素
const workerCountInput = document.getElementById('worker-count');
const taskRateInput = document.getElementById('task-rate');
const strategySelect = document.getElementById('strategy-select');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const workersContainer = document.getElementById('workers-container');
const taskQueueEl = document.getElementById('task-queue');
const totalTasksEl = document.getElementById('total-tasks');
const avgTimeEl = document.getElementById('avg-time');
const throughputEl = document.getElementById('throughput');
const loadChart = document.getElementById('load-chart');

// 狀態變數
let workers = [];
let isRunning = false;
let taskGenerator = null;
let taskQueue = [];
let stats = {
    totalCompleted: 0,
    totalTime: 0,
    startTime: 0
};
let throughputInterval = null;
let roundRobinIndex = 0;

// 初始化 Worker UI
function initWorkers() {
    // 清除舊的 Worker
    workers.forEach(w => w.instance.terminate());
    workers = [];
    workersContainer.innerHTML = '';
    loadChart.innerHTML = '';

    const count = parseInt(workerCountInput.value, 10);

    for (let i = 0; i < count; i++) {
        // 模擬不同能力的 Worker (權重 1-3，越高越快)
        const power = Math.floor(Math.random() * 3) + 1;

        const workerData = {
            id: i,
            instance: new Worker('worker.js'),
            load: 0, // 當前正在處理的任務數
            completed: 0, // 已完成任務數
            power: power, // 運算能力權重
            element: createWorkerCard(i, power),
            barElement: createChartBar(i)
        };

        // 設定 Worker 訊息處理
        workerData.instance.onmessage = (e) => handleWorkerMessage(i, e.data);

        // 傳送能力參數給 Worker
        workerData.instance.postMessage({ type: 'init', power });

        workers.push(workerData);
    }
}

// 建立 Worker 卡片 UI
function createWorkerCard(id, power) {
    const div = document.createElement('div');
    div.className = 'worker-card';
    div.innerHTML = `
        <div class="worker-id">Worker #${id + 1}</div>
        <div class="worker-load">0</div>
        <div class="worker-status">能力值: ${power}x</div>
        <div class="worker-status">已完成: 0</div>
    `;
    workersContainer.appendChild(div);
    return div;
}

// 建立圖表條
function createChartBar(id) {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = '0%';
    bar.innerHTML = `<span class="chart-label">W${id + 1}</span>`;
    loadChart.appendChild(bar);
    return bar;
}

// 處理 Worker 訊息
function handleWorkerMessage(workerId, data) {
    const worker = workers[workerId];

    if (data.type === 'complete') {
        worker.load--;
        worker.completed++;
        stats.totalCompleted++;
        stats.totalTime += data.duration;

        // 更新 UI
        updateWorkerUI(worker);
        updateStatsUI();

        // 嘗試從佇列中獲取新任務 (如果有)
        processQueue();
    }
}

// 更新 Worker UI 顯示
function updateWorkerUI(worker) {
    const loadEl = worker.element.querySelector('.worker-load');
    const statusEl = worker.element.querySelectorAll('.worker-status')[1];

    loadEl.textContent = worker.load;
    statusEl.textContent = `已完成: ${worker.completed}`;

    if (worker.load > 0) {
        worker.element.classList.add('active');
        if (worker.load > 3) worker.element.classList.add('busy');
        else worker.element.classList.remove('busy');
    } else {
        worker.element.classList.remove('active', 'busy');
    }

    // 更新圖表高度 (假設最大負載為 10)
    const height = Math.min(worker.load * 10, 100);
    worker.barElement.style.height = `${height}%`;
}

// 更新整體統計 UI
function updateStatsUI() {
    totalTasksEl.textContent = stats.totalCompleted;
    if (stats.totalCompleted > 0) {
        const avg = Math.round(stats.totalTime / stats.totalCompleted);
        avgTimeEl.textContent = `${avg}ms`;
    }
}

// 計算吞吐量
function updateThroughput() {
    if (!isRunning) return;
    const now = Date.now();
    const elapsed = (now - stats.startTime) / 1000;
    if (elapsed > 0) {
        const tps = (stats.totalCompleted / elapsed).toFixed(1);
        throughputEl.textContent = `${tps}/s`;
    }
}

// 產生新任務
function generateTask() {
    // 任務複雜度 (100-2000ms)
    const complexity = Math.floor(Math.random() * 1900) + 100;
    const task = {
        id: Date.now(),
        complexity: complexity
    };

    // 分配任務
    dispatchTask(task);
}

// 分配任務核心邏輯
function dispatchTask(task) {
    const strategy = strategySelect.value;
    let selectedWorker = null;

    switch (strategy) {
        case 'round-robin':
            selectedWorker = workers[roundRobinIndex];
            roundRobinIndex = (roundRobinIndex + 1) % workers.length;
            break;

        case 'random':
            const randIndex = Math.floor(Math.random() * workers.length);
            selectedWorker = workers[randIndex];
            break;

        case 'least-connections':
            // 找出負載最小的 Worker
            selectedWorker = workers.reduce((prev, curr) => {
                return prev.load <= curr.load ? prev : curr;
            });
            break;

        case 'weighted-round-robin':
            // 簡單的加權輪詢實作
            // 這裡簡化為：根據 power 選擇負載/能力比率最小的
            selectedWorker = workers.reduce((prev, curr) => {
                const prevRatio = prev.load / prev.power;
                const currRatio = curr.load / curr.power;
                return prevRatio <= currRatio ? prev : curr;
            });
            break;
    }

    if (selectedWorker) {
        assignTaskToWorker(selectedWorker, task);
    } else {
        // 如果沒有可用 Worker (理論上不會發生)，加入佇列
        taskQueue.push(task);
        updateQueueUI();
    }
}

// 將任務指派給 Worker
function assignTaskToWorker(worker, task) {
    worker.load++;
    worker.instance.postMessage({ type: 'task', task });
    updateWorkerUI(worker);

    // 動畫效果：加入任務到佇列 UI 然後消失
    const item = document.createElement('div');
    item.className = 'task-item';
    taskQueueEl.appendChild(item);
    setTimeout(() => item.remove(), 100);
}

// 處理佇列中的任務 (如果有)
function processQueue() {
    if (taskQueue.length > 0) {
        const task = taskQueue.shift();
        updateQueueUI();
        dispatchTask(task);
    }
}

function updateQueueUI() {
    // 這裡只顯示前 10 個等待中的任務
    taskQueueEl.innerHTML = '';
    taskQueue.slice(0, 10).forEach(() => {
        const item = document.createElement('div');
        item.className = 'task-item';
        taskQueueEl.appendChild(item);
    });
}

// 開始模擬
function startSimulation() {
    if (isRunning) return;

    const workerCountChanged = workers.length !== parseInt(workerCountInput.value, 10);
    if (workerCountChanged || workers.length === 0) {
        initWorkers();
    }

    isRunning = true;
    stats = { totalCompleted: 0, totalTime: 0, startTime: Date.now() };
    updateStatsUI();

    // UI 狀態更新
    startBtn.disabled = true;
    stopBtn.disabled = false;
    addTaskBtn.disabled = false;
    workerCountInput.disabled = true;
    strategySelect.disabled = true;

    // 啟動任務生成器
    const rate = parseInt(taskRateInput.value, 10);
    taskGenerator = setInterval(generateTask, rate);

    // 啟動吞吐量計算
    throughputInterval = setInterval(updateThroughput, 1000);
}

// 停止模擬
function stopSimulation() {
    isRunning = false;
    clearInterval(taskGenerator);
    clearInterval(throughputInterval);

    startBtn.disabled = false;
    stopBtn.disabled = true;
    addTaskBtn.disabled = true;
    workerCountInput.disabled = false;
    strategySelect.disabled = false;
}

// 事件監聽
startBtn.addEventListener('click', startSimulation);
stopBtn.addEventListener('click', stopSimulation);
addTaskBtn.addEventListener('click', generateTask);

// 初始設定
initWorkers();
