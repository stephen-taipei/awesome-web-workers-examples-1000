// 主執行緒邏輯
const cpuWorker = new Worker('cpu-worker.js');
const ioWorker = new Worker('io-worker.js');

const cpuQueueCountEl = document.getElementById('cpu-queue-count');
const ioQueueCountEl = document.getElementById('io-queue-count');
const cpuStatusEl = document.getElementById('cpu-worker-status');
const ioStatusEl = document.getElementById('io-worker-status');
const taskLogEl = document.getElementById('task-log');

let cpuQueue = 0;
let ioQueue = 0;

function log(type, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${message}</span>`;
    taskLogEl.prepend(entry);
}

function updateStatus() {
    cpuQueueCountEl.textContent = cpuQueue;
    ioQueueCountEl.textContent = ioQueue;

    if (cpuQueue > 0) {
        cpuStatusEl.textContent = '工作中';
        cpuStatusEl.className = 'worker-status working';
    } else {
        cpuStatusEl.textContent = '閒置';
        cpuStatusEl.className = 'worker-status idle';
    }

    if (ioQueue > 0) {
        ioStatusEl.textContent = '工作中';
        ioStatusEl.className = 'worker-status working';
    } else {
        ioStatusEl.textContent = '閒置';
        ioStatusEl.className = 'worker-status idle';
    }
}

cpuWorker.onmessage = function(e) {
    const { id, result, duration } = e.data;
    cpuQueue--;
    updateStatus();
    log('cpu', `CPU 任務 #${id} 完成: 結果=${result} (耗時 ${duration}ms)`);
};

ioWorker.onmessage = function(e) {
    const { id, status, duration } = e.data;
    ioQueue--;
    updateStatus();
    log('io', `IO 任務 #${id} 完成: 狀態=${status} (耗時 ${duration}ms)`);
};

let taskIdCounter = 1;

function submitTask(type, complexity) {
    const taskId = taskIdCounter++;

    if (type === 'cpu') {
        cpuQueue++;
        log('cpu', `提交 CPU 任務 #${taskId} (複雜度: ${complexity})`);
        cpuWorker.postMessage({ id: taskId, complexity });
    } else if (type === 'io') {
        ioQueue++;
        log('io', `提交 IO 任務 #${taskId} (複雜度: ${complexity})`);
        ioWorker.postMessage({ id: taskId, complexity });
    }
    updateStatus();
}

document.getElementById('add-task-btn').addEventListener('click', () => {
    const type = document.getElementById('task-type').value;
    const complexity = document.getElementById('task-complexity').value;
    submitTask(type, complexity);
});

document.getElementById('random-task-btn').addEventListener('click', () => {
    for (let i = 0; i < 10; i++) {
        const type = Math.random() > 0.5 ? 'cpu' : 'io';
        const complexities = ['low', 'medium', 'high'];
        const complexity = complexities[Math.floor(Math.random() * 3)];
        submitTask(type, complexity);
    }
});
