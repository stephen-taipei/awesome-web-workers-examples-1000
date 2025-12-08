// 主執行緒代碼
const WORKER_COUNT = 4;
const workers = [];
const workerStates = [];
let totalTasks = 0;
let autoTaskInterval = null;

// 指數移動平均 (Exponential Moving Average) 的 alpha 值
// 用於平滑響應時間計算，避免單次異常值影響過大
const EMA_ALPHA = 0.3;

document.addEventListener('DOMContentLoaded', () => {
    initWorkers();
    initUI();
    log('系統初始化完成');
    updateBestChoice();
});

function initWorkers() {
    const workerInputs = document.getElementById('worker-inputs');
    const workersContainer = document.getElementById('workers-container');

    // 預設模擬延遲 (ms)
    const defaultLatencies = [100, 300, 600, 1000];

    for (let i = 0; i < WORKER_COUNT; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = handleWorkerMessage(i);
        workers.push(worker);

        workerStates.push({
            id: i,
            baseLatency: defaultLatencies[i], // 模擬的基礎網絡/處理延遲
            avgResponseTime: 0, // 平均響應時間
            activeTasks: 0, // 當前並行任務數 (如果是並行模型)
            tasksProcessed: 0,
            lastResponseTime: 0
        });

        // UI: 延遲滑桿
        const inputGroup = document.createElement('div');
        inputGroup.className = 'worker-input-group';
        inputGroup.innerHTML = `
            <label>Worker ${i + 1}:</label>
            <input type="range" id="latency-${i}" min="10" max="2000" step="10" value="${defaultLatencies[i]}">
            <span class="latency-value" id="val-${i}">${defaultLatencies[i]}ms</span>
        `;
        workerInputs.appendChild(inputGroup);

        // UI: Worker 卡片
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
                    <span>設定延遲:</span>
                    <span id="setting-${i}">${defaultLatencies[i]}ms</span>
                </div>
                <div class="metric-row">
                    <span>上次響應:</span>
                    <span id="last-${i}">-</span>
                </div>
                <div class="metric-row">
                    <span>任務計數:</span>
                    <span id="tasks-${i}">0</span>
                </div>
                <div class="metric-row main">
                    <span>EMA 響應時間:</span>
                    <span id="ema-${i}">0ms</span>
                </div>
            </div>
        `;
        workersContainer.appendChild(card);

        // 監聽滑桿變化
        document.getElementById(`latency-${i}`).addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            document.getElementById(`val-${i}`).textContent = `${val}ms`;
            document.getElementById(`setting-${i}`).textContent = `${val}ms`;
            workerStates[i].baseLatency = val;
        });
    }
}

function handleWorkerMessage(workerId) {
    return function(e) {
        const { type, taskId, startTime } = e.data;

        if (type === 'completed') {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            const state = workerStates[workerId];
            state.activeTasks--;
            state.tasksProcessed++;
            state.lastResponseTime = responseTime;

            // 更新 EMA (Exponential Moving Average)
            // 如果是第一次，直接設為當前值
            if (state.avgResponseTime === 0) {
                state.avgResponseTime = responseTime;
            } else {
                state.avgResponseTime = (EMA_ALPHA * responseTime) + ((1 - EMA_ALPHA) * state.avgResponseTime);
            }

            updateWorkerCard(workerId);
            updateBestChoice();
            log(`Worker ${workerId + 1} 完成任務 #${taskId}，耗時 ${responseTime.toFixed(1)}ms`);
        }
    };
}

function initUI() {
    document.getElementById('add-task').addEventListener('click', () => dispatchTask());
    document.getElementById('auto-task').addEventListener('click', toggleAutoTask);
    document.getElementById('reset-stats').addEventListener('click', resetStats);
}

// 選擇最佳 Worker：最小響應時間 (Least Response Time)
// 這裡我們可以使用簡單的預測模型：預計完成時間 = 平均響應時間 * (當前排隊數 + 1)
// 或者在簡單場景下，直接找 avgResponseTime 最小且空閒的。
// 為了演示 "基於響應時間"，我們直接使用 EMA 響應時間作為指標。
// 如果 Worker 忙碌，我們可能會增加一些懲罰權重。
function selectWorker() {
    let bestWorkerIndex = -1;
    let minScore = Infinity;

    for (let i = 0; i < WORKER_COUNT; i++) {
        const state = workerStates[i];

        // 評分標準：EMA 響應時間
        // 如果還沒有數據 (avgResponseTime == 0)，給予一個初始估計值或優先嘗試
        let score = state.avgResponseTime;

        if (score === 0) {
            // 對於還沒有數據的節點，我們可以給一個較低的初始分，鼓勵探索
            // 或者設為 0，讓它們優先被選中
            score = 0;
        }

        // 如果 Worker 正忙，我們加上懲罰，假設它還需要 avgResponseTime 才能完成
        // 這變成了 "最小連接數 + 響應時間" 的混合變體
        // 這裡為了純粹演示響應時間影響，我們先只看 avgResponseTime
        // 但為了避免全部塞給同一個剛開始很快的 Worker，我們還是要考慮它是否忙碌
        if (state.activeTasks > 0) {
            // 簡單估計：如果它正忙，新任務需要等待它完成
             score += (state.avgResponseTime || 100) * state.activeTasks;
        }

        if (score < minScore) {
            minScore = score;
            bestWorkerIndex = i;
        }
    }

    return bestWorkerIndex;
}

function dispatchTask() {
    totalTasks++;
    document.getElementById('total-tasks').textContent = totalTasks;

    const selectedWorkerIndex = selectWorker();
    const worker = workers[selectedWorkerIndex];
    const state = workerStates[selectedWorkerIndex];

    const taskId = totalTasks;
    // 任務實際耗時 = Worker 基礎延遲 + 隨機波動
    // 這裡我們把 baseLatency 傳給 worker 模擬
    const randomNoise = Math.floor(Math.random() * 50); // 0-50ms 波動
    const simulatedLatency = state.baseLatency + randomNoise;

    state.activeTasks++;

    worker.postMessage({
        type: 'task',
        taskId: taskId,
        duration: simulatedLatency,
        startTime: performance.now()
    });

    updateWorkerCard(selectedWorkerIndex);
    updateBestChoice(); // 更新視覺提示

    log(`分配任務 #${taskId} 給 Worker ${selectedWorkerIndex + 1} (預估延遲: ${simulatedLatency}ms)`);
}

function updateWorkerCard(id) {
    const state = workerStates[id];
    const statusEl = document.getElementById(`status-${id}`);
    const tasksEl = document.getElementById(`tasks-${id}`);
    const lastEl = document.getElementById(`last-${id}`);
    const emaEl = document.getElementById(`ema-${id}`);
    const card = document.getElementById(`worker-card-${id}`);

    tasksEl.textContent = state.tasksProcessed;
    lastEl.textContent = state.lastResponseTime > 0 ? `${state.lastResponseTime.toFixed(0)}ms` : '-';
    emaEl.textContent = `${state.avgResponseTime.toFixed(1)}ms`;

    if (state.activeTasks > 0) {
        statusEl.textContent = `忙碌 (${state.activeTasks})`;
        statusEl.className = 'worker-status busy';
        card.classList.add('active');
    } else {
        statusEl.textContent = '閒置';
        statusEl.className = 'worker-status idle';
        card.classList.remove('active');
    }
}

// 高亮顯示當前最佳選擇
function updateBestChoice() {
    const bestIndex = selectWorker();

    // 移除所有 best-choice class
    document.querySelectorAll('.worker-card').forEach(el => el.classList.remove('best-choice'));

    // 添加到最佳 worker
    if (bestIndex !== -1) {
        document.getElementById(`worker-card-${bestIndex}`).classList.add('best-choice');
    }
}

function resetStats() {
    for (let i = 0; i < WORKER_COUNT; i++) {
        workerStates[i].avgResponseTime = 0;
        workerStates[i].tasksProcessed = 0;
        workerStates[i].lastResponseTime = 0;
        updateWorkerCard(i);
    }
    totalTasks = 0;
    document.getElementById('total-tasks').textContent = 0;
    log('統計數據已重置');
    updateBestChoice();
}

function toggleAutoTask() {
    if (autoTaskInterval) {
        clearInterval(autoTaskInterval);
        autoTaskInterval = null;
        log('自動任務已停止');
    } else {
        autoTaskInterval = setInterval(() => {
            dispatchTask();
        }, 800);
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
