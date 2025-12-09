// Pipeline Pattern - Main Thread

const pipelineSelect = document.getElementById('pipelineSelect');
const pipelineDescription = document.getElementById('pipelineDescription');
const itemCountInput = document.getElementById('itemCount');
const itemSizeInput = document.getElementById('itemSize');
const bufferSizeInput = document.getElementById('bufferSize');
const stageDelayInput = document.getElementById('stageDelay');

const runBtn = document.getElementById('runBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const stageProgress = document.getElementById('stageProgress');
const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const itemsProcessedEl = document.getElementById('itemsProcessed');
const totalTimeEl = document.getElementById('totalTime');
const throughputEl = document.getElementById('throughput');
const avgLatencyEl = document.getElementById('avgLatency');
const stage1TimeEl = document.getElementById('stage1Time');
const stage2TimeEl = document.getElementById('stage2Time');
const stage3TimeEl = document.getElementById('stage3Time');
const itemTimeline = document.getElementById('itemTimeline');

const canvas = document.getElementById('pipelineCanvas');
const ctx = canvas.getContext('2d');

let stageWorkers = [];
let isPaused = false;
let isRunning = false;
let itemTimings = [];
let stageStats = { stage1: [], stage2: [], stage3: [] };

const pipelines = {
    imageProcess: {
        name: 'Image Processing Pipeline',
        description: `Stage 1: Decode & Resize (解碼與縮放)
Stage 2: Apply Filters (套用濾鏡)
Stage 3: Encode & Compress (編碼與壓縮)

模擬影像處理管線，每張圖片依序經過三個階段`,
        stages: ['Decode', 'Filter', 'Encode']
    },
    textAnalysis: {
        name: 'Text Analysis Pipeline',
        description: `Stage 1: Tokenize (分詞)
Stage 2: Analyze Sentiment (情感分析)
Stage 3: Extract Keywords (關鍵詞提取)

模擬文字分析管線，處理大量文件`,
        stages: ['Tokenize', 'Sentiment', 'Keywords']
    },
    dataETL: {
        name: 'Data ETL Pipeline',
        description: `Stage 1: Extract (資料擷取)
Stage 2: Transform (資料轉換)
Stage 3: Load (資料載入)

經典的 ETL 資料處理管線`,
        stages: ['Extract', 'Transform', 'Load']
    },
    cryptoChain: {
        name: 'Crypto Chain Pipeline',
        description: `Stage 1: Hash (雜湊計算)
Stage 2: Encrypt (加密)
Stage 3: Sign (數位簽章)

模擬加密處理鏈，確保資料安全`,
        stages: ['Hash', 'Encrypt', 'Sign']
    }
};

const stageColors = ['#10b981', '#6366f1', '#f59e0b'];

function updatePipelineDescription() {
    const selected = pipelineSelect.value;
    pipelineDescription.textContent = pipelines[selected].description;
    initStageProgress();
}

function initStageProgress() {
    const selected = pipelineSelect.value;
    const stages = pipelines[selected].stages;

    stageProgress.innerHTML = stages.map((stage, i) => `
        <div class="stage-item">
            <div class="stage-name" style="color: ${stageColors[i]}">${stage}</div>
            <div class="stage-bar-container">
                <div class="stage-bar" id="stageBar${i}" style="width: 0%; background: ${stageColors[i]}"></div>
            </div>
            <div class="stage-count" id="stageCount${i}">0 items</div>
        </div>
    `).join('');
}

function initVisualization() {
    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const selected = pipelineSelect.value;
    const stages = pipelines[selected].stages;

    // Draw pipeline structure
    const stageWidth = 120;
    const stageHeight = 60;
    const startX = 80;
    const y = canvas.height / 2;
    const gap = (canvas.width - startX * 2 - stageWidth * 3) / 2;

    // Draw arrows
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 3;

    for (let i = 0; i < 3; i++) {
        const x = startX + i * (stageWidth + gap);

        // Stage box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.strokeStyle = stageColors[i];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y - stageHeight / 2, stageWidth, stageHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Stage label
        ctx.fillStyle = stageColors[i];
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stages[i], x + stageWidth / 2, y + 5);

        // Arrow to next stage
        if (i < 2) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + stageWidth + 10, y);
            ctx.lineTo(x + stageWidth + gap - 10, y);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(x + stageWidth + gap - 10, y);
            ctx.lineTo(x + stageWidth + gap - 20, y - 8);
            ctx.lineTo(x + stageWidth + gap - 20, y + 8);
            ctx.closePath();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.fill();
        }
    }

    // Input arrow
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(startX - 10, y);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Input', 15, y - 15);

    // Output arrow
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.beginPath();
    ctx.moveTo(startX + 2 * (stageWidth + gap) + stageWidth + 10, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'right';
    ctx.fillText('Output', canvas.width - 15, y - 15);

    // Title
    ctx.fillStyle = '#34d399';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Pipeline: Items flow through stages in sequence', 20, 25);
}

function drawPipelineState(itemsInStages, completedItems, totalItems) {
    initVisualization();

    const selected = pipelineSelect.value;
    const stages = pipelines[selected].stages;

    const stageWidth = 120;
    const stageHeight = 60;
    const startX = 80;
    const y = canvas.height / 2;
    const gap = (canvas.width - startX * 2 - stageWidth * 3) / 2;

    // Draw items in each stage
    for (let i = 0; i < 3; i++) {
        const x = startX + i * (stageWidth + gap);
        const items = itemsInStages[i] || [];

        // Draw item dots in stage
        items.forEach((item, idx) => {
            const dotX = x + 20 + (idx % 5) * 20;
            const dotY = y - 15 + Math.floor(idx / 5) * 12;

            ctx.beginPath();
            ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
            ctx.fillStyle = stageColors[i];
            ctx.fill();

            // Pulsing animation for active items
            ctx.beginPath();
            ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
            ctx.strokeStyle = stageColors[i];
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        // Stage count
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${items.length} items`, x + stageWidth / 2, y + stageHeight / 2 + 15);
    }

    // Progress indicator
    const progress = (completedItems / totalItems) * 100;
    ctx.fillStyle = '#34d399';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Completed: ${completedItems}/${totalItems} (${progress.toFixed(0)}%)`, canvas.width - 20, canvas.height - 20);

    // Draw completed items output
    if (completedItems > 0) {
        const outputX = canvas.width - 50;
        for (let i = 0; i < Math.min(completedItems, 10); i++) {
            ctx.beginPath();
            ctx.arc(outputX - (i % 5) * 12, y + 30 - Math.floor(i / 5) * 12, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();
        }
    }
}

function terminateWorkers() {
    stageWorkers.forEach(w => w.terminate());
    stageWorkers = [];
}

async function runPipeline() {
    if (isRunning) return;
    isRunning = true;
    isPaused = false;

    const pipelineType = pipelineSelect.value;
    const itemCount = parseInt(itemCountInput.value);
    const itemSize = parseInt(itemSizeInput.value);
    const bufferSize = parseInt(bufferSizeInput.value);
    const stageDelay = parseInt(stageDelayInput.value);

    resultContainer.classList.add('hidden');
    itemTimings = [];
    stageStats = { stage1: [], stage2: [], stage3: [] };

    // Create stage workers
    terminateWorkers();
    for (let i = 0; i < 3; i++) {
        stageWorkers.push(new Worker('worker.js'));
    }

    const startTime = performance.now();
    const itemsInStages = [[], [], []];
    let completedItems = 0;
    const stageCounts = [0, 0, 0];

    // Initialize item tracking
    const itemStarts = new Array(itemCount);
    const itemStageEnters = new Array(itemCount).fill(null).map(() => [0, 0, 0]);
    const itemStageExits = new Array(itemCount).fill(null).map(() => [0, 0, 0]);

    // Queues between stages
    const queues = [[], [], []]; // Input to stage 1, stage 1 to 2, stage 2 to 3
    const outputQueue = [];

    // Generate initial items
    for (let i = 0; i < itemCount; i++) {
        const item = {
            id: i,
            data: new Array(itemSize * 100).fill(0).map(() => Math.random()),
            timestamp: performance.now() - startTime
        };
        queues[0].push(item);
        itemStarts[i] = performance.now();
    }

    // Process stages
    const stagePromises = [0, 1, 2].map(stageIndex => {
        return new Promise((resolve) => {
            const worker = stageWorkers[stageIndex];

            worker.onmessage = (e) => {
                const { itemId, result, processingTime } = e.data;

                // Record timing
                itemStageExits[itemId][stageIndex] = performance.now();
                stageStats[`stage${stageIndex + 1}`].push(processingTime);

                // Remove from current stage
                const idx = itemsInStages[stageIndex].findIndex(item => item.id === itemId);
                if (idx !== -1) {
                    itemsInStages[stageIndex].splice(idx, 1);
                }

                // Move to next stage or output
                if (stageIndex < 2) {
                    queues[stageIndex + 1].push({ id: itemId, data: result });
                } else {
                    outputQueue.push({ id: itemId, data: result });
                    completedItems++;

                    // Record item completion
                    itemTimings.push({
                        id: itemId,
                        start: itemStarts[itemId] - startTime,
                        stageEnters: itemStageEnters[itemId].map(t => t - startTime),
                        stageExits: itemStageExits[itemId].map(t => t - startTime),
                        end: performance.now() - startTime
                    });

                    // Update progress
                    for (let s = 0; s < 3; s++) {
                        document.getElementById(`stageBar${s}`).style.width =
                            `${(stageCounts[s] / itemCount) * 100}%`;
                        document.getElementById(`stageCount${s}`).textContent =
                            `${stageCounts[s]}/${itemCount} items`;
                    }

                    drawPipelineState(itemsInStages, completedItems, itemCount);
                }

                stageCounts[stageIndex]++;

                // Check if all done
                if (completedItems === itemCount) {
                    resolve();
                }
            };

            // Stage processing loop
            const processNext = () => {
                if (isPaused) {
                    setTimeout(processNext, 100);
                    return;
                }

                if (queues[stageIndex].length > 0 && itemsInStages[stageIndex].length < bufferSize) {
                    const item = queues[stageIndex].shift();
                    itemsInStages[stageIndex].push(item);
                    itemStageEnters[item.id][stageIndex] = performance.now();

                    worker.postMessage({
                        itemId: item.id,
                        stageIndex,
                        pipelineType,
                        data: item.data,
                        delay: stageDelay
                    });

                    drawPipelineState(itemsInStages, completedItems, itemCount);
                }

                if (completedItems < itemCount) {
                    setTimeout(processNext, 10);
                }
            };

            processNext();
        });
    });

    await Promise.all(stagePromises);

    const totalTime = performance.now() - startTime;
    isRunning = false;

    // Show results
    resultContainer.classList.remove('hidden');
    statusEl.textContent = 'Completed';
    statusEl.style.color = '#34d399';
    itemsProcessedEl.textContent = itemCount;
    totalTimeEl.textContent = totalTime.toFixed(2) + ' ms';
    throughputEl.textContent = (itemCount / (totalTime / 1000)).toFixed(2) + ' items/s';

    const latencies = itemTimings.map(t => t.end - t.start);
    avgLatencyEl.textContent = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) + ' ms';

    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '-';
    stage1TimeEl.textContent = avg(stageStats.stage1) + ' ms';
    stage2TimeEl.textContent = avg(stageStats.stage2) + ' ms';
    stage3TimeEl.textContent = avg(stageStats.stage3) + ' ms';

    renderItemTimeline();
    terminateWorkers();
}

function renderItemTimeline() {
    if (itemTimings.length === 0) {
        itemTimeline.innerHTML = '<p style="color: #4a7a5a; text-align: center;">No timeline data</p>';
        return;
    }

    const maxTime = Math.max(...itemTimings.map(t => t.end));
    const selected = pipelineSelect.value;
    const stages = pipelines[selected].stages;

    let html = '';
    const showItems = itemTimings.slice(0, 15);

    showItems.forEach(item => {
        html += `<div class="timeline-row">
            <span class="timeline-label">Item ${item.id}</span>
            <div class="timeline-bar-container">`;

        for (let s = 0; s < 3; s++) {
            const left = (item.stageEnters[s] / maxTime) * 100;
            const width = ((item.stageExits[s] - item.stageEnters[s]) / maxTime) * 100;
            html += `<div class="timeline-segment" style="left: ${left}%; width: ${Math.max(width, 1)}%; background: ${stageColors[s]}">${stages[s]}</div>`;
        }

        html += '</div></div>';
    });

    if (itemTimings.length > 15) {
        html += `<p style="color: #4a7a5a; text-align: center; margin-top: 0.5rem;">... and ${itemTimings.length - 15} more items</p>`;
    }

    itemTimeline.innerHTML = html;
}

function togglePause() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

function reset() {
    terminateWorkers();
    isRunning = false;
    isPaused = false;
    pauseBtn.textContent = 'Pause';
    resultContainer.classList.add('hidden');
    itemTimings = [];
    stageStats = { stage1: [], stage2: [], stage3: [] };
    initStageProgress();
    initVisualization();
}

pipelineSelect.addEventListener('change', () => {
    updatePipelineDescription();
    initVisualization();
});
runBtn.addEventListener('click', runPipeline);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', reset);

updatePipelineDescription();
initVisualization();
