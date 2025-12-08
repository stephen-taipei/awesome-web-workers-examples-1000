// 主執行緒代碼
const WORKER_COUNT = 4;
const workers = [];
const workerStates = [];
let totalTasks = 0;
let rejectedTasks = 0;
let autoTaskInterval = null;

// 定義不同規模的 Worker 容量 (模擬)
// capacity 用於計算百分比，實際上所有 Worker 都模擬成一樣
const WORKER_CAPACITIES = [
    { cpu: 100, mem: 100 }, // 標準
    { cpu: 150, mem: 150 }, // 強力
    { cpu: 80,  mem: 80  }, // 弱小
    { cpu: 120, mem: 200 }  // 高內存
];

// 任務資源消耗定義
const TASK_TYPES = {
    'small': { cpu: 10, mem: 5, duration: 1000 },
    'medium': { cpu: 30, mem: 20, duration: 2000 },
    'large': { cpu: 60, mem: 40, duration: 3000 },
    'huge': { cpu: 90, mem: 80, duration: 4000 }
};

document.addEventListener('DOMContentLoaded', () => {
    initWorkers();
    initUI();
    log('系統初始化完成');
});

function initWorkers() {
    const workerInputs = document.getElementById('worker-inputs');
    const workersContainer = document.getElementById('workers-container');

    for (let i = 0; i < WORKER_COUNT; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = handleWorkerMessage(i);
        workers.push(worker);

        const capacity = WORKER_CAPACITIES[i];

        workerStates.push({
            id: i,
            capacity: capacity,
            used: { cpu: 0, mem: 0 },
            tasks: []
        });

        // UI: 顯示 Worker 容量信息
        const inputGroup = document.createElement('div');
        inputGroup.className = 'worker-input-group';
        inputGroup.innerHTML = `
            <label>Worker ${i + 1}:</label>
            <span>CPU: ${capacity.cpu}, MEM: ${capacity.mem}</span>
        `;
        workerInputs.appendChild(inputGroup);

        // UI: Worker 卡片
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.id = `worker-card-${i}`;
        card.innerHTML = `
            <div class="worker-header">
                <strong>Worker ${i + 1}</strong>
                <span class="worker-status" id="status-${i}">正常</span>
            </div>
            <div class="worker-metrics">
                <div class="metric-bar-group">
                    <div class="metric-label">
                        <span>CPU 使用率</span>
                        <span id="cpu-text-${i}">0 / ${capacity.cpu}</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill cpu-fill" id="cpu-bar-${i}" style="width: 0%"></div>
                    </div>
                </div>
                <div class="metric-bar-group">
                    <div class="metric-label">
                        <span>Memory 使用率</span>
                        <span id="mem-text-${i}">0 / ${capacity.mem}</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill mem-fill" id="mem-bar-${i}" style="width: 0%"></div>
                    </div>
                </div>
                <div class="metric-row">
                    <span>運行中任務:</span>
                    <span id="tasks-${i}">0</span>
                </div>
            </div>
        `;
        workersContainer.appendChild(card);
    }
}

function handleWorkerMessage(workerId) {
    return function(e) {
        const { type, taskId, releasedResource } = e.data;

        if (type === 'completed') {
            const state = workerStates[workerId];

            // 釋放資源
            if (releasedResource) {
                state.used.cpu = Math.max(0, state.used.cpu - releasedResource.cpu);
                state.used.mem = Math.max(0, state.used.mem - releasedResource.mem);

                // 移除任務記錄
                state.tasks = state.tasks.filter(id => id !== taskId);

                updateWorkerCard(workerId);
                log(`Worker ${workerId + 1} 完成任務 #${taskId}，釋放 CPU:${releasedResource.cpu}, MEM:${releasedResource.mem}`);
            }
        }
    };
}

function initUI() {
    document.getElementById('add-task').addEventListener('click', () => dispatchTask());
    document.getElementById('auto-task').addEventListener('click', toggleAutoTask);
}

// 資源感知調度算法
function selectWorker(requiredCpu, requiredMem) {
    let bestWorkerIndex = -1;
    let maxScore = -Infinity; // 分數越高越好 (剩餘資源越多)

    for (let i = 0; i < WORKER_COUNT; i++) {
        const state = workerStates[i];

        // 1. 檢查是否有足夠的剩餘資源
        const remainingCpu = state.capacity.cpu - state.used.cpu;
        const remainingMem = state.capacity.mem - state.used.mem;

        if (remainingCpu >= requiredCpu && remainingMem >= requiredMem) {
            // 2. 計算評分：最小剩餘資源最大化 (Max-Min Fairness 變體)
            // 或者簡單地：選擇剩餘資源比例最高的
            const cpuRatio = remainingCpu / state.capacity.cpu;
            const memRatio = remainingMem / state.capacity.mem;

            // 綜合分數，這裡簡單取兩者的最小值，確保木桶效應
            // 這會傾向於保持資源使用的平衡
            const score = Math.min(cpuRatio, memRatio);

            if (score > maxScore) {
                maxScore = score;
                bestWorkerIndex = i;
            }
        }
    }

    return bestWorkerIndex;
}

function dispatchTask() {
    totalTasks++;
    document.getElementById('total-tasks').textContent = totalTasks;

    const taskType = document.getElementById('task-size').value;
    const resource = TASK_TYPES[taskType];

    // 嘗試找到合適的 Worker
    const selectedWorkerIndex = selectWorker(resource.cpu, resource.mem);

    if (selectedWorkerIndex === -1) {
        rejectedTasks++;
        document.getElementById('rejected-tasks').textContent = rejectedTasks;
        log(`<span class="error-msg">任務 #${totalTasks} (${taskType}) 被拒絕：無可用資源</span>`);
        return;
    }

    const worker = workers[selectedWorkerIndex];
    const state = workerStates[selectedWorkerIndex];
    const taskId = totalTasks;

    // 預佔用資源
    state.used.cpu += resource.cpu;
    state.used.mem += resource.mem;
    state.tasks.push(taskId);

    // 發送任務
    worker.postMessage({
        type: 'task',
        taskId: taskId,
        resource: resource,
        duration: resource.duration + (Math.random() * 500) // 隨機一點波動
    });

    updateWorkerCard(selectedWorkerIndex);

    log(`分配任務 #${taskId} (${taskType}) 給 Worker ${selectedWorkerIndex + 1} (負載: C${resource.cpu}/M${resource.mem})`);
}

function updateWorkerCard(id) {
    const state = workerStates[id];
    const card = document.getElementById(`worker-card-${id}`);

    // 計算百分比
    const cpuPct = (state.used.cpu / state.capacity.cpu) * 100;
    const memPct = (state.used.mem / state.capacity.mem) * 100;

    // 更新文字
    document.getElementById(`cpu-text-${id}`).textContent = `${state.used.cpu.toFixed(0)} / ${state.capacity.cpu}`;
    document.getElementById(`mem-text-${id}`).textContent = `${state.used.mem.toFixed(0)} / ${state.capacity.mem}`;
    document.getElementById(`tasks-${id}`).textContent = state.tasks.length;

    // 更新進度條
    updateBar(`cpu-bar-${id}`, cpuPct);
    updateBar(`mem-bar-${id}`, memPct);

    // 更新狀態
    if (cpuPct > 90 || memPct > 90) {
        card.classList.add('overloaded');
        document.getElementById(`status-${id}`).textContent = '高負載';
    } else {
        card.classList.remove('overloaded');
        document.getElementById(`status-${id}`).textContent = '正常';
    }
}

function updateBar(id, pct) {
    const bar = document.getElementById(id);
    bar.style.width = `${Math.min(pct, 100)}%`;

    bar.className = 'progress-fill ' + (id.includes('cpu') ? 'cpu-fill' : 'mem-fill');
    if (pct > 90) bar.classList.add('danger');
    else if (pct > 70) bar.classList.add('warning');
}

function toggleAutoTask() {
    if (autoTaskInterval) {
        clearInterval(autoTaskInterval);
        autoTaskInterval = null;
        log('自動任務已停止');
    } else {
        autoTaskInterval = setInterval(() => {
            // 隨機選擇任務類型
            const types = ['small', 'medium', 'medium', 'large', 'small'];
            const type = types[Math.floor(Math.random() * types.length)];
            document.getElementById('task-size').value = type;
            dispatchTask();
        }, 600);
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
