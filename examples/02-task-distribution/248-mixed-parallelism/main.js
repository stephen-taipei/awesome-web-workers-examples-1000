// Mixed Parallelism - Main Thread

const patternSelect = document.getElementById('patternSelect');
const workerCountInput = document.getElementById('workerCount');
const dataSizeSelect = document.getElementById('dataSize');
const taskComplexitySelect = document.getElementById('taskComplexity');
const pipelineStagesInput = document.getElementById('pipelineStages');

const runBtn = document.getElementById('runBtn');
const compareBtn = document.getElementById('compareBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const patternUsedEl = document.getElementById('patternUsed');
const totalTimeEl = document.getElementById('totalTime');
const itemsProcessedEl = document.getElementById('itemsProcessed');
const throughputEl = document.getElementById('throughput');
const efficiencyEl = document.getElementById('efficiency');
const loadBalanceEl = document.getElementById('loadBalance');
const speedupEl = document.getElementById('speedup');
const overheadEl = document.getElementById('overhead');
const workerStatsEl = document.getElementById('workerStats');

const comparisonContainer = document.getElementById('comparisonContainer');
const comparisonCanvas = document.getElementById('comparisonCanvas');
const comparisonTable = document.getElementById('comparisonTable');

const activityCanvas = document.getElementById('activityCanvas');
const activityCtx = activityCanvas.getContext('2d');

let workers = [];
let workerActivities = [];
let startTime = 0;
let sequentialTime = 0;

const patternNames = {
    data: 'Data Parallelism',
    task: 'Task Parallelism',
    pipeline: 'Pipeline Parallelism',
    mixed: 'Mixed (Adaptive)'
};

const patternColors = {
    data: '#3b82f6',
    task: '#f59e0b',
    pipeline: '#ec4899',
    mixed: '#10b981'
};

function initWorkers(count) {
    terminateWorkers();
    workers = [];
    workerActivities = [];

    for (let i = 0; i < count; i++) {
        const worker = new Worker('worker.js');
        worker.id = i;
        workers.push(worker);
        workerActivities.push([]);
    }
}

function terminateWorkers() {
    workers.forEach(w => w.terminate());
    workers = [];
}

function generateData(size) {
    const data = [];
    for (let i = 0; i < size; i++) {
        data.push({
            id: i,
            value: Math.random() * 1000,
            category: Math.floor(Math.random() * 10)
        });
    }
    return data;
}

function getComplexityIterations(complexity) {
    switch (complexity) {
        case 'light': return 100;
        case 'medium': return 500;
        case 'heavy': return 2000;
        default: return 500;
    }
}

// Data Parallelism: Split data among workers
async function runDataParallelism(data, workerCount, complexity) {
    initWorkers(workerCount);
    const chunkSize = Math.ceil(data.length / workerCount);
    const iterations = getComplexityIterations(complexity);

    const promises = workers.map((worker, idx) => {
        const start = idx * chunkSize;
        const chunk = data.slice(start, start + chunkSize);

        return new Promise((resolve) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'activity') {
                    workerActivities[idx].push(e.data);
                } else if (e.data.type === 'result') {
                    resolve(e.data);
                }
            };

            worker.postMessage({
                type: 'data_parallel',
                data: chunk,
                workerId: idx,
                iterations
            });
        });
    });

    const results = await Promise.all(promises);
    return combineResults(results, 'data');
}

// Task Parallelism: Different tasks on different workers
async function runTaskParallelism(data, workerCount, complexity) {
    initWorkers(workerCount);
    const iterations = getComplexityIterations(complexity);

    const tasks = [
        { name: 'sum', fn: 'computeSum' },
        { name: 'stats', fn: 'computeStats' },
        { name: 'filter', fn: 'filterData' },
        { name: 'transform', fn: 'transformData' },
        { name: 'sort', fn: 'sortData' },
        { name: 'aggregate', fn: 'aggregateData' },
        { name: 'normalize', fn: 'normalizeData' },
        { name: 'analyze', fn: 'analyzeData' }
    ];

    const activeTasks = tasks.slice(0, workerCount);

    const promises = workers.map((worker, idx) => {
        const task = activeTasks[idx % activeTasks.length];

        return new Promise((resolve) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'activity') {
                    workerActivities[idx].push(e.data);
                } else if (e.data.type === 'result') {
                    resolve(e.data);
                }
            };

            worker.postMessage({
                type: 'task_parallel',
                task: task.fn,
                taskName: task.name,
                data,
                workerId: idx,
                iterations
            });
        });
    });

    const results = await Promise.all(promises);
    return combineResults(results, 'task');
}

// Pipeline Parallelism: Chain of stages
async function runPipelineParallelism(data, stages, complexity) {
    initWorkers(stages);
    const iterations = getComplexityIterations(complexity);
    const batchSize = Math.ceil(data.length / 10);
    const batches = [];

    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }

    const stageNames = ['parse', 'validate', 'transform', 'enrich', 'filter', 'aggregate', 'format', 'output'];
    const pipelineResults = [];

    // Setup workers as pipeline stages
    const stagePromises = workers.map((worker, stageIdx) => {
        return new Promise((resolve) => {
            const stageResults = [];
            worker.onmessage = (e) => {
                if (e.data.type === 'activity') {
                    workerActivities[stageIdx].push(e.data);
                } else if (e.data.type === 'stage_result') {
                    stageResults.push(e.data);

                    // Pass to next stage
                    if (stageIdx < workers.length - 1) {
                        workers[stageIdx + 1].postMessage({
                            type: 'pipeline_stage',
                            stage: stageIdx + 1,
                            stageName: stageNames[(stageIdx + 1) % stageNames.length],
                            data: e.data.result,
                            batchId: e.data.batchId,
                            workerId: stageIdx + 1,
                            iterations: Math.floor(iterations / stages)
                        });
                    } else {
                        pipelineResults.push(e.data);
                    }
                } else if (e.data.type === 'done') {
                    resolve({ stageResults, workerId: stageIdx });
                }
            };
        });
    });

    // Start feeding batches to first stage
    for (let i = 0; i < batches.length; i++) {
        workers[0].postMessage({
            type: 'pipeline_stage',
            stage: 0,
            stageName: stageNames[0],
            data: batches[i],
            batchId: i,
            workerId: 0,
            iterations: Math.floor(iterations / stages),
            totalBatches: batches.length
        });
    }

    // Signal completion
    workers.forEach(w => w.postMessage({ type: 'pipeline_done' }));

    await Promise.all(stagePromises);
    return { pattern: 'pipeline', pipelineResults, batches: batches.length, stages };
}

// Mixed Parallelism: Adaptive combination
async function runMixedParallelism(data, workerCount, stages, complexity) {
    initWorkers(workerCount);
    const iterations = getComplexityIterations(complexity);
    const results = { phases: [] };

    // Phase 1: Data parallel preprocessing
    const phase1ChunkSize = Math.ceil(data.length / workerCount);
    const phase1Promises = workers.map((worker, idx) => {
        const chunk = data.slice(idx * phase1ChunkSize, (idx + 1) * phase1ChunkSize);

        return new Promise((resolve) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'activity') {
                    workerActivities[idx].push(e.data);
                } else if (e.data.type === 'result') {
                    resolve(e.data);
                }
            };

            worker.postMessage({
                type: 'mixed_phase1',
                data: chunk,
                workerId: idx,
                iterations: Math.floor(iterations / 3)
            });
        });
    });

    const phase1Results = await Promise.all(phase1Promises);
    results.phases.push({ name: 'Data Parallel Preprocessing', results: phase1Results });

    // Phase 2: Task parallel analysis
    const analysisTasks = ['statistical', 'categorical', 'temporal', 'correlation'];
    const combinedData = phase1Results.flatMap(r => r.processedData || []);

    const phase2Promises = workers.slice(0, Math.min(workerCount, analysisTasks.length)).map((worker, idx) => {
        return new Promise((resolve) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'activity') {
                    workerActivities[idx].push(e.data);
                } else if (e.data.type === 'result') {
                    resolve(e.data);
                }
            };

            worker.postMessage({
                type: 'mixed_phase2',
                task: analysisTasks[idx % analysisTasks.length],
                data: combinedData,
                workerId: idx,
                iterations: Math.floor(iterations / 3)
            });
        });
    });

    const phase2Results = await Promise.all(phase2Promises);
    results.phases.push({ name: 'Task Parallel Analysis', results: phase2Results });

    // Phase 3: Pipeline finalization
    const finalData = phase2Results.map(r => r.analysisResult);
    const phase3Promise = new Promise((resolve) => {
        let currentStage = 0;
        const stageResults = [];

        const processStage = (stageData) => {
            if (currentStage >= Math.min(stages, workerCount)) {
                resolve({ stages: stageResults });
                return;
            }

            const worker = workers[currentStage % workerCount];
            worker.onmessage = (e) => {
                if (e.data.type === 'activity') {
                    workerActivities[currentStage % workerCount].push(e.data);
                } else if (e.data.type === 'result') {
                    stageResults.push(e.data);
                    currentStage++;
                    processStage(e.data.stageOutput);
                }
            };

            worker.postMessage({
                type: 'mixed_phase3',
                stage: currentStage,
                data: stageData,
                workerId: currentStage % workerCount,
                iterations: Math.floor(iterations / (3 * stages))
            });
        };

        processStage(finalData);
    });

    const phase3Results = await phase3Promise;
    results.phases.push({ name: 'Pipeline Finalization', results: phase3Results });

    return { pattern: 'mixed', ...results };
}

function combineResults(results, pattern) {
    const combined = {
        pattern,
        totalItems: results.reduce((sum, r) => sum + (r.itemsProcessed || 0), 0),
        workerTimes: results.map(r => r.executionTime || 0),
        workerItems: results.map(r => r.itemsProcessed || 0)
    };
    return combined;
}

function calculateMetrics(result, totalTime, workerCount, dataSize) {
    const workerTimes = result.workerTimes || [];
    const maxWorkerTime = Math.max(...workerTimes, 1);
    const avgWorkerTime = workerTimes.reduce((a, b) => a + b, 0) / workerTimes.length || 1;

    // Load balance: how evenly distributed is the work
    const loadVariance = workerTimes.reduce((sum, t) => sum + Math.pow(t - avgWorkerTime, 2), 0) / workerTimes.length;
    const loadBalance = Math.max(0, 100 - (Math.sqrt(loadVariance) / avgWorkerTime * 100));

    // Efficiency: useful work / total work capacity
    const efficiency = (avgWorkerTime / maxWorkerTime) * 100;

    // Speedup compared to sequential
    const speedup = sequentialTime / totalTime;

    // Overhead: extra time compared to ideal
    const idealTime = sequentialTime / workerCount;
    const overhead = Math.max(0, ((totalTime - idealTime) / idealTime) * 100);

    return { loadBalance, efficiency, speedup, overhead };
}

async function runSequentialBaseline(data, complexity) {
    const iterations = getComplexityIterations(complexity);
    const worker = new Worker('worker.js');

    return new Promise((resolve) => {
        worker.onmessage = (e) => {
            if (e.data.type === 'result') {
                worker.terminate();
                resolve(e.data.executionTime);
            }
        };

        worker.postMessage({
            type: 'sequential_baseline',
            data,
            iterations
        });
    });
}

function drawActivity() {
    const w = activityCanvas.width;
    const h = activityCanvas.height;
    const padding = 50;

    activityCtx.fillStyle = '#080f08';
    activityCtx.fillRect(0, 0, w, h);

    if (workerActivities.length === 0) {
        activityCtx.fillStyle = '#4a7a5a';
        activityCtx.font = '14px sans-serif';
        activityCtx.textAlign = 'center';
        activityCtx.fillText('Run a pattern to see worker activity', w / 2, h / 2);
        return;
    }

    const workerHeight = (h - padding * 2) / workerActivities.length;
    const maxTime = Math.max(...workerActivities.flatMap(a => a.map(act => act.endTime || act.time || 0)), 1);
    const timeScale = (w - padding * 2) / maxTime;

    // Draw grid
    activityCtx.strokeStyle = '#1a3a2a';
    activityCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const x = padding + i * (w - padding * 2) / 10;
        activityCtx.beginPath();
        activityCtx.moveTo(x, padding);
        activityCtx.lineTo(x, h - padding);
        activityCtx.stroke();

        activityCtx.fillStyle = '#4a7a5a';
        activityCtx.font = '9px monospace';
        activityCtx.textAlign = 'center';
        activityCtx.fillText(`${Math.round(i * maxTime / 10)}ms`, x, h - padding + 15);
    }

    // Draw worker lanes
    const colors = ['#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

    workerActivities.forEach((activities, workerIdx) => {
        const y = padding + workerIdx * workerHeight;
        const color = colors[workerIdx % colors.length];

        // Worker label
        activityCtx.fillStyle = '#34d399';
        activityCtx.font = '10px sans-serif';
        activityCtx.textAlign = 'right';
        activityCtx.fillText(`W${workerIdx}`, padding - 10, y + workerHeight / 2 + 3);

        // Activity bars
        activities.forEach(act => {
            const startX = padding + (act.startTime || 0) * timeScale;
            const duration = (act.endTime || act.time || 0) - (act.startTime || 0);
            const barWidth = Math.max(2, duration * timeScale);

            activityCtx.fillStyle = color;
            activityCtx.globalAlpha = 0.7;
            activityCtx.fillRect(startX, y + 5, barWidth, workerHeight - 10);
            activityCtx.globalAlpha = 1;

            // Activity label
            if (barWidth > 30 && act.task) {
                activityCtx.fillStyle = '#fff';
                activityCtx.font = '8px sans-serif';
                activityCtx.textAlign = 'left';
                activityCtx.fillText(act.task.slice(0, 10), startX + 3, y + workerHeight / 2 + 2);
            }
        });
    });

    // Legend
    activityCtx.font = '10px sans-serif';
    activityCtx.textAlign = 'left';
    activityCtx.fillStyle = '#34d399';
    activityCtx.fillText('Time (ms) →', w - 80, h - 5);
}

function displayResults(result, totalTime, workerCount, dataSize) {
    resultContainer.classList.remove('hidden');

    patternUsedEl.textContent = patternNames[result.pattern] || result.pattern;
    totalTimeEl.textContent = `${totalTime.toFixed(2)} ms`;
    itemsProcessedEl.textContent = dataSize.toLocaleString();
    throughputEl.textContent = `${Math.round(dataSize / totalTime * 1000).toLocaleString()}/s`;

    const metrics = calculateMetrics(result, totalTime, workerCount, dataSize);
    efficiencyEl.textContent = `${metrics.efficiency.toFixed(1)}%`;
    loadBalanceEl.textContent = `${metrics.loadBalance.toFixed(1)}%`;
    speedupEl.textContent = `${metrics.speedup.toFixed(2)}x`;
    overheadEl.textContent = `${metrics.overhead.toFixed(1)}%`;

    // Worker statistics
    const workerTimes = result.workerTimes || [];
    const workerItems = result.workerItems || [];

    workerStatsEl.innerHTML = workerTimes.map((time, idx) => `
        <div class="worker-stat-item">
            <div class="worker-name">Worker ${idx}</div>
            <div class="worker-info">
                Time: ${time.toFixed(1)}ms |
                Items: ${(workerItems[idx] || 0).toLocaleString()}
            </div>
        </div>
    `).join('');

    drawActivity();
}

async function run() {
    const pattern = patternSelect.value;
    const workerCount = parseInt(workerCountInput.value);
    const dataSize = parseInt(dataSizeSelect.value);
    const complexity = taskComplexitySelect.value;
    const stages = parseInt(pipelineStagesInput.value);

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Generating data...';

    const data = generateData(dataSize);

    progressBar.style.width = '10%';
    progressText.textContent = 'Running sequential baseline...';

    sequentialTime = await runSequentialBaseline(data, complexity);

    progressBar.style.width = '30%';
    progressText.textContent = `Running ${patternNames[pattern]}...`;

    startTime = performance.now();
    workerActivities = [];

    let result;
    switch (pattern) {
        case 'data':
            result = await runDataParallelism(data, workerCount, complexity);
            break;
        case 'task':
            result = await runTaskParallelism(data, workerCount, complexity);
            break;
        case 'pipeline':
            result = await runPipelineParallelism(data, stages, complexity);
            break;
        case 'mixed':
            result = await runMixedParallelism(data, workerCount, stages, complexity);
            break;
    }

    const totalTime = performance.now() - startTime;

    progressBar.style.width = '100%';
    progressText.textContent = 'Complete!';

    setTimeout(() => {
        progressContainer.classList.add('hidden');
        displayResults(result, totalTime, workerCount, dataSize);
    }, 300);

    terminateWorkers();
}

async function compare() {
    const workerCount = parseInt(workerCountInput.value);
    const dataSize = parseInt(dataSizeSelect.value);
    const complexity = taskComplexitySelect.value;
    const stages = parseInt(pipelineStagesInput.value);

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');

    const data = generateData(dataSize);

    progressBar.style.width = '10%';
    progressText.textContent = 'Running sequential baseline...';
    sequentialTime = await runSequentialBaseline(data, complexity);

    const patterns = ['data', 'task', 'pipeline', 'mixed'];
    const results = [];

    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        progressBar.style.width = `${20 + i * 20}%`;
        progressText.textContent = `Running ${patternNames[pattern]}...`;

        workerActivities = [];
        startTime = performance.now();

        let result;
        switch (pattern) {
            case 'data':
                result = await runDataParallelism(data, workerCount, complexity);
                break;
            case 'task':
                result = await runTaskParallelism(data, workerCount, complexity);
                break;
            case 'pipeline':
                result = await runPipelineParallelism(data, stages, complexity);
                break;
            case 'mixed':
                result = await runMixedParallelism(data, workerCount, stages, complexity);
                break;
        }

        const totalTime = performance.now() - startTime;
        const metrics = calculateMetrics(result, totalTime, workerCount, dataSize);

        results.push({
            pattern,
            name: patternNames[pattern],
            time: totalTime,
            speedup: metrics.speedup,
            efficiency: metrics.efficiency,
            loadBalance: metrics.loadBalance
        });

        terminateWorkers();
    }

    progressBar.style.width = '100%';
    progressText.textContent = 'Comparison complete!';

    setTimeout(() => {
        progressContainer.classList.add('hidden');
        displayComparison(results);
    }, 300);
}

function displayComparison(results) {
    comparisonContainer.classList.remove('hidden');

    // Draw comparison chart
    const ctx = comparisonCanvas.getContext('2d');
    const w = comparisonCanvas.width;
    const h = comparisonCanvas.height;
    const padding = 60;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const barWidth = (w - padding * 2) / results.length / 2;
    const maxTime = Math.max(...results.map(r => r.time));
    const scale = (h - padding * 2) / maxTime;

    // Find best result
    const bestIdx = results.reduce((best, r, i) => r.time < results[best].time ? i : best, 0);

    results.forEach((result, idx) => {
        const x = padding + idx * (w - padding * 2) / results.length + barWidth / 2;
        const barHeight = result.time * scale;

        // Bar
        ctx.fillStyle = idx === bestIdx ? '#10b981' : patternColors[result.pattern];
        ctx.fillRect(x, h - padding - barHeight, barWidth, barHeight);

        // Value label
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${result.time.toFixed(0)}ms`, x + barWidth / 2, h - padding - barHeight - 5);

        // Pattern label
        ctx.fillStyle = '#34d399';
        ctx.font = '9px sans-serif';
        ctx.save();
        ctx.translate(x + barWidth / 2, h - padding + 10);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'right';
        ctx.fillText(result.name, 0, 0);
        ctx.restore();
    });

    // Y axis
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.stroke();

    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = h - padding - i * (h - padding * 2) / 5;
        const val = Math.round(i * maxTime / 5);
        ctx.fillText(`${val}ms`, padding - 5, y + 3);
    }

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Execution Time Comparison', w / 2, 20);

    // Comparison table
    let tableHtml = `
        <table>
            <tr>
                <th>Pattern</th>
                <th>Time (ms)</th>
                <th>Speedup</th>
                <th>Efficiency</th>
                <th>Load Balance</th>
            </tr>
    `;

    results.forEach((r, idx) => {
        const isBest = idx === bestIdx;
        tableHtml += `
            <tr>
                <td ${isBest ? 'class="best-result"' : ''}>${r.name}</td>
                <td ${isBest ? 'class="best-result"' : ''}>${r.time.toFixed(2)}</td>
                <td>${r.speedup.toFixed(2)}x</td>
                <td>${r.efficiency.toFixed(1)}%</td>
                <td>${r.loadBalance.toFixed(1)}%</td>
            </tr>
        `;
    });

    tableHtml += '</table>';
    comparisonTable.innerHTML = tableHtml;
}

function reset() {
    terminateWorkers();
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    workerActivities = [];
    drawActivity();
}

runBtn.addEventListener('click', run);
compareBtn.addEventListener('click', compare);
resetBtn.addEventListener('click', reset);

// Initial draw
drawActivity();
