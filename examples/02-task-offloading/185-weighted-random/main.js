// 主執行緒代碼
const WORKER_COUNT = 4;
const workers = [];
const workerStates = [];
let totalTasks = 0;
let autoTaskInterval = null;

// 加權隨機狀態
let weights = [];
let totalWeight = 0;

document.addEventListener('DOMContentLoaded', () => {
    initWorkers();
    initUI();
    log('系統初始化完成');
});

function initWorkers() {
    const workerInputs = document.getElementById('worker-inputs');
    const workersContainer = document.getElementById('workers-container');

    // 預設權重
    const defaultWeights = [10, 20, 30, 40];

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
            isBusy: false
        });

        // 創建 UI
        const inputGroup = document.createElement('div');
        inputGroup.className = 'worker-input-group';
        inputGroup.innerHTML = `
            <label>Worker ${i + 1}:</label>
            <input type="number" id="weight-${i}" value="${defaultWeights[i]}" min="1" max="100">
        `;
        workerInputs.appendChild(inputGroup);

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
                    <span>選擇機率:</span>
                    <span id="prob-${i}">0%</span>
                </div>
                <div class="prob-bar-container">
                    <div class="prob-bar" id="prob-bar-${i}" style="width: 0%"></div>
                </div>
                <div class="metric-row" style="margin-top: 10px;">
                    <span>已處理任務:</span>
                    <span id="tasks-${i}">0</span>
                </div>
                <div class="metric-row">
                    <span>實際佔比:</span>
                    <span id="real-ratio-${i}">0%</span>
                </div>
            </div>
        `;
        workersContainer.appendChild(card);
    }

    updateWeights();
}

function handleWorkerMessage(workerId) {
    return function(e) {
        const { type, taskId } = e.data;

        if (type === 'completed') {
            const workerState = workerStates[workerId];
            workerState.isBusy = false;

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
    weights = [];
    totalWeight = 0;

    for (let i = 0; i < WORKER_COUNT; i++) {
        const input = document.getElementById(`weight-${i}`);
        let weight = parseInt(input.value);
        if (weight < 1) weight = 1;

        workerStates[i].weight = weight;
        weights.push(weight);
        totalWeight += weight;
    }

    // 更新機率顯示
    const probDist = [];
    for (let i = 0; i < WORKER_COUNT; i++) {
        const prob = (weights[i] / totalWeight) * 100;
        document.getElementById(`prob-${i}`).textContent = prob.toFixed(1) + '%';
        document.getElementById(`prob-bar-${i}`).style.width = prob + '%';
        probDist.push(`W${i+1}: ${prob.toFixed(1)}%`);

        // 同時更新權重顯示
        document.getElementById(`display-weight-${i}`).textContent = weights[i];
    }

    document.getElementById('prob-dist').textContent = probDist.join(', ');
    log(`權重已更新。總權重: ${totalWeight}`);
}

// 加權隨機選擇
function selectWorker() {
    // 產生 0 到 totalWeight 之間的隨機數
    let random = Math.random() * totalWeight;

    for (let i = 0; i < WORKER_COUNT; i++) {
        random -= weights[i];
        if (random <= 0) {
            return i;
        }
    }

    return WORKER_COUNT - 1; // 應該不會執行到這裡，防止浮點數誤差
}

function dispatchTask() {
    totalTasks++;
    document.getElementById('total-tasks').textContent = totalTasks;

    const selectedWorkerIndex = selectWorker();
    const worker = workers[selectedWorkerIndex];
    const workerState = workerStates[selectedWorkerIndex];

    const taskId = totalTasks;
    // 模擬任務時間 (500ms - 1500ms)
    const duration = Math.floor(Math.random() * 1000) + 500;

    workerState.isBusy = true;
    workerState.tasksProcessed++;

    worker.postMessage({
        type: 'task',
        taskId: taskId,
        duration: duration
    });

    // 更新所有 Worker 的實際佔比
    for (let i = 0; i < WORKER_COUNT; i++) {
        updateWorkerCard(i);
    }

    log(`分配任務 #${taskId} 給 Worker ${selectedWorkerIndex + 1} (機率權重: ${workerState.weight})`);
}

function updateWorkerCard(id) {
    const state = workerStates[id];
    const statusEl = document.getElementById(`status-${id}`);
    const tasksEl = document.getElementById(`tasks-${id}`);
    const card = document.getElementById(`worker-card-${id}`);
    const realRatioEl = document.getElementById(`real-ratio-${id}`);

    tasksEl.textContent = state.tasksProcessed;

    const ratio = totalTasks > 0 ? (state.tasksProcessed / totalTasks * 100).toFixed(1) : 0;
    realRatioEl.textContent = ratio + '%';

    if (state.isBusy) {
        statusEl.textContent = '處理中';
        statusEl.className = 'worker-status busy';
        card.classList.add('active');
    } else {
        statusEl.textContent = '閒置';
        statusEl.className = 'worker-status idle';
        card.classList.remove('active');
    }
}

function toggleAutoTask() {
    if (autoTaskInterval) {
        clearInterval(autoTaskInterval);
        autoTaskInterval = null;
        log('自動任務已停止');
    } else {
        autoTaskInterval = setInterval(() => {
            dispatchTask();
        }, 300); // 速度稍快一點，為了看統計分佈
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
