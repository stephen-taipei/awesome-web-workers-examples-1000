// 主執行緒代碼
const WORKER_COUNT = 4;
const workers = [];
const workerStates = [];
let totalTasks = 0;
let autoTaskInterval = null;

// 加權輪詢算法狀態
// 這裡我們使用 Nginx 的平滑加權輪詢算法 (Smooth Weighted Round-Robin)
// 也可以使用簡單的 WRR
// 為了展示效果，這裡使用經典的 WRR 邏輯
// 方法1 (簡單): 展開成數組 [0,0,0, 1,1, 2]，然後輪詢
// 方法2 (Nginx): current_weight += effective_weight; best = max(current_weight); best.current_weight -= total_weight;
// 這裡實現 Nginx 的平滑加權輪詢算法，因為它分佈更均勻
let wrrState = {
    currentWeights: [], // 每個 worker 當前的動態權重
    effectiveWeights: [], // 有效權重 (可以在運行時調整)
    totalWeight: 0
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initWorkers();
    initUI();
    log('系統初始化完成');
});

function initWorkers() {
    const workerInputs = document.getElementById('worker-inputs');
    const workersContainer = document.getElementById('workers-container');

    // 預設權重
    const defaultWeights = [5, 3, 1, 1];

    for (let i = 0; i < WORKER_COUNT; i++) {
        // 創建 Worker
        const worker = new Worker('worker.js');
        worker.onmessage = handleWorkerMessage(i);
        workers.push(worker);

        // 初始化狀態
        workerStates.push({
            id: i,
            weight: defaultWeights[i],
            tasksProcessed: 0,
            isBusy: false,
            currentTask: null
        });

        // 初始化 WRR 狀態
        wrrState.currentWeights.push(0);
        wrrState.effectiveWeights.push(defaultWeights[i]);
        wrrState.totalWeight += defaultWeights[i];

        // 創建配置 UI
        const inputGroup = document.createElement('div');
        inputGroup.className = 'worker-input-group';
        inputGroup.innerHTML = `
            <label>Worker ${i + 1}:</label>
            <input type="number" id="weight-${i}" value="${defaultWeights[i]}" min="1" max="100">
        `;
        workerInputs.appendChild(inputGroup);

        // 創建視覺化卡片
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.id = `worker-card-${i}`;
        card.innerHTML = `
            <div class="worker-header">
                <strong>Worker ${i + 1}</strong>
                <span class="worker-status idle" id="status-${i}">閒置</span>
            </div>
            <div class="worker-metrics">
                <div class="metric-row">
                    <span>權重:</span>
                    <span id="display-weight-${i}">${defaultWeights[i]}</span>
                </div>
                <div class="metric-row">
                    <span>已處理任務:</span>
                    <span id="tasks-${i}">0</span>
                </div>
                 <div class="metric-row">
                    <span>當前動態權重:</span>
                    <span id="current-w-weight-${i}">0</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-${i}"></div>
                </div>
            </div>
        `;
        workersContainer.appendChild(card);
    }
}

function handleWorkerMessage(workerId) {
    return function(e) {
        const { type, taskId, result } = e.data;

        if (type === 'completed') {
            const workerState = workerStates[workerId];
            workerState.isBusy = false;
            workerState.currentTask = null;
            workerState.tasksProcessed++;

            updateWorkerCard(workerId);
            log(`Worker ${workerId + 1} 完成任務 #${taskId}`);
        }
    };
}

function initUI() {
    document.getElementById('update-weights').addEventListener('click', updateWeights);
    document.getElementById('add-task').addEventListener('click', () => dispatchTask());
    document.getElementById('auto-task').addEventListener('click', toggleAutoTask);
}

function updateWeights() {
    wrrState.totalWeight = 0;

    for (let i = 0; i < WORKER_COUNT; i++) {
        const input = document.getElementById(`weight-${i}`);
        let weight = parseInt(input.value);
        if (weight < 1) weight = 1;

        workerStates[i].weight = weight;

        // 更新 WRR 狀態
        // 在 Nginx 算法中，effective_weight 通常初始化為 weight
        // 這裡簡單重置
        wrrState.effectiveWeights[i] = weight;
        wrrState.currentWeights[i] = 0; // 重置當前權重以避免突波
        wrrState.totalWeight += weight;

        updateWorkerCard(i);
    }
    log(`權重已更新。總權重: ${wrrState.totalWeight}`);
}

// 選擇最佳 Worker (Smooth Weighted Round-Robin)
function selectWorker() {
    let bestWorkerIndex = -1;
    let maxWeight = -Infinity;

    // 1. 對每個節點，current_weight += effective_weight
    for (let i = 0; i < WORKER_COUNT; i++) {
        wrrState.currentWeights[i] += wrrState.effectiveWeights[i];

        // 2. 選擇 current_weight 最大的節點
        if (wrrState.currentWeights[i] > maxWeight) {
            maxWeight = wrrState.currentWeights[i];
            bestWorkerIndex = i;
        }
    }

    // 3. 選中節點的 current_weight -= total_weight
    if (bestWorkerIndex !== -1) {
        wrrState.currentWeights[bestWorkerIndex] -= wrrState.totalWeight;
    }

    // 更新 UI 顯示 current weights
    for (let i = 0; i < WORKER_COUNT; i++) {
         document.getElementById(`current-w-weight-${i}`).textContent = wrrState.currentWeights[i];
    }

    return bestWorkerIndex;
}

function dispatchTask() {
    totalTasks++;
    document.getElementById('total-tasks').textContent = totalTasks;

    const selectedWorkerIndex = selectWorker();
    const worker = workers[selectedWorkerIndex];
    const workerState = workerStates[selectedWorkerIndex];

    const taskId = totalTasks;
    // 模擬任務時間 (500ms - 2000ms)
    const duration = Math.floor(Math.random() * 1500) + 500;

    workerState.isBusy = true;
    workerState.currentTask = taskId;

    worker.postMessage({
        type: 'task',
        taskId: taskId,
        duration: duration
    });

    updateWorkerCard(selectedWorkerIndex);

    // 更新狀態顯示
    const statusText = wrrState.currentWeights.map(w => w).join(', ');
    document.getElementById('wrr-state').textContent = `[${statusText}]`;

    log(`分配任務 #${taskId} 給 Worker ${selectedWorkerIndex + 1} (權重: ${workerState.weight})`);
}

function updateWorkerCard(id) {
    const state = workerStates[id];
    const statusEl = document.getElementById(`status-${id}`);
    const tasksEl = document.getElementById(`tasks-${id}`);
    const weightEl = document.getElementById(`display-weight-${id}`);
    const card = document.getElementById(`worker-card-${id}`);
    const progressFill = document.getElementById(`progress-${id}`);

    weightEl.textContent = state.weight;
    tasksEl.textContent = state.tasksProcessed;

    if (state.isBusy) {
        statusEl.textContent = '忙碌中';
        statusEl.className = 'worker-status busy';
        card.classList.add('active');
        progressFill.style.width = '100%';
        progressFill.style.transition = 'width 10s linear'; // 簡單模擬
    } else {
        statusEl.textContent = '閒置';
        statusEl.className = 'worker-status idle';
        card.classList.remove('active');
        progressFill.style.width = '0%';
        progressFill.style.transition = 'none';
    }
}

function toggleAutoTask() {
    if (autoTaskInterval) {
        clearInterval(autoTaskInterval);
        autoTaskInterval = null;
        log('自動任務已停止');
    } else {
        // 每 500ms 產生一個任務
        autoTaskInterval = setInterval(() => {
            dispatchTask();
        }, 500);
        log('自動任務已啟動');
    }
}

function log(message) {
    const logEl = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;

    logEl.insertBefore(entry, logEl.firstChild);
}
