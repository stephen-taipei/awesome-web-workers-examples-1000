// Map-Reduce - Main Thread Coordinator

class MapReduceCoordinator {
    constructor() {
        this.workers = [];
        this.workerStatus = new Map();
        this.mapResults = [];
        this.reduceResults = new Map();
        this.pendingMapTasks = 0;
        this.pendingReduceTasks = 0;
        this.totalReduceTasks = 0;
        this.startTime = 0;
        this.mapEndTime = 0;
        this.callbacks = {};
    }

    initWorkers(count) {
        this.terminateWorkers();
        this.workers = [];
        this.workerStatus.clear();

        for (let i = 0; i < count; i++) {
            const worker = new Worker('worker.js');
            const workerId = `worker-${i}`;

            worker.onmessage = (e) => this.handleWorkerMessage(e.data);

            worker.postMessage({ action: 'init', data: { id: workerId } });
            this.workers.push({ id: workerId, worker, busy: false });
            this.workerStatus.set(workerId, { status: 'idle', processed: 0 });
        }
    }

    terminateWorkers() {
        this.workers.forEach(w => w.worker.terminate());
        this.workers = [];
    }

    handleWorkerMessage(data) {
        switch (data.type) {
            case 'initialized':
                this.workerStatus.set(data.workerId, { status: 'ready', processed: 0 });
                if (this.callbacks.onWorkerReady) {
                    this.callbacks.onWorkerReady(data.workerId);
                }
                break;

            case 'mapStart':
                this.workerStatus.set(data.workerId, {
                    ...this.workerStatus.get(data.workerId),
                    status: 'mapping',
                    currentChunk: data.chunkIndex
                });
                if (this.callbacks.onWorkerUpdate) {
                    this.callbacks.onWorkerUpdate(data.workerId, 'mapping', data);
                }
                break;

            case 'mapComplete':
                this.mapResults.push(...data.results);
                this.pendingMapTasks--;

                const ws = this.workerStatus.get(data.workerId);
                ws.processed += data.itemsProcessed;
                ws.status = 'idle';

                if (this.callbacks.onMapProgress) {
                    const progress = 1 - (this.pendingMapTasks / this.totalMapTasks);
                    this.callbacks.onMapProgress(progress, data);
                }

                if (this.callbacks.onWorkerUpdate) {
                    this.callbacks.onWorkerUpdate(data.workerId, 'map-done', data);
                }

                if (this.pendingMapTasks === 0) {
                    this.mapEndTime = performance.now();
                    this.startShuffleAndReduce();
                }
                break;

            case 'reduceStart':
                this.workerStatus.set(data.workerId, {
                    ...this.workerStatus.get(data.workerId),
                    status: 'reducing',
                    currentKey: data.key
                });
                if (this.callbacks.onWorkerUpdate) {
                    this.callbacks.onWorkerUpdate(data.workerId, 'reducing', data);
                }
                break;

            case 'reduceComplete':
                this.reduceResults.set(data.key, data.result);
                this.pendingReduceTasks--;

                const wsr = this.workerStatus.get(data.workerId);
                wsr.processed++;
                wsr.status = 'idle';

                if (this.callbacks.onReduceProgress) {
                    const progress = 1 - (this.pendingReduceTasks / this.totalReduceTasks);
                    this.callbacks.onReduceProgress(progress, data);
                }

                if (this.callbacks.onWorkerUpdate) {
                    this.callbacks.onWorkerUpdate(data.workerId, 'reduce-done', data);
                }

                if (this.pendingReduceTasks === 0) {
                    this.finishJob();
                }
                break;
        }
    }

    runJob(jobType, inputData, callbacks) {
        this.callbacks = callbacks;
        this.mapResults = [];
        this.reduceResults.clear();
        this.startTime = performance.now();

        // Reset worker status
        this.workerStatus.forEach((status, workerId) => {
            status.processed = 0;
            status.status = 'idle';
        });

        // Split data into chunks for mapping
        const chunkSize = Math.ceil(inputData.length / this.workers.length);
        const chunks = [];

        for (let i = 0; i < inputData.length; i += chunkSize) {
            chunks.push(inputData.slice(i, i + chunkSize));
        }

        this.pendingMapTasks = chunks.length;
        this.totalMapTasks = chunks.length;

        // Distribute map tasks
        chunks.forEach((chunk, index) => {
            const workerEntry = this.workers[index % this.workers.length];

            workerEntry.worker.postMessage({
                action: 'map',
                data: {
                    jobType,
                    chunk,
                    chunkIndex: index,
                    totalChunks: chunks.length
                }
            });
        });

        if (callbacks.onMapStart) {
            callbacks.onMapStart(chunks.length);
        }
    }

    startShuffleAndReduce() {
        if (this.callbacks.onShuffleStart) {
            this.callbacks.onShuffleStart();
        }

        // Shuffle: Group by key
        const grouped = new Map();
        this.mapResults.forEach(({ key, value }) => {
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(value);
        });

        if (this.callbacks.onShuffleComplete) {
            this.callbacks.onShuffleComplete(grouped.size);
        }

        // Distribute reduce tasks
        const keys = Array.from(grouped.keys());
        this.pendingReduceTasks = keys.length;
        this.totalReduceTasks = keys.length;

        if (keys.length === 0) {
            this.finishJob();
            return;
        }

        keys.forEach((key, index) => {
            const workerEntry = this.workers[index % this.workers.length];

            workerEntry.worker.postMessage({
                action: 'reduce',
                data: {
                    jobType: this.currentJobType,
                    key,
                    values: grouped.get(key)
                }
            });
        });

        if (this.callbacks.onReduceStart) {
            this.callbacks.onReduceStart(keys.length);
        }
    }

    finishJob() {
        const endTime = performance.now();
        const results = Array.from(this.reduceResults.values());

        if (this.callbacks.onComplete) {
            this.callbacks.onComplete({
                results,
                totalTime: endTime - this.startTime,
                mapTime: this.mapEndTime - this.startTime,
                reduceTime: endTime - this.mapEndTime,
                itemsProcessed: this.mapResults.length
            });
        }
    }

    setJobType(jobType) {
        this.currentJobType = jobType;
    }
}

// Sample data generators
const sampleData = {
    wordcount: {
        small: () => generateTextData(100),
        medium: () => generateTextData(1000),
        large: () => generateTextData(10000)
    },
    sum: {
        small: () => generateNumberData(100),
        medium: () => generateNumberData(1000),
        large: () => generateNumberData(10000)
    },
    average: {
        small: () => generateNumberData(100),
        medium: () => generateNumberData(1000),
        large: () => generateNumberData(10000)
    },
    frequency: {
        small: () => generateTextData(100),
        medium: () => generateTextData(1000),
        large: () => generateTextData(10000)
    },
    'inverted-index': {
        small: () => generateTextData(50),
        medium: () => generateTextData(500),
        large: () => generateTextData(5000)
    }
};

function generateTextData(count) {
    const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
        'hello', 'world', 'map', 'reduce', 'distributed', 'computing', 'parallel',
        'web', 'worker', 'javascript', 'algorithm', 'data', 'processing'];

    const texts = [];
    for (let i = 0; i < count; i++) {
        const sentenceLength = 5 + Math.floor(Math.random() * 10);
        const sentence = [];
        for (let j = 0; j < sentenceLength; j++) {
            sentence.push(words[Math.floor(Math.random() * words.length)]);
        }
        texts.push(sentence.join(' '));
    }
    return texts;
}

function generateNumberData(count) {
    const numbers = [];
    for (let i = 0; i < count; i++) {
        numbers.push(Math.floor(Math.random() * 1000));
    }
    return numbers;
}

// Initialize coordinator
const coordinator = new MapReduceCoordinator();

// DOM Elements
const jobType = document.getElementById('jobType');
const workerCount = document.getElementById('workerCount');
const dataSize = document.getElementById('dataSize');
const customInput = document.getElementById('customInput');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');

const progressSection = document.getElementById('progressSection');
const mapProgress = document.getElementById('mapProgress');
const mapPercent = document.getElementById('mapPercent');
const shuffleProgress = document.getElementById('shuffleProgress');
const shufflePercent = document.getElementById('shufflePercent');
const reduceProgress = document.getElementById('reduceProgress');
const reducePercent = document.getElementById('reducePercent');

const workersGrid = document.getElementById('workersGrid');
const resultSection = document.getElementById('resultSection');
const resultOutput = document.getElementById('resultOutput');

const canvas = document.getElementById('mrCanvas');
const ctx = canvas.getContext('2d');

let visualizationState = {
    phase: 'idle',
    mapProgress: 0,
    shuffleProgress: 0,
    reduceProgress: 0,
    workerStates: []
};

function initUI() {
    updateWorkerCards();
    drawVisualization();
}

function updateWorkerCards() {
    const count = parseInt(workerCount.value);
    coordinator.initWorkers(count);

    workersGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.id = `card-worker-${i}`;
        card.innerHTML = `
            <div class="worker-header">
                <span class="worker-name">Worker ${i}</span>
                <span class="worker-status idle" id="status-worker-${i}">Idle</span>
            </div>
            <div class="worker-processed">
                <span>Processed: </span>
                <span id="processed-worker-${i}">0</span>
            </div>
        `;
        workersGrid.appendChild(card);
    }

    visualizationState.workerStates = new Array(count).fill({ status: 'idle', progress: 0 });
}

function runMapReduce() {
    const type = jobType.value;
    const size = dataSize.value;
    const numWorkers = parseInt(workerCount.value);

    coordinator.initWorkers(numWorkers);
    coordinator.setJobType(type);
    updateWorkerCards();

    // Get input data
    let inputData;
    if (customInput.value.trim()) {
        if (type === 'sum' || type === 'average') {
            inputData = customInput.value.split(',').map(s => s.trim());
        } else {
            inputData = customInput.value.split('\n').filter(s => s.trim());
        }
    } else {
        inputData = sampleData[type][size]();
    }

    // Reset UI
    progressSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    setProgress('map', 0);
    setProgress('shuffle', 0);
    setProgress('reduce', 0);

    visualizationState = {
        phase: 'map',
        mapProgress: 0,
        shuffleProgress: 0,
        reduceProgress: 0,
        workerStates: new Array(numWorkers).fill({ status: 'idle', progress: 0 }),
        totalItems: inputData.length
    };

    // Run job
    coordinator.runJob(type, inputData, {
        onMapStart: (chunks) => {
            visualizationState.phase = 'map';
            drawVisualization();
        },

        onMapProgress: (progress, data) => {
            setProgress('map', progress * 100);
            visualizationState.mapProgress = progress;
            drawVisualization();
        },

        onShuffleStart: () => {
            setProgress('shuffle', 50);
            visualizationState.phase = 'shuffle';
            visualizationState.shuffleProgress = 0.5;
            drawVisualization();
        },

        onShuffleComplete: (keyCount) => {
            setProgress('shuffle', 100);
            visualizationState.shuffleProgress = 1;
            drawVisualization();
        },

        onReduceStart: (keyCount) => {
            visualizationState.phase = 'reduce';
            drawVisualization();
        },

        onReduceProgress: (progress, data) => {
            setProgress('reduce', progress * 100);
            visualizationState.reduceProgress = progress;
            drawVisualization();
        },

        onWorkerUpdate: (workerId, status, data) => {
            const idx = parseInt(workerId.split('-')[1]);
            const statusEl = document.getElementById(`status-${workerId}`);
            const processedEl = document.getElementById(`processed-${workerId}`);
            const card = document.getElementById(`card-${workerId}`);

            if (status === 'mapping' || status === 'reducing') {
                statusEl.textContent = status === 'mapping' ? 'Mapping' : 'Reducing';
                statusEl.className = 'worker-status active';
                card.classList.add('active');
                visualizationState.workerStates[idx] = { status: status, progress: 0.5 };
            } else {
                statusEl.textContent = 'Idle';
                statusEl.className = 'worker-status idle';
                card.classList.remove('active');

                const ws = coordinator.workerStatus.get(workerId);
                if (ws) {
                    processedEl.textContent = ws.processed;
                }
                visualizationState.workerStates[idx] = { status: 'idle', progress: 1 };
            }

            drawVisualization();
        },

        onComplete: (stats) => {
            visualizationState.phase = 'complete';
            showResults(stats);
            drawVisualization();
        }
    });
}

function setProgress(phase, percent) {
    const progressEl = document.getElementById(`${phase}Progress`);
    const percentEl = document.getElementById(`${phase}Percent`);

    progressEl.style.width = `${percent}%`;
    percentEl.textContent = `${Math.round(percent)}%`;
}

function showResults(stats) {
    resultSection.classList.remove('hidden');

    document.getElementById('totalTime').textContent = stats.totalTime.toFixed(1);
    document.getElementById('mapTime').textContent = stats.mapTime.toFixed(1);
    document.getElementById('reduceTime').textContent = stats.reduceTime.toFixed(1);
    document.getElementById('itemsProcessed').textContent = stats.itemsProcessed;

    // Format results based on job type
    const type = jobType.value;
    let outputHtml = '';

    switch (type) {
        case 'wordcount':
        case 'frequency':
            const sorted = stats.results.sort((a, b) => b.count - a.count).slice(0, 20);
            outputHtml = '<table><tr><th>Key</th><th>Count</th></tr>';
            sorted.forEach(r => {
                outputHtml += `<tr><td>${r.key}</td><td>${r.count}</td></tr>`;
            });
            outputHtml += '</table>';
            if (stats.results.length > 20) {
                outputHtml += `<p class="more-results">... and ${stats.results.length - 20} more</p>`;
            }
            break;

        case 'sum':
            outputHtml = `<div class="result-value">Sum: <strong>${stats.results[0]?.sum || 0}</strong></div>`;
            break;

        case 'average':
            const avg = stats.results[0];
            outputHtml = `
                <div class="result-value">Average: <strong>${avg?.average?.toFixed(2) || 0}</strong></div>
                <div class="result-value">Count: <strong>${avg?.count || 0}</strong></div>
            `;
            break;

        case 'inverted-index':
            const sortedIdx = stats.results.sort((a, b) => b.docCount - a.docCount).slice(0, 15);
            outputHtml = '<table><tr><th>Word</th><th>Documents</th><th>Count</th></tr>';
            sortedIdx.forEach(r => {
                outputHtml += `<tr><td>${r.key}</td><td>${r.documents.slice(0, 3).join(', ')}${r.documents.length > 3 ? '...' : ''}</td><td>${r.docCount}</td></tr>`;
            });
            outputHtml += '</table>';
            break;
    }

    resultOutput.innerHTML = outputHtml;
}

function drawVisualization() {
    const w = canvas.width, h = canvas.height;
    const state = visualizationState;

    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, w, h);

    const phases = ['Input', 'Map', 'Shuffle', 'Reduce', 'Output'];
    const phaseWidth = w / phases.length;
    const centerY = h / 2;

    // Draw phase labels
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    phases.forEach((phase, idx) => {
        const x = idx * phaseWidth + phaseWidth / 2;
        const isActive = (
            (phase === 'Map' && state.phase === 'map') ||
            (phase === 'Shuffle' && state.phase === 'shuffle') ||
            (phase === 'Reduce' && state.phase === 'reduce') ||
            (phase === 'Output' && state.phase === 'complete')
        );

        ctx.fillStyle = isActive ? '#10b981' : '#4a7a5a';
        ctx.fillText(phase, x, 30);

        // Draw phase box
        ctx.strokeStyle = isActive ? '#10b981' : '#2a5a3a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 40, 45, 80, 40);

        if (isActive) {
            ctx.fillStyle = 'rgba(16,185,129,0.2)';
            ctx.fillRect(x - 40, 45, 80, 40);
        }
    });

    // Draw arrows
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 2;
    for (let i = 0; i < phases.length - 1; i++) {
        const x1 = i * phaseWidth + phaseWidth / 2 + 40;
        const x2 = (i + 1) * phaseWidth + phaseWidth / 2 - 40;
        ctx.beginPath();
        ctx.moveTo(x1, 65);
        ctx.lineTo(x2, 65);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(x2 - 8, 60);
        ctx.lineTo(x2, 65);
        ctx.lineTo(x2 - 8, 70);
        ctx.stroke();
    }

    // Draw workers
    const workerCount = state.workerStates.length;
    const workerY = centerY + 50;
    const workerSpacing = Math.min(60, (w - 100) / workerCount);
    const startX = (w - workerSpacing * (workerCount - 1)) / 2;

    ctx.font = '10px sans-serif';
    state.workerStates.forEach((ws, idx) => {
        const x = startX + idx * workerSpacing;

        // Worker circle
        ctx.fillStyle = ws.status === 'idle' ? '#2a5a3a' :
                       ws.status === 'mapping' ? '#3b82f6' :
                       ws.status === 'reducing' ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.arc(x, workerY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Worker label
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`W${idx}`, x, workerY + 4);

        // Status indicator
        if (ws.status !== 'idle') {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(x + 15, workerY - 15, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw progress bars
    const barY = h - 80;
    const barHeight = 20;
    const barWidth = w - 100;

    ctx.fillStyle = '#1a2f1a';
    ctx.fillRect(50, barY, barWidth, barHeight);

    // Map progress (blue)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(50, barY, barWidth * state.mapProgress * 0.4, barHeight);

    // Shuffle progress (yellow)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(50 + barWidth * 0.4, barY, barWidth * state.shuffleProgress * 0.2, barHeight);

    // Reduce progress (green)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(50 + barWidth * 0.6, barY, barWidth * state.reduceProgress * 0.4, barHeight);

    // Progress labels
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Map', 50 + barWidth * 0.2, barY + 35);
    ctx.fillText('Shuffle', 50 + barWidth * 0.5, barY + 35);
    ctx.fillText('Reduce', 50 + barWidth * 0.8, barY + 35);

    // Status text
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'center';
    let statusText = state.phase === 'idle' ? 'Ready' :
                    state.phase === 'map' ? 'Mapping data...' :
                    state.phase === 'shuffle' ? 'Shuffling...' :
                    state.phase === 'reduce' ? 'Reducing...' : 'Complete!';
    ctx.fillText(statusText, w / 2, h - 20);
}

function reset() {
    progressSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    customInput.value = '';

    visualizationState = {
        phase: 'idle',
        mapProgress: 0,
        shuffleProgress: 0,
        reduceProgress: 0,
        workerStates: new Array(parseInt(workerCount.value)).fill({ status: 'idle', progress: 0 })
    };

    updateWorkerCards();
    drawVisualization();
}

// Event listeners
runBtn.addEventListener('click', runMapReduce);
resetBtn.addEventListener('click', reset);
workerCount.addEventListener('change', updateWorkerCards);

// Initialize
initUI();
