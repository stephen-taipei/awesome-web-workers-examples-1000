/**
 * #601 Single Worker Pattern
 * Demonstrates basic single dedicated worker usage
 */

let worker = null;
let isRunning = false;

const elements = {
    taskCount: document.getElementById('task-count'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    resultSection: document.getElementById('result-section'),
    resultStats: document.getElementById('result-stats')
};

// Initialize worker
function initWorker() {
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        switch (type) {
            case 'progress':
                updateProgress(data.percent, data.message);
                break;
            case 'complete':
                showResult(data);
                isRunning = false;
                updateUI();
                break;
            case 'error':
                showError(data.message);
                isRunning = false;
                updateUI();
                break;
        }
    };

    worker.onerror = (error) => {
        showError(`Worker error: ${error.message}`);
        isRunning = false;
        updateUI();
    };
}

function startTask() {
    const count = parseInt(elements.taskCount.value);
    if (isNaN(count) || count < 1000) {
        alert('Please enter a valid number (minimum 1000)');
        return;
    }

    initWorker();
    isRunning = true;
    updateUI();

    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Starting worker...');

    worker.postMessage({
        type: 'start',
        data: { count }
    });
}

function stopTask() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    isRunning = false;
    updateUI();
    updateProgress(0, 'Stopped');
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function updateUI() {
    elements.startBtn.disabled = isRunning;
    elements.stopBtn.disabled = !isRunning;
    elements.taskCount.disabled = isRunning;
}

function showResult(data) {
    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Calculations:</span>
            <span class="stat-value">${data.count.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Duration:</span>
            <span class="stat-value">${data.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Result Sum:</span>
            <span class="stat-value">${data.result.toLocaleString()}</span>
        </div>
    `;
    elements.resultSection.classList.remove('hidden');
    updateProgress(100, 'Complete!');
}

function showError(message) {
    elements.resultStats.innerHTML = `<div class="error-message">${message}</div>`;
    elements.resultSection.classList.remove('hidden');
}

// Event listeners
elements.startBtn.addEventListener('click', startTask);
elements.stopBtn.addEventListener('click', stopTask);

// Initialize
initWorker();
