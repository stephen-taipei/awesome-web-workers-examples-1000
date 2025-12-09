// Scatter-Gather Pattern - Main Thread

const taskSelect = document.getElementById('taskSelect');
const taskDescription = document.getElementById('taskDescription');
const workerCountInput = document.getElementById('workerCount');
const dataSizeInput = document.getElementById('dataSize');
const timeoutInput = document.getElementById('timeout');
const failureRateInput = document.getElementById('failureRate');

const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');

const workerGrid = document.getElementById('workerGrid');
const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const finalResultEl = document.getElementById('finalResult');
const totalTimeEl = document.getElementById('totalTime');
const workersRespondedEl = document.getElementById('workersResponded');
const scatterTimeEl = document.getElementById('scatterTime');
const fastestWorkerEl = document.getElementById('fastestWorker');
const slowestWorkerEl = document.getElementById('slowestWorker');
const gatherTimeEl = document.getElementById('gatherTime');
const workerResults = document.getElementById('workerResults');

const canvas = document.getElementById('sgCanvas');
const ctx = canvas.getContext('2d');

let workers = [];
let workerStates = [];

const tasks = {
    search: {
        name: 'Distributed Search',
        description: `在多個資料分片中並行搜尋
Scatter: 將搜尋請求發送到所有分片
Gather: 合併並排序搜尋結果

模擬搜尋引擎的分散式查詢`,
        query: { keyword: 'target', limit: 10 }
    },
    aggregate: {
        name: 'Data Aggregation',
        description: `從多個資料源收集並彙整統計資料
Scatter: 向每個資料源請求統計
Gather: 合併所有統計結果

適用於分散式監控、報表生成`,
        metrics: ['count', 'sum', 'min', 'max', 'avg']
    },
    mapReduce: {
        name: 'Map-Reduce Sum',
        description: `Map-Reduce 的經典範例
Scatter (Map): 分配資料到各 Worker 計算部分和
Gather (Reduce): 合併所有部分和得到總和

大規模資料處理的基本模式`,
        operation: 'sum'
    },
    bestPrice: {
        name: 'Best Price Finder',
        description: `查詢多個供應商找出最佳價格
Scatter: 向所有供應商發送報價請求
Gather: 比較並選出最低價格

電商比價、API 聚合的典型應用`,
        product: 'Widget-X'
    }
};

const workerColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function updateTaskDescription() {
    const selected = taskSelect.value;
    taskDescription.textContent = tasks[selected].description;
}

function initWorkerGrid() {
    const workerCount = parseInt(workerCountInput.value);
    workerStates = [];

    let html = '';
    for (let i = 0; i < workerCount; i++) {
        workerStates.push({ state: 'idle', time: null, result: null });
        html += `
            <div class="worker-card idle" id="workerCard${i}">
                <div class="worker-name" style="color: ${workerColors[i % workerColors.length]}">Worker ${i}</div>
                <div class="worker-state" id="workerState${i}">Idle</div>
                <div class="worker-time" id="workerTime${i}">-</div>
            </div>
        `;
    }
    workerGrid.innerHTML = html;
}

function updateWorkerCard(index, state, time = null) {
    const card = document.getElementById(`workerCard${index}`);
    const stateEl = document.getElementById(`workerState${index}`);
    const timeEl = document.getElementById(`workerTime${index}`);

    card.className = `worker-card ${state}`;

    const stateLabels = {
        idle: 'Idle',
        working: 'Processing...',
        success: 'Completed',
        failed: 'Failed',
        timeout: 'Timeout'
    };

    stateEl.textContent = stateLabels[state] || state;
    timeEl.textContent = time !== null ? `${time.toFixed(2)} ms` : '-';

    workerStates[index].state = state;
    workerStates[index].time = time;
}

function initVisualization() {
    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const workerCount = parseInt(workerCountInput.value);

    // Draw scatter-gather structure
    const centerX = canvas.width / 2;
    const topY = 60;
    const workerY = 200;
    const bottomY = 340;

    // Source node
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(centerX, topY, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Source', centerX, topY + 5);

    // Worker nodes
    const workerSpacing = canvas.width / (workerCount + 1);
    for (let i = 0; i < workerCount; i++) {
        const x = (i + 1) * workerSpacing;

        // Connection from source
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, topY + 25);
        ctx.lineTo(x, workerY - 25);
        ctx.stroke();

        // Worker node
        ctx.fillStyle = workerColors[i % workerColors.length];
        ctx.beginPath();
        ctx.arc(x, workerY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`W${i}`, x, workerY + 4);

        // Connection to result
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x, workerY + 25);
        ctx.lineTo(centerX, bottomY - 25);
        ctx.stroke();
    }

    // Result node
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(centerX, bottomY, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Gather', centerX, bottomY + 5);

    // Labels
    ctx.fillStyle = '#34d399';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Scatter: Distribute request to all workers', 20, 25);
    ctx.fillText('Gather: Collect and merge all results', 20, canvas.height - 15);
}

function drawWorkerProgress(workerIndex, progress, state) {
    const workerCount = parseInt(workerCountInput.value);
    const workerSpacing = canvas.width / (workerCount + 1);
    const x = (workerIndex + 1) * workerSpacing;
    const workerY = 200;

    // Clear previous state
    ctx.fillStyle = '#080f08';
    ctx.beginPath();
    ctx.arc(x, workerY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Draw progress ring
    const color = workerColors[workerIndex % workerColors.length];

    if (state === 'working') {
        // Progress arc
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, workerY, 28, -Math.PI / 2, -Math.PI / 2 + (progress / 100) * Math.PI * 2);
        ctx.stroke();
    }

    // Worker circle
    let fillColor = color;
    if (state === 'failed') fillColor = '#ef4444';
    else if (state === 'timeout') fillColor = '#f59e0b';
    else if (state === 'success') fillColor = color;
    else fillColor = 'rgba(100,100,100,0.5)';

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(x, workerY, 25, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`W${workerIndex}`, x, workerY + 4);

    // Status icon
    if (state === 'success') {
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText('✓', x, workerY + 45);
    } else if (state === 'failed' || state === 'timeout') {
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText('✗', x, workerY + 45);
    }
}

function terminateWorkers() {
    workers.forEach(w => w.terminate());
    workers = [];
}

async function runScatterGather() {
    const taskType = taskSelect.value;
    const workerCount = parseInt(workerCountInput.value);
    const dataSize = parseInt(dataSizeInput.value);
    const timeout = parseInt(timeoutInput.value);
    const failureRate = parseInt(failureRateInput.value);

    resultContainer.classList.add('hidden');
    initVisualization();
    initWorkerGrid();

    // Create workers
    terminateWorkers();
    for (let i = 0; i < workerCount; i++) {
        workers.push(new Worker('worker.js'));
    }

    const startTime = performance.now();
    const results = new Array(workerCount).fill(null);
    let completedCount = 0;
    let scatterEndTime = null;

    // Generate data shards
    const shards = [];
    for (let i = 0; i < workerCount; i++) {
        const shard = new Array(dataSize);
        for (let j = 0; j < dataSize; j++) {
            shard[j] = Math.random() * 1000;
        }
        shards.push(shard);
    }

    // Scatter phase
    const workerPromises = workers.map((worker, index) => {
        return new Promise((resolve) => {
            const workerStart = performance.now();
            updateWorkerCard(index, 'working');
            drawWorkerProgress(index, 0, 'working');

            // Timeout handler
            const timeoutId = setTimeout(() => {
                updateWorkerCard(index, 'timeout', timeout);
                drawWorkerProgress(index, 100, 'timeout');
                workerStates[index].result = { error: 'Timeout', workerId: index };
                resolve({ workerId: index, error: 'Timeout', time: timeout });
            }, timeout);

            worker.onmessage = (e) => {
                clearTimeout(timeoutId);
                const elapsed = performance.now() - workerStart;

                if (e.data.type === 'progress') {
                    drawWorkerProgress(index, e.data.percent, 'working');
                } else if (e.data.type === 'result') {
                    if (e.data.error) {
                        updateWorkerCard(index, 'failed', elapsed);
                        drawWorkerProgress(index, 100, 'failed');
                        workerStates[index].result = { error: e.data.error, workerId: index };
                    } else {
                        updateWorkerCard(index, 'success', elapsed);
                        drawWorkerProgress(index, 100, 'success');
                        workerStates[index].result = e.data.result;
                        results[index] = e.data.result;
                    }

                    completedCount++;
                    if (completedCount === 1) {
                        scatterEndTime = performance.now();
                    }

                    resolve({
                        workerId: index,
                        result: e.data.result,
                        error: e.data.error,
                        time: elapsed
                    });
                }
            };

            // Send task to worker
            worker.postMessage({
                workerId: index,
                taskType,
                data: shards[index],
                config: tasks[taskType],
                shouldFail: Math.random() * 100 < failureRate
            });
        });
    });

    // Wait for all workers (gather phase)
    const workerResults_data = await Promise.all(workerPromises);
    const gatherStartTime = performance.now();

    // Gather and merge results
    const validResults = results.filter(r => r !== null);
    let finalResult;

    switch (taskType) {
        case 'search':
            // Merge and sort search results
            const allMatches = validResults.flatMap(r => r.matches || []);
            allMatches.sort((a, b) => b.score - a.score);
            finalResult = {
                totalMatches: allMatches.length,
                topResults: allMatches.slice(0, 10)
            };
            break;

        case 'aggregate':
            // Aggregate statistics
            finalResult = {
                count: validResults.reduce((s, r) => s + (r.count || 0), 0),
                sum: validResults.reduce((s, r) => s + (r.sum || 0), 0),
                min: Math.min(...validResults.map(r => r.min || Infinity)),
                max: Math.max(...validResults.map(r => r.max || -Infinity)),
                avg: validResults.reduce((s, r) => s + (r.sum || 0), 0) /
                     validResults.reduce((s, r) => s + (r.count || 0), 0)
            };
            break;

        case 'mapReduce':
            // Sum all partial sums
            finalResult = {
                totalSum: validResults.reduce((s, r) => s + (r.partialSum || 0), 0),
                itemsProcessed: validResults.reduce((s, r) => s + (r.count || 0), 0)
            };
            break;

        case 'bestPrice':
            // Find best price
            const allPrices = validResults.map(r => ({
                supplier: r.supplier,
                price: r.price,
                available: r.available
            })).filter(p => p.available);

            allPrices.sort((a, b) => a.price - b.price);
            finalResult = {
                bestPrice: allPrices[0] || null,
                allPrices: allPrices
            };
            break;
    }

    const gatherEndTime = performance.now();
    const totalTime = gatherEndTime - startTime;

    // Display results
    resultContainer.classList.remove('hidden');

    const successCount = workerResults_data.filter(r => !r.error).length;
    statusEl.textContent = successCount === workerCount ? 'All Success' :
                          successCount > 0 ? 'Partial Success' : 'All Failed';
    statusEl.style.color = successCount === workerCount ? '#34d399' :
                          successCount > 0 ? '#fbbf24' : '#ef4444';

    // Format final result
    let resultText;
    if (taskType === 'search') {
        resultText = `${finalResult.totalMatches} matches found`;
    } else if (taskType === 'aggregate') {
        resultText = `Sum: ${finalResult.sum.toFixed(2)}, Avg: ${finalResult.avg.toFixed(2)}`;
    } else if (taskType === 'mapReduce') {
        resultText = `Total: ${finalResult.totalSum.toFixed(2)}`;
    } else if (taskType === 'bestPrice') {
        resultText = finalResult.bestPrice ?
            `$${finalResult.bestPrice.price.toFixed(2)} from ${finalResult.bestPrice.supplier}` :
            'No available prices';
    }

    finalResultEl.textContent = resultText;
    totalTimeEl.textContent = totalTime.toFixed(2) + ' ms';
    workersRespondedEl.textContent = `${successCount}/${workerCount}`;

    const times = workerResults_data.map(r => r.time);
    scatterTimeEl.textContent = (scatterEndTime - startTime).toFixed(2) + ' ms';
    fastestWorkerEl.textContent = `W${times.indexOf(Math.min(...times))} (${Math.min(...times).toFixed(2)}ms)`;
    slowestWorkerEl.textContent = `W${times.indexOf(Math.max(...times))} (${Math.max(...times).toFixed(2)}ms)`;
    gatherTimeEl.textContent = (gatherEndTime - gatherStartTime).toFixed(2) + ' ms';

    // Render individual worker results
    renderWorkerResults(workerResults_data, taskType);

    terminateWorkers();
}

function renderWorkerResults(results, taskType) {
    let html = '';

    results.forEach((r, i) => {
        const isSuccess = !r.error;
        let resultData = '';

        if (isSuccess && r.result) {
            switch (taskType) {
                case 'search':
                    resultData = `Matches: ${r.result.matches?.length || 0}`;
                    break;
                case 'aggregate':
                    resultData = `Sum: ${r.result.sum?.toFixed(2) || 0}, Count: ${r.result.count || 0}`;
                    break;
                case 'mapReduce':
                    resultData = `Partial Sum: ${r.result.partialSum?.toFixed(2) || 0}`;
                    break;
                case 'bestPrice':
                    resultData = `$${r.result.price?.toFixed(2) || '-'} (${r.result.supplier || '-'})`;
                    break;
            }
        } else {
            resultData = r.error || 'Unknown error';
        }

        html += `
            <div class="worker-result-card ${isSuccess ? '' : 'failed'}">
                <div class="worker-result-header" style="color: ${workerColors[i % workerColors.length]}">
                    Worker ${i} - ${r.time.toFixed(2)}ms
                </div>
                <div class="worker-result-data">${resultData}</div>
            </div>
        `;
    });

    workerResults.innerHTML = html;
}

function reset() {
    terminateWorkers();
    resultContainer.classList.add('hidden');
    initWorkerGrid();
    initVisualization();
}

taskSelect.addEventListener('change', updateTaskDescription);
workerCountInput.addEventListener('change', () => {
    initWorkerGrid();
    initVisualization();
});
runBtn.addEventListener('click', runScatterGather);
resetBtn.addEventListener('click', reset);

updateTaskDescription();
initWorkerGrid();
initVisualization();
