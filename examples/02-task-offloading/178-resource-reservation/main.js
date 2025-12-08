/**
 * 資源預留 - 主程式
 */

// DOM 元素
const totalWorkersInput = document.getElementById('total-workers');
const reservedCountInput = document.getElementById('reserved-count');
const applyConfigBtn = document.getElementById('apply-config');
const addNormalTaskBtn = document.getElementById('add-normal-task');
const addCriticalTaskBtn = document.getElementById('add-critical-task');
const floodNormalBtn = document.getElementById('flood-normal');
const sharedPoolEl = document.getElementById('shared-pool');
const reservedPoolEl = document.getElementById('reserved-pool');
const sharedCountDisplay = document.getElementById('shared-count');
const reservedCountDisplay = document.getElementById('reserved-count-display');
const sharedQueueInfo = document.getElementById('shared-queue');
const reservedQueueInfo = document.getElementById('reserved-queue');
const systemLog = document.getElementById('system-log');

// 狀態變數
let sharedWorkers = [];
let reservedWorkers = [];
let sharedQueue = [];
let reservedQueue = [];

// Worker 類別封裝
class WorkerNode {
    constructor(id, type) {
        this.id = id;
        this.type = type; // 'shared' or 'reserved'
        this.worker = new Worker('worker.js');
        this.isBusy = false;
        this.element = this.createUI();

        this.worker.onmessage = (e) => this.handleMessage(e);
    }

    createUI() {
        const div = document.createElement('div');
        div.className = 'worker-box';
        div.textContent = `W${this.id}`;
        return div;
    }

    run(task) {
        if (this.isBusy) return false;

        this.isBusy = true;
        this.element.classList.add(this.type === 'reserved' ? 'reserved-busy' : 'busy');
        this.worker.postMessage({ type: 'task', duration: task.duration, id: task.id });

        log(`[${task.priority === 'high' ? '關鍵' : '普通'}] 任務 ${task.id} 分配給 Worker ${this.id} (${this.type})`);
        return true;
    }

    handleMessage(e) {
        const { type, taskId } = e.data;
        if (type === 'complete') {
            this.isBusy = false;
            this.element.classList.remove('busy', 'reserved-busy');

            // 任務完成後，嘗試從佇列獲取新任務
            scheduler.onWorkerFree(this);
        }
    }

    terminate() {
        this.worker.terminate();
        this.element.remove();
    }
}

// 調度器
const scheduler = {
    init(total, reserved) {
        // 清理舊資源
        [...sharedWorkers, ...reservedWorkers].forEach(w => w.terminate());
        sharedWorkers = [];
        reservedWorkers = [];
        sharedQueue = [];
        reservedQueue = [];
        sharedPoolEl.innerHTML = '';
        reservedPoolEl.innerHTML = '';

        // 創建 Worker
        const sharedCount = total - reserved;

        for (let i = 0; i < sharedCount; i++) {
            const w = new WorkerNode(i + 1, 'shared');
            sharedWorkers.push(w);
            sharedPoolEl.appendChild(w.element);
        }

        for (let i = 0; i < reserved; i++) {
            const w = new WorkerNode(sharedCount + i + 1, 'reserved');
            reservedWorkers.push(w);
            reservedPoolEl.appendChild(w.element);
        }

        // 更新 UI
        sharedCountDisplay.textContent = `${sharedCount} Workers`;
        reservedCountDisplay.textContent = `${reserved} Workers`;
        this.updateQueueUI();

        log(`系統初始化: ${total} Workers (${sharedCount} 共用, ${reserved} 預留)`);
    },

    addTask(priority) {
        const task = {
            id: Date.now().toString().slice(-6),
            duration: Math.floor(Math.random() * 2000) + 1000, // 1-3秒
            priority: priority
        };

        if (priority === 'high') {
            this.scheduleCriticalTask(task);
        } else {
            this.scheduleNormalTask(task);
        }
    },

    scheduleNormalTask(task) {
        // 普通任務只能用共用池
        const worker = sharedWorkers.find(w => !w.isBusy);
        if (worker) {
            worker.run(task);
        } else {
            sharedQueue.push(task);
            this.updateQueueUI();
            log(`[普通] 共用池已滿，任務 ${task.id} 進入佇列`);
        }
    },

    scheduleCriticalTask(task) {
        // 關鍵任務優先用預留池
        let worker = reservedWorkers.find(w => !w.isBusy);

        if (!worker) {
            // 預留池滿了，嘗試借用共用池
            worker = sharedWorkers.find(w => !w.isBusy);
            if (worker) {
                log(`[關鍵] 預留池已滿，任務 ${task.id} 借用共用 Worker ${worker.id}`);
            }
        }

        if (worker) {
            worker.run(task);
        } else {
            reservedQueue.push(task);
            this.updateQueueUI();
            log(`[關鍵] 所有資源已滿，任務 ${task.id} 進入高優先佇列`);
        }
    },

    onWorkerFree(worker) {
        // Worker 釋放時的調度邏輯
        let nextTask = null;

        if (worker.type === 'reserved') {
            // 預留 Worker 優先處理高優先佇列
            if (reservedQueue.length > 0) {
                nextTask = reservedQueue.shift();
            }
            // 如果高優先佇列空了，預留資源通常不處理普通任務 (保持隨時可用)
            // 這裡我們策略設為：預留資源只處理關鍵任務
        } else {
            // 共用 Worker
            // 策略：如果高優先佇列有積壓，優先支援 (搶佔式)
            // 這裡簡單實作：優先檢查高優先佇列
            if (reservedQueue.length > 0) {
                nextTask = reservedQueue.shift();
                log(`[調度] 共用 Worker ${worker.id} 支援處理關鍵任務`);
            } else if (sharedQueue.length > 0) {
                nextTask = sharedQueue.shift();
            }
        }

        if (nextTask) {
            this.updateQueueUI();
            worker.run(nextTask);
        }
    },

    updateQueueUI() {
        sharedQueueInfo.textContent = `等待佇列: ${sharedQueue.length}`;
        reservedQueueInfo.textContent = `等待佇列: ${reservedQueue.length}`;
    }
};

function log(msg) {
    const div = document.createElement('div');
    div.textContent = `> ${msg}`;
    systemLog.appendChild(div);
    systemLog.scrollTop = systemLog.scrollHeight;
}

// 事件綁定
applyConfigBtn.addEventListener('click', () => {
    const total = parseInt(totalWorkersInput.value);
    const reserved = parseInt(reservedCountInput.value);

    if (reserved >= total) {
        alert('預留數量必須小於總數量');
        return;
    }

    scheduler.init(total, reserved);
});

addNormalTaskBtn.addEventListener('click', () => scheduler.addTask('normal'));
addCriticalTaskBtn.addEventListener('click', () => scheduler.addTask('high'));

floodNormalBtn.addEventListener('click', () => {
    log('--- 發動普通任務洪流 (20個) ---');
    for(let i=0; i<20; i++) {
        setTimeout(() => scheduler.addTask('normal'), i * 50);
    }
});

// 初始化
scheduler.init(10, 3);
log('提示：點擊「普通任務洪流」填滿共用池，然後點擊「關鍵任務」觀察預留池運作。');
