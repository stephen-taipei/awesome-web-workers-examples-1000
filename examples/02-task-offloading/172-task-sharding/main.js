// Main Thread

const startBtn = document.getElementById('start-btn');
const totalRangeInput = document.getElementById('total-range');
const workerCountInput = document.getElementById('worker-count');
const statusDiv = document.getElementById('status');
const progressContainer = document.getElementById('progress-container');
const totalSumSpan = document.getElementById('total-sum');
const timeTakenSpan = document.getElementById('time-taken');

let workers = [];
let startTime = 0;
let completedWorkers = 0;
let currentTotalSum = 0n;

startBtn.addEventListener('click', startCalculation);

function startCalculation() {
    const totalRange = BigInt(totalRangeInput.value);
    const workerCount = parseInt(workerCountInput.value);

    if (totalRange <= 0n) {
        alert('Please enter a valid range.');
        return;
    }

    // Reset UI
    startBtn.disabled = true;
    statusDiv.textContent = 'Calculating...';
    progressContainer.innerHTML = '';
    totalSumSpan.textContent = '-';
    timeTakenSpan.textContent = '-';
    currentTotalSum = 0n;
    completedWorkers = 0;

    // Terminate existing workers
    workers.forEach(w => w.terminate());
    workers = [];

    // Calculate shards
    const rangePerWorker = totalRange / BigInt(workerCount);
    const remainder = totalRange % BigInt(workerCount);

    startTime = performance.now();
    let currentStart = 1n; // Start sum from 1

    for (let i = 0; i < workerCount; i++) {
        // Distribute remainder to first few workers
        const count = rangePerWorker + (BigInt(i) < remainder ? 1n : 0n);
        const start = currentStart;
        const end = currentStart + count - 1n;
        currentStart += count;

        createWorker(i, start, end);
    }
}

function createWorker(index, start, end) {
    // Create UI for this worker
    const workerDiv = document.createElement('div');
    workerDiv.className = 'worker-progress';
    workerDiv.innerHTML = `
        <span class="worker-label">Worker ${index + 1}</span>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="progress-${index}"></div>
        </div>
        <span class="progress-text" id="text-${index}">0%</span>
    `;
    progressContainer.appendChild(workerDiv);

    const progressBar = document.getElementById(`progress-${index}`);
    const progressText = document.getElementById(`text-${index}`);

    const worker = new Worker('worker.js');
    workers.push(worker);

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percentage = data.toFixed(1);
            progressBar.style.width = `${percentage}%`;
            progressText.textContent = `${percentage}%`;
        } else if (type === 'result') {
            currentTotalSum += data;
            completedWorkers++;

            // Mark complete in UI
            progressBar.style.width = '100%';
            progressText.textContent = '100%';
            progressBar.style.backgroundColor = '#27ae60';

            if (completedWorkers === workers.length) {
                finishCalculation();
            }
        }
    };

    worker.postMessage({ start, end });
}

function finishCalculation() {
    const endTime = performance.now();
    const duration = endTime - startTime;

    totalSumSpan.textContent = currentTotalSum.toString();
    timeTakenSpan.textContent = duration.toFixed(2);
    statusDiv.textContent = 'Calculation Complete!';
    startBtn.disabled = false;
}
