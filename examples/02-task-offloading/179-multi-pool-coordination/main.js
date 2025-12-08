/**
 * 多池協調 - 主程式
 */

// Worker 池配置
const POOL_CONFIG = {
    io: { count: 4, color: '#4ecdc4', type: 'io', duration: [500, 1500] },
    cpu: { count: 2, color: '#ff6b6b', type: 'cpu', duration: [1500, 3000] },
    render: { count: 2, color: '#ffe66d', type: 'render', duration: [500, 1000] }
};

// 全局狀態
const pools = {
    io: { workers: [], queue: [] },
    cpu: { workers: [], queue: [] },
    render: { workers: [], queue: [] }
};

let autoMode = false;
let autoInterval = null;
let jobIdCounter = 1;

// 初始化
function init() {
    // 建立 Worker 池
    Object.keys(POOL_CONFIG).forEach(type => {
        const config = POOL_CONFIG[type];
        const container = document.getElementById(`${type}-workers`);

        for (let i = 0; i < config.count; i++) {
            const worker = createWorker(type, i, config.color);
            pools[type].workers.push(worker);
            container.appendChild(worker.element);
        }
    });

    // 綁定按鈕
    document.getElementById('add-job-btn').addEventListener('click', createJob);
    document.getElementById('auto-mode-btn').addEventListener('click', toggleAutoMode);
}

// 建立 Worker 實例
function createWorker(type, id, color) {
    const worker = new Worker('worker.js');

    // UI 元素
    const element = document.createElement('div');
    element.className = 'worker-node';
    element.style.color = color;
    element.textContent = `W${id + 1}`;

    const workerObj = {
        id,
        type,
        instance: worker,
        element,
        isBusy: false,
        currentJobId: null
    };

    worker.onmessage = (e) => handleWorkerMessage(workerObj, e.data);

    return workerObj;
}

// 處理 Worker 回傳訊息
function handleWorkerMessage(worker, data) {
    if (data.type === 'complete') {
        const { jobId, stage } = data;

        // 更新 Worker 狀態
        worker.isBusy = false;
        worker.currentJobId = null;
        worker.element.classList.remove('busy');

        // 調度該池的下一個任務
        scheduleNext(worker.type);

        // 將完成的作業移至下一階段
        moveToNextStage(jobId, stage);
    }
}

// 建立新作業 (進入第一階段)
function createJob() {
    const jobId = jobIdCounter++;
    const job = { id: jobId, stage: 'io', timestamp: Date.now() };

    addToQueue('io', job);
}

// 加入佇列
function addToQueue(type, job) {
    pools[type].queue.push(job);
    updateQueueUI(type);

    // 嘗試調度
    scheduleNext(type);
}

// 調度器：從佇列取出任務分配給空閒 Worker
function scheduleNext(type) {
    const pool = pools[type];

    // 如果佇列為空或沒有空閒 Worker，則返回
    if (pool.queue.length === 0) return;

    const freeWorker = pool.workers.find(w => !w.isBusy);
    if (!freeWorker) return;

    // 分配任務
    const job = pool.queue.shift();
    updateQueueUI(type);

    assignTask(freeWorker, job);
}

// 分配任務給 Worker
function assignTask(worker, job) {
    worker.isBusy = true;
    worker.currentJobId = job.id;
    worker.element.classList.add('busy');
    worker.element.title = `Job #${job.id}`;

    // 計算隨機執行時間
    const [min, max] = POOL_CONFIG[worker.type].duration;
    const duration = Math.floor(Math.random() * (max - min + 1)) + min;

    worker.instance.postMessage({
        type: 'process',
        jobId: job.id,
        stage: worker.type,
        duration: duration
    });
}

// 作業流轉邏輯
function moveToNextStage(jobId, currentStage) {
    let nextStage = null;

    if (currentStage === 'io') nextStage = 'cpu';
    else if (currentStage === 'cpu') nextStage = 'render';

    if (nextStage) {
        // 進入下一階段
        addToQueue(nextStage, { id: jobId, stage: nextStage });
    } else {
        // 作業完成
        completeJob(jobId);
    }
}

// 作業完成紀錄
function completeJob(jobId) {
    const container = document.getElementById('completed-jobs');
    const div = document.createElement('div');
    const time = new Date().toLocaleTimeString();
    div.style.borderBottom = '1px solid #333';
    div.style.padding = '5px';
    div.innerHTML = `<span style="color:var(--success-color)">✓ Job #${jobId}</span> 完成於 ${time}`;

    container.insertBefore(div, container.firstChild);

    // 保持列表長度
    if (container.children.length > 20) {
        container.removeChild(container.lastChild);
    }
}

// 更新佇列 UI
function updateQueueUI(type) {
    const pool = pools[type];
    const countEl = document.getElementById(`${type}-queue-count`);
    const listEl = document.getElementById(`${type}-queue-list`);

    countEl.textContent = pool.queue.length;

    // 顯示前 5 個等待作業
    listEl.innerHTML = '';
    pool.queue.slice(0, 5).forEach(job => {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.textContent = `Job #${job.id}`;
        listEl.appendChild(item);
    });

    if (pool.queue.length > 5) {
        const more = document.createElement('div');
        more.style.textAlign = 'center';
        more.style.fontSize = '0.8rem';
        more.textContent = `...還有 ${pool.queue.length - 5} 個`;
        listEl.appendChild(more);
    }
}

// 自動模式切換
function toggleAutoMode() {
    autoMode = !autoMode;
    const btn = document.getElementById('auto-mode-btn');

    if (autoMode) {
        btn.textContent = '自動模式: 開';
        btn.classList.replace('btn-secondary', 'btn-success');
        createJob(); // 立即開始一個
        autoInterval = setInterval(createJob, 1200);
    } else {
        btn.textContent = '自動模式: 關';
        btn.classList.replace('btn-success', 'btn-secondary');
        clearInterval(autoInterval);
    }
}

// 啟動
init();
