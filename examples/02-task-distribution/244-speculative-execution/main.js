// Speculative Execution - Main Thread

const scenarioSelect = document.getElementById('scenarioSelect');
const scenarioDescription = document.getElementById('scenarioDescription');
const workerCountInput = document.getElementById('workerCount');
const dataSizeInput = document.getElementById('dataSize');
const predictionAccuracyInput = document.getElementById('predictionAccuracy');
const targetValueInput = document.getElementById('targetValue');

const runBtn = document.getElementById('runBtn');
const compareBtn = document.getElementById('compareBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const winningWorkerEl = document.getElementById('winningWorker');
const resultFoundEl = document.getElementById('resultFound');
const specTimeEl = document.getElementById('specTime');
const predictionHitEl = document.getElementById('predictionHit');
const seqTimeEl = document.getElementById('seqTime');
const speedupEl = document.getElementById('speedup');
const wastedWorkEl = document.getElementById('wastedWork');
const efficiencyEl = document.getElementById('efficiency');
const workerDetails = document.getElementById('workerDetails');

const canvas = document.getElementById('specCanvas');
const ctx = canvas.getContext('2d');

let workers = [];
let workerStates = [];
let animationId = null;
let startTime = 0;
let sequentialTime = null;

const scenarios = {
    search: {
        name: 'Parallel Search',
        description: `Search for a target value across multiple data partitions.
Each worker searches its partition speculatively.
First worker to find the target wins, others are cancelled.`
    },
    database: {
        name: 'Database Query',
        description: `Simulate parallel query execution across shards.
Multiple query strategies are tried simultaneously.
The fastest successful query result is used.`
    },
    pathfinding: {
        name: 'Path Finding',
        description: `Find optimal path using multiple algorithms in parallel.
Algorithms: A*, Dijkstra, BFS, Greedy.
First algorithm to find valid path wins.`
    },
    prediction: {
        name: 'Branch Prediction',
        description: `Execute multiple code branches speculatively.
Based on prediction accuracy, the likely branch starts early.
If prediction is wrong, fallback to correct branch.`
    }
};

function updateScenarioDisplay() {
    const selected = scenarioSelect.value;
    scenarioDescription.textContent = scenarios[selected].description;
}

function terminateAllWorkers() {
    workers.forEach(w => {
        if (w) w.terminate();
    });
    workers = [];
    workerStates = [];
}

function createWorkers(count, config) {
    terminateAllWorkers();

    for (let i = 0; i < count; i++) {
        const worker = new Worker('worker.js');
        workers.push(worker);
        workerStates.push({
            id: i,
            status: 'idle',
            progress: 0,
            itemsProcessed: 0,
            startTime: 0,
            endTime: 0,
            result: null,
            partition: null
        });
    }

    return workers;
}

function runSpeculative() {
    const workerCount = parseInt(workerCountInput.value);
    const dataSize = parseInt(dataSizeInput.value);
    const predictionAccuracy = parseInt(predictionAccuracyInput.value);
    const targetValue = parseInt(targetValueInput.value);
    const scenario = scenarioSelect.value;

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Initializing speculative workers...';

    createWorkers(workerCount, { dataSize, targetValue, scenario });

    startTime = performance.now();
    let completedCount = 0;
    let winner = null;

    // Partition data among workers
    const partitionSize = Math.ceil(dataSize / workerCount);

    // Simulate prediction - one worker gets "predicted" partition
    const predictedPartition = Math.floor(Math.random() * workerCount);
    const actualTarget = Math.random() * 100 < predictionAccuracy ?
        predictedPartition : (predictedPartition + 1) % workerCount;

    workers.forEach((worker, index) => {
        const startIdx = index * partitionSize;
        const endIdx = Math.min(startIdx + partitionSize, dataSize);

        workerStates[index] = {
            id: index,
            status: 'running',
            progress: 0,
            itemsProcessed: 0,
            startTime: performance.now(),
            endTime: 0,
            result: null,
            partition: { start: startIdx, end: endIdx },
            isPredicted: index === predictedPartition,
            isActualTarget: index === actualTarget
        };

        worker.onmessage = (e) => {
            const data = e.data;

            if (data.type === 'progress') {
                workerStates[index].progress = data.percent;
                workerStates[index].itemsProcessed = data.processed;
                updateProgress();
                drawVisualization();
            } else if (data.type === 'result') {
                workerStates[index].endTime = performance.now();
                workerStates[index].status = 'completed';
                workerStates[index].result = data;

                if (data.found && !winner) {
                    winner = index;
                    workerStates[index].status = 'winner';

                    // Cancel other workers
                    workers.forEach((w, i) => {
                        if (i !== index && workerStates[i].status === 'running') {
                            w.terminate();
                            workerStates[i].status = 'cancelled';
                            workerStates[i].endTime = performance.now();
                        }
                    });

                    showResults(winner, predictedPartition === actualTarget);
                }

                completedCount++;
                if (completedCount === workerCount && !winner) {
                    showResults(-1, false);
                }
            }
        };

        // Start worker with slight delay for predicted partition (priority)
        const delay = index === predictedPartition ? 0 : 10;
        setTimeout(() => {
            worker.postMessage({
                scenario,
                partition: { start: startIdx, end: endIdx },
                targetValue,
                workerId: index,
                dataSize,
                isPredicted: index === predictedPartition,
                hasTarget: index === actualTarget
            });
        }, delay);
    });

    drawVisualization();
}

function updateProgress() {
    const totalProgress = workerStates.reduce((sum, w) => sum + w.progress, 0);
    const avgProgress = totalProgress / workerStates.length;

    progressBar.style.width = avgProgress + '%';

    const running = workerStates.filter(w => w.status === 'running').length;
    progressText.textContent = `Running ${running} speculative workers... ${Math.round(avgProgress)}%`;
}

function runSequential() {
    const dataSize = parseInt(dataSizeInput.value);
    const targetValue = parseInt(targetValueInput.value);
    const scenario = scenarioSelect.value;

    progressContainer.classList.remove('hidden');
    progressText.textContent = 'Running sequential execution for comparison...';

    const worker = new Worker('worker.js');
    const seqStart = performance.now();

    worker.onmessage = (e) => {
        if (e.data.type === 'result') {
            sequentialTime = performance.now() - seqStart;
            seqTimeEl.textContent = sequentialTime.toFixed(2) + ' ms';
            worker.terminate();

            // Update speedup if speculative result exists
            const specTime = parseFloat(specTimeEl.textContent);
            if (!isNaN(specTime)) {
                const speedup = sequentialTime / specTime;
                speedupEl.textContent = speedup.toFixed(2) + 'x';
            }

            progressContainer.classList.add('hidden');
        }
    };

    worker.postMessage({
        scenario,
        partition: { start: 0, end: dataSize },
        targetValue,
        workerId: 0,
        dataSize,
        isPredicted: false,
        hasTarget: true,
        sequential: true
    });
}

function showResults(winnerIdx, predictionHit) {
    const endTime = performance.now();
    const specTime = endTime - startTime;

    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    if (winnerIdx >= 0) {
        winningWorkerEl.textContent = `Worker ${winnerIdx}`;
        winningWorkerEl.style.color = '#34d399';
        resultFoundEl.textContent = workerStates[winnerIdx].result.value || 'Yes';
    } else {
        winningWorkerEl.textContent = 'None';
        winningWorkerEl.style.color = '#ef4444';
        resultFoundEl.textContent = 'Not Found';
    }

    specTimeEl.textContent = specTime.toFixed(2) + ' ms';
    predictionHitEl.textContent = predictionHit ? 'Yes' : 'No';
    predictionHitEl.style.color = predictionHit ? '#34d399' : '#ef4444';

    // Calculate wasted work
    const totalWork = workerStates.reduce((sum, w) => sum + w.itemsProcessed, 0);
    const usefulWork = winnerIdx >= 0 ? workerStates[winnerIdx].itemsProcessed : totalWork;
    const wastedPercent = ((totalWork - usefulWork) / totalWork * 100).toFixed(1);
    wastedWorkEl.textContent = wastedPercent + '%';

    // Efficiency
    const efficiency = (usefulWork / totalWork * 100).toFixed(1);
    efficiencyEl.textContent = efficiency + '%';

    // Compare with sequential if available
    if (sequentialTime) {
        seqTimeEl.textContent = sequentialTime.toFixed(2) + ' ms';
        speedupEl.textContent = (sequentialTime / specTime).toFixed(2) + 'x';
    }

    renderWorkerDetails();
    drawVisualization();
}

function renderWorkerDetails() {
    let html = '<table><tr><th>Worker</th><th>Status</th><th>Partition</th><th>Processed</th><th>Time</th></tr>';

    workerStates.forEach(w => {
        const statusClass = w.status === 'winner' ? 'worker-winner' :
                           w.status === 'cancelled' ? 'worker-cancelled' : '';
        const time = w.endTime ? (w.endTime - w.startTime).toFixed(1) : '-';
        const partition = w.partition ? `${w.partition.start}-${w.partition.end}` : '-';

        html += `<tr class="${statusClass}">
            <td>${w.id}${w.isPredicted ? ' (P)' : ''}</td>
            <td>${w.status}</td>
            <td>${partition}</td>
            <td>${w.itemsProcessed.toLocaleString()}</td>
            <td>${time} ms</td>
        </tr>`;
    });

    html += '</table>';
    workerDetails.innerHTML = html;
}

function drawVisualization() {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#0f0a00';
    ctx.fillRect(0, 0, w, h);

    if (workerStates.length === 0) {
        ctx.fillStyle = '#665500';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Click "Run Speculative Execution" to start', w / 2, h / 2);
        return;
    }

    const barHeight = Math.min(40, (h - padding * 2) / workerStates.length - 10);
    const barWidth = w - padding * 2 - 100;

    // Title
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Speculative Execution Progress', w / 2, 25);

    workerStates.forEach((worker, index) => {
        const y = padding + index * (barHeight + 15);

        // Worker label
        ctx.fillStyle = worker.isPredicted ? '#f59e0b' : '#fbbf24';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`W${worker.id}${worker.isPredicted ? '*' : ''}`, padding - 10, y + barHeight / 2 + 4);

        // Background bar
        ctx.fillStyle = 'rgba(245,158,11,0.1)';
        ctx.fillRect(padding, y, barWidth, barHeight);

        // Progress bar
        let color;
        switch (worker.status) {
            case 'winner':
                color = '#10b981';
                break;
            case 'cancelled':
                color = '#ef4444';
                break;
            case 'running':
                color = '#f59e0b';
                break;
            default:
                color = '#6b7280';
        }

        ctx.fillStyle = color;
        ctx.fillRect(padding, y, barWidth * (worker.progress / 100), barHeight);

        // Border
        ctx.strokeStyle = 'rgba(245,158,11,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, y, barWidth, barHeight);

        // Status text
        ctx.fillStyle = '#fde68a';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${worker.progress.toFixed(0)}% - ${worker.status}`, padding + barWidth + 10, y + barHeight / 2 + 4);

        // Partition indicator
        if (worker.partition) {
            const partitionWidth = barWidth * (worker.partition.end - worker.partition.start) / parseInt(dataSizeInput.value);
            const partitionStart = barWidth * (worker.partition.start / parseInt(dataSizeInput.value));

            ctx.strokeStyle = '#f59e0b';
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(padding + partitionStart, y - 2, partitionWidth, barHeight + 4);
            ctx.setLineDash([]);
        }
    });

    // Legend
    const legendY = h - 25;
    const legendItems = [
        { color: '#10b981', label: 'Winner' },
        { color: '#ef4444', label: 'Cancelled' },
        { color: '#f59e0b', label: 'Running/*Predicted' }
    ];

    let legendX = padding;
    ctx.font = '10px sans-serif';
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, legendY - 8, 12, 12);
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legendX + 16, legendY + 2);
        legendX += 120;
    });
}

function reset() {
    terminateAllWorkers();
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    sequentialTime = null;

    // Reset result displays
    winningWorkerEl.textContent = '-';
    resultFoundEl.textContent = '-';
    specTimeEl.textContent = '-';
    predictionHitEl.textContent = '-';
    seqTimeEl.textContent = '-';
    speedupEl.textContent = '-';
    wastedWorkEl.textContent = '-';
    efficiencyEl.textContent = '-';
    workerDetails.innerHTML = '';

    drawVisualization();
}

// Event Listeners
scenarioSelect.addEventListener('change', updateScenarioDisplay);
runBtn.addEventListener('click', runSpeculative);
compareBtn.addEventListener('click', runSequential);
resetBtn.addEventListener('click', reset);

// Initialize
updateScenarioDisplay();
drawVisualization();
