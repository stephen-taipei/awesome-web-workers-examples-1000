class WorkerManager {
    constructor() {
        this.workers = new Map(); // id -> workerData
        this.nextId = 1;
        this.HEARTBEAT_INTERVAL = 2000; // Send ping every 2s
        this.HEARTBEAT_TIMEOUT = 1000;  // Wait 1s for pong
    }

    addWorker() {
        const id = this.nextId++;
        const worker = new Worker('worker.js');

        const workerData = {
            id,
            worker,
            status: 'healthy', // healthy, unhealthy, dead
            lastPing: 0,
            lastPong: 0,
            missedHeartbeats: 0
        };

        worker.onmessage = (e) => this.handleMessage(workerData, e.data);
        worker.onerror = (e) => this.handleError(workerData, e);

        this.workers.set(id, workerData);
        this.createWorkerUI(workerData);
        this.startHeartbeat(workerData);

        log(`Worker #${id} 已啟動`);
    }

    handleMessage(workerData, data) {
        if (data.type === 'pong') {
            workerData.lastPong = Date.now();
            workerData.status = 'healthy';
            workerData.missedHeartbeats = 0;
            this.updateWorkerUI(workerData);
            // log(`Worker #${workerData.id} Pong received`);
        } else if (data.type === 'unfrozen') {
            log(`Worker #${workerData.id} 解凍: ${data.message}`);
        }
    }

    handleError(workerData, error) {
        log(`Worker #${workerData.id} 發生錯誤: ${error.message}`, true);
        workerData.status = 'dead';
        this.updateWorkerUI(workerData);
        this.stopHeartbeat(workerData);
    }

    startHeartbeat(workerData) {
        // Initial ping
        this.pingWorker(workerData);

        workerData.heartbeatInterval = setInterval(() => {
            this.checkHealth(workerData);
            this.pingWorker(workerData);
        }, this.HEARTBEAT_INTERVAL);
    }

    stopHeartbeat(workerData) {
        if (workerData.heartbeatInterval) {
            clearInterval(workerData.heartbeatInterval);
            workerData.heartbeatInterval = null;
        }
    }

    pingWorker(workerData) {
        if (workerData.status === 'dead') return;

        workerData.lastPing = Date.now();
        workerData.worker.postMessage({ type: 'ping' });
    }

    checkHealth(workerData) {
        if (workerData.status === 'dead') return;

        // If we sent a ping but haven't received a pong since then (allowing for some delay)
        // Note: This logic assumes simple request/response.
        // A better check is: if (now - lastPong) > threshold

        const timeSinceLastPong = Date.now() - workerData.lastPong;

        // If it's the very first ping, lastPong is 0, so we check if lastPing was long ago
        if (workerData.lastPong === 0) {
             if (Date.now() - workerData.lastPing > this.HEARTBEAT_TIMEOUT) {
                 this.markUnhealthy(workerData);
             }
             return;
        }

        if (timeSinceLastPong > (this.HEARTBEAT_INTERVAL + this.HEARTBEAT_TIMEOUT)) {
            this.markUnhealthy(workerData);
        }
    }

    markUnhealthy(workerData) {
        if (workerData.status !== 'unhealthy') {
            workerData.status = 'unhealthy';
            workerData.missedHeartbeats++;
            log(`Worker #${workerData.id} 健康檢查失敗! (無回應)`, true);
            this.updateWorkerUI(workerData);
        }
    }

    simulateFreeze(id) {
        const workerData = this.workers.get(id);
        if (workerData && workerData.status !== 'dead') {
            log(`發送凍結指令給 Worker #${id} (5秒)`);
            workerData.worker.postMessage({ type: 'simulate_freeze', payload: { duration: 5000 } });
        }
    }

    simulateCrash(id) {
        const workerData = this.workers.get(id);
        if (workerData && workerData.status !== 'dead') {
            log(`發送崩潰指令給 Worker #${id}`);
            workerData.worker.postMessage({ type: 'simulate_crash' });
        }
    }

    killWorker(id) {
        const workerData = this.workers.get(id);
        if (workerData) {
            workerData.worker.terminate();
            workerData.status = 'dead';
            this.stopHeartbeat(workerData);
            this.updateWorkerUI(workerData);
            log(`Worker #${id} 已手動終止`);
        }
    }

    pingAll() {
        this.workers.forEach(w => this.pingWorker(w));
        log("已發送 Ping 給所有 Worker");
    }

    createWorkerUI(workerData) {
        const container = document.getElementById('workerContainer');
        const card = document.createElement('div');
        card.id = `worker-${workerData.id}`;
        card.className = 'worker-card healthy';
        card.innerHTML = `
            <div class="worker-header">
                <span class="worker-id">Worker #${workerData.id}</span>
                <span class="status-indicator"></span>
            </div>
            <div class="worker-info">
                狀態: <span class="status-text">Healthy</span><br>
                最後回應: <span class="last-pong">Just now</span>
            </div>
            <div class="worker-actions">
                <button class="action-btn" onclick="manager.simulateFreeze(${workerData.id})">模擬凍結 (5s)</button>
                <button class="action-btn danger" onclick="manager.simulateCrash(${workerData.id})">模擬崩潰</button>
                <button class="action-btn danger" onclick="manager.killWorker(${workerData.id})">終止</button>
            </div>
        `;
        container.appendChild(card);
    }

    updateWorkerUI(workerData) {
        const card = document.getElementById(`worker-${workerData.id}`);
        if (!card) return;

        card.className = `worker-card ${workerData.status}`;

        const statusText = card.querySelector('.status-text');
        statusText.textContent = workerData.status.charAt(0).toUpperCase() + workerData.status.slice(1);

        const lastPong = card.querySelector('.last-pong');
        if (workerData.lastPong > 0) {
            const diff = Date.now() - workerData.lastPong;
            lastPong.textContent = `${(diff/1000).toFixed(1)}s ago`;
        } else {
            lastPong.textContent = 'Never';
        }
    }
}

const manager = new WorkerManager();

document.getElementById('addWorkerBtn').addEventListener('click', () => manager.addWorker());
document.getElementById('pingAllBtn').addEventListener('click', () => manager.pingAll());

function log(msg, isError = false) {
    const logContent = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (isError) entry.classList.add('error-msg');

    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;

    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

// Start with one worker
manager.addWorker();
