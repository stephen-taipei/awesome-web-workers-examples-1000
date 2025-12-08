const startBtn = document.getElementById('startBtn');
const shutdownBtn = document.getElementById('shutdownBtn');
const forceKillBtn = document.getElementById('forceKillBtn');
const workerStatus = document.getElementById('workerStatus');
const currentTask = document.getElementById('currentTask');
const logsOutput = document.getElementById('logsOutput');

let worker = null;

function initWorker() {
    if (worker) return;
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, payload } = e.data;

        if (type === 'log') {
            log(payload);
        } else if (type === 'status') {
            workerStatus.textContent = payload.state;
            if (payload.task) {
                currentTask.textContent = payload.task;
            }
        } else if (type === 'shutdownComplete') {
            log('Worker has shut down gracefully.');
            terminateWorker();
        }
    };

    workerStatus.textContent = 'Active';
    startBtn.disabled = false;
    shutdownBtn.disabled = false;
    forceKillBtn.disabled = false;
    log('Worker initialized.');
}

function terminateWorker() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    workerStatus.textContent = 'Terminated';
    currentTask.textContent = 'None';
    startBtn.disabled = false;
    shutdownBtn.disabled = true;
    forceKillBtn.disabled = true;

    // Auto restart for demo purposes after a delay? No, manual restart better.
    // Actually, let's allow restart by clicking start again, which will re-init.
    startBtn.onclick = () => {
        if (!worker) initWorker();
        worker.postMessage({ type: 'startTask' });
    };
}

function log(msg) {
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logsOutput.appendChild(div);
    logsOutput.scrollTop = logsOutput.scrollHeight;
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    worker.postMessage({ type: 'startTask' });
});

shutdownBtn.addEventListener('click', () => {
    if (worker) {
        log('Requesting graceful shutdown...');
        worker.postMessage({ type: 'shutdown' });
        shutdownBtn.disabled = true;
        startBtn.disabled = true;
    }
});

forceKillBtn.addEventListener('click', () => {
    if (worker) {
        log('Force killing worker!');
        terminateWorker();
    }
});

// Initial start
initWorker();
