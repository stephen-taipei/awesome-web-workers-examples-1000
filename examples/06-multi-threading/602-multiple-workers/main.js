/**
 * #602 Multiple Workers Pattern
 * Demonstrates parallel processing with multiple independent workers
 */

let workers = [];
let isRunning = false;
let completedWorkers = 0;
let results = [];

const elements = {
    workerCount: document.getElementById('worker-count'),
    taskSize: document.getElementById('task-size'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    workersStatus: document.getElementById('workers-status'),
    resultSection: document.getElementById('result-section'),
    resultStats: document.getElementById('result-stats')
};

function createWorkerStatus(count) {
    let html = '<div class="workers-grid">';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="worker-status-item" id="worker-${i}">
                <div class="worker-header">Worker #${i + 1}</div>
                <div class="progress-bar-wrapper" style="height: 20px;">
                    <div class="progress-bar" id="progress-${i}" style="width: 0%">0%</div>
                </div>
                <div class="worker-info" id="info-${i}">Ready</div>
            </div>
        `;
    }
    html += '</div>';
    html += '<style>.workers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:15px;}.worker-status-item{background:var(--bg-secondary);padding:15px;border-radius:8px;}.worker-header{font-weight:bold;margin-bottom:10px;color:var(--primary-color);}.worker-info{margin-top:8px;font-size:0.85rem;color:var(--text-secondary);}</style>';
    elements.workersStatus.innerHTML = html;
}

function startWorkers() {
    const workerCount = parseInt(elements.workerCount.value);
    const taskSize = parseInt(elements.taskSize.value);

    if (isNaN(workerCount) || workerCount < 1 || workerCount > 16) {
        alert('Please enter a valid worker count (1-16)');
        return;
    }

    stopWorkers();
    isRunning = true;
    completedWorkers = 0;
    results = [];
    updateUI();

    createWorkerStatus(workerCount);
    elements.resultSection.classList.add('hidden');

    const startTime = performance.now();

    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');

        worker.onmessage = (e) => {
            const { type, data } = e.data;

            if (type === 'progress') {
                updateWorkerProgress(i, data.percent, data.message);
            } else if (type === 'complete') {
                results[i] = data;
                completedWorkers++;
                updateWorkerProgress(i, 100, `Done: ${data.result.toFixed(2)}`);

                if (completedWorkers === workerCount) {
                    const totalTime = performance.now() - startTime;
                    showResults(totalTime);
                    isRunning = false;
                    updateUI();
                }
            }
        };

        worker.onerror = (error) => {
            updateWorkerProgress(i, 0, `Error: ${error.message}`);
        };

        worker.postMessage({
            type: 'start',
            data: { workerId: i, count: taskSize }
        });

        workers.push(worker);
    }
}

function stopWorkers() {
    workers.forEach(worker => worker.terminate());
    workers = [];
    isRunning = false;
    updateUI();
}

function updateWorkerProgress(id, percent, message) {
    const progressBar = document.getElementById(`progress-${id}`);
    const info = document.getElementById(`info-${id}`);
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
    }
    if (info) {
        info.textContent = message;
    }
}

function updateUI() {
    elements.startBtn.disabled = isRunning;
    elements.stopBtn.disabled = !isRunning;
    elements.workerCount.disabled = isRunning;
    elements.taskSize.disabled = isRunning;
}

function showResults(totalTime) {
    const totalResult = results.reduce((sum, r) => sum + r.result, 0);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Total Workers:</span>
            <span class="stat-value">${results.length}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Time:</span>
            <span class="stat-value">${totalTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Worker Time:</span>
            <span class="stat-value">${avgDuration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Combined Result:</span>
            <span class="stat-value">${totalResult.toFixed(2)}</span>
        </div>
    `;
    elements.resultSection.classList.remove('hidden');
}

elements.startBtn.addEventListener('click', startWorkers);
elements.stopBtn.addEventListener('click', stopWorkers);
