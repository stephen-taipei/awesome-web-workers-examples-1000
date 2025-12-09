// Data Parallelism - Main Thread

const operationSelect = document.getElementById('operation');
const workerCountSelect = document.getElementById('workerCount');
const dataSizeSelect = document.getElementById('dataSize');
const chunkStrategySelect = document.getElementById('chunkStrategy');
const operationDescription = document.getElementById('operationDescription');

const startBtn = document.getElementById('startBtn');
const sequentialBtn = document.getElementById('sequentialBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const parallelTimeEl = document.getElementById('parallelTime');
const sequentialTimeEl = document.getElementById('sequentialTime');
const speedupEl = document.getElementById('speedup');
const elementsProcessedEl = document.getElementById('elementsProcessed');
const resultSizeEl = document.getElementById('resultSize');
const throughputEl = document.getElementById('throughput');
const efficiencyEl = document.getElementById('efficiency');
const resultPreviewEl = document.getElementById('resultPreview');
const workerStatsEl = document.getElementById('workerStats');

const parallelCanvas = document.getElementById('parallelCanvas');
const ctx = parallelCanvas.getContext('2d');

let workers = [];
let workerProgress = [];
let workerStats = [];
let startTime = 0;
let isRunning = false;
let data = [];
let parallelResult = null;
let sequentialResult = null;
let parallelTime = 0;
let sequentialTime = 0;
let completedWorkers = 0;

const operations = {
    map: {
        name: 'Map (Transform)',
        description: `Map Operation - Transform Each Element
Apply a function to every element in the array.
f(x) = x² + 2x + 1 (quadratic transform)

Example: [1, 2, 3, 4] → [4, 9, 16, 25]

Each worker transforms its chunk independently.
Results are concatenated in order.`
    },
    filter: {
        name: 'Filter (Select)',
        description: `Filter Operation - Select Elements
Keep only elements that satisfy a condition.
Condition: x is prime OR x % 7 === 0

Example: [1, 2, 3, 4, 5, 6, 7] → [2, 3, 5, 7]

Each worker filters its chunk independently.
Results are concatenated (order preserved).`
    },
    reduce: {
        name: 'Reduce (Aggregate)',
        description: `Reduce Operation - Aggregate to Single Value
Combine all elements using an associative operation.
Operations: sum, product, max, min, mean

Example: sum([1, 2, 3, 4]) = 10

Each worker computes partial result.
Main thread combines partial results.`
    },
    mapreduce: {
        name: 'MapReduce',
        description: `MapReduce - Word Frequency Count
Classic MapReduce pattern:
1. Map: Extract (word, 1) pairs
2. Shuffle: Group by word (implicit)
3. Reduce: Sum counts for each word

Input: ["hello world", "hello there"]
Output: {hello: 2, world: 1, there: 1}`
    }
};

function updateOperationDescription() {
    const op = operationSelect.value;
    operationDescription.textContent = operations[op].description;
}

function generateData() {
    const size = parseInt(dataSizeSelect.value);
    const operation = operationSelect.value;

    data = [];

    if (operation === 'mapreduce') {
        // Generate text data for word count
        const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
                       'hello', 'world', 'data', 'parallel', 'worker', 'thread', 'async'];
        for (let i = 0; i < size; i++) {
            const numWords = Math.floor(Math.random() * 5) + 3;
            let sentence = '';
            for (let j = 0; j < numWords; j++) {
                sentence += words[Math.floor(Math.random() * words.length)] + ' ';
            }
            data.push(sentence.trim());
        }
    } else {
        // Generate numeric data
        for (let i = 0; i < size; i++) {
            data.push(Math.floor(Math.random() * 10000));
        }
    }

    return data;
}

function splitData(workerCount) {
    const chunks = [];
    const strategy = chunkStrategySelect.value;

    if (strategy === 'equal') {
        // Equal split
        const chunkSize = Math.ceil(data.length / workerCount);
        for (let i = 0; i < workerCount; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, data.length);
            chunks.push({
                data: data.slice(start, end),
                startIndex: start,
                endIndex: end
            });
        }
    } else {
        // Dynamic load balancing - use smaller initial chunks
        const smallChunkSize = Math.ceil(data.length / (workerCount * 4));
        let currentIndex = 0;

        for (let i = 0; i < workerCount; i++) {
            const start = currentIndex;
            const end = Math.min(start + smallChunkSize, data.length);
            chunks.push({
                data: data.slice(start, end),
                startIndex: start,
                endIndex: end
            });
            currentIndex = end;
        }

        // Store remaining chunks for dynamic assignment
        while (currentIndex < data.length) {
            const start = currentIndex;
            const end = Math.min(start + smallChunkSize, data.length);
            chunks.push({
                data: data.slice(start, end),
                startIndex: start,
                endIndex: end
            });
            currentIndex = end;
        }
    }

    return chunks;
}

function runParallel() {
    isRunning = true;
    startTime = performance.now();
    completedWorkers = 0;

    const workerCount = parseInt(workerCountSelect.value);
    const operation = operationSelect.value;

    generateData();
    const chunks = splitData(workerCount);

    // Initialize workers
    workers = [];
    workerProgress = [];
    workerStats = [];
    parallelResult = operation === 'reduce' ? { sum: 0, count: 0, max: -Infinity, min: Infinity }
                   : operation === 'mapreduce' ? {}
                   : [];

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Distributing data to workers...';

    // Create workers and assign initial chunks
    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        workers.push(worker);
        workerProgress.push(0);
        workerStats.push({
            id: i,
            elements: 0,
            time: 0,
            status: 'idle'
        });

        worker.onmessage = (e) => handleWorkerMessage(i, e.data, chunks);

        // Send initial chunk
        if (i < chunks.length) {
            workerStats[i].status = 'processing';
            workerStats[i].elements = chunks[i].data.length;
            worker.postMessage({
                type: 'process',
                operation,
                chunk: chunks[i].data,
                chunkIndex: i
            });
        }
    }

    draw();
}

function handleWorkerMessage(workerId, msg, chunks) {
    if (msg.type === 'progress') {
        workerProgress[workerId] = msg.progress;
        updateProgress();
        draw();
    } else if (msg.type === 'result') {
        const operation = operationSelect.value;

        workerStats[workerId].time = msg.time;
        workerStats[workerId].status = 'complete';

        // Combine results based on operation
        if (operation === 'map' || operation === 'filter') {
            // Append to result array
            if (!parallelResult.chunks) parallelResult.chunks = {};
            parallelResult.chunks[msg.chunkIndex] = msg.result;
        } else if (operation === 'reduce') {
            // Combine partial aggregations
            parallelResult.sum += msg.result.sum;
            parallelResult.count += msg.result.count;
            parallelResult.max = Math.max(parallelResult.max, msg.result.max);
            parallelResult.min = Math.min(parallelResult.min, msg.result.min);
        } else if (operation === 'mapreduce') {
            // Merge word counts
            for (const [word, count] of Object.entries(msg.result)) {
                parallelResult[word] = (parallelResult[word] || 0) + count;
            }
        }

        completedWorkers++;
        workerProgress[workerId] = 100;

        // Check if more chunks available (dynamic load balancing)
        const nextChunkIndex = workers.length + completedWorkers - 1;
        if (chunkStrategySelect.value === 'dynamic' && nextChunkIndex < chunks.length) {
            workerStats[workerId].status = 'processing';
            workerStats[workerId].elements += chunks[nextChunkIndex].data.length;
            workers[workerId].postMessage({
                type: 'process',
                operation: operationSelect.value,
                chunk: chunks[nextChunkIndex].data,
                chunkIndex: nextChunkIndex
            });
        } else if (completedWorkers >= workers.length ||
                  (chunkStrategySelect.value === 'dynamic' && areAllChunksProcessed(chunks))) {
            finishParallel();
        }

        updateProgress();
        draw();
    }
}

function areAllChunksProcessed(chunks) {
    if (!parallelResult.chunks) return false;
    return Object.keys(parallelResult.chunks).length >= chunks.length;
}

function finishParallel() {
    parallelTime = performance.now() - startTime;
    isRunning = false;

    // Terminate workers
    workers.forEach(w => w.terminate());

    // Finalize result
    const operation = operationSelect.value;
    if (operation === 'map' || operation === 'filter') {
        // Reconstruct array from chunks
        const finalResult = [];
        const chunkIndices = Object.keys(parallelResult.chunks).map(Number).sort((a, b) => a - b);
        for (const idx of chunkIndices) {
            finalResult.push(...parallelResult.chunks[idx]);
        }
        parallelResult = finalResult;
    } else if (operation === 'reduce') {
        parallelResult.mean = parallelResult.sum / parallelResult.count;
    }

    showResults();
}

function runSequential() {
    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Running sequential...';

    if (data.length === 0) {
        generateData();
    }

    const operation = operationSelect.value;
    const seqStartTime = performance.now();

    setTimeout(() => {
        switch (operation) {
            case 'map':
                sequentialResult = data.map(x => x * x + 2 * x + 1);
                break;

            case 'filter':
                sequentialResult = data.filter(x => isPrime(x) || x % 7 === 0);
                break;

            case 'reduce':
                sequentialResult = {
                    sum: data.reduce((a, b) => a + b, 0),
                    count: data.length,
                    max: Math.max(...data),
                    min: Math.min(...data)
                };
                sequentialResult.mean = sequentialResult.sum / sequentialResult.count;
                break;

            case 'mapreduce':
                sequentialResult = {};
                for (const sentence of data) {
                    const words = sentence.toLowerCase().split(/\s+/);
                    for (const word of words) {
                        if (word) {
                            sequentialResult[word] = (sequentialResult[word] || 0) + 1;
                        }
                    }
                }
                break;
        }

        sequentialTime = performance.now() - seqStartTime;
        progressContainer.classList.add('hidden');

        if (parallelResult !== null) {
            showResults();
        } else {
            sequentialTimeEl.textContent = sequentialTime.toFixed(2) + ' ms';
        }
    }, 10);
}

function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

function updateProgress() {
    const avgProgress = workerProgress.reduce((a, b) => a + b, 0) / workerProgress.length;
    progressBar.style.width = avgProgress + '%';

    const completed = workerProgress.filter(p => p >= 100).length;
    progressText.textContent = `Workers: ${completed}/${workers.length} complete | ${avgProgress.toFixed(0)}%`;
}

function showResults() {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const operation = operationSelect.value;
    const workerCount = parseInt(workerCountSelect.value);

    statusEl.textContent = 'Complete';
    statusEl.style.color = '#34d399';
    parallelTimeEl.textContent = parallelTime.toFixed(2) + ' ms';
    sequentialTimeEl.textContent = sequentialTime > 0 ? sequentialTime.toFixed(2) + ' ms' : 'Not run';

    const speedup = sequentialTime > 0 ? sequentialTime / parallelTime : 0;
    speedupEl.textContent = speedup > 0 ? speedup.toFixed(2) + 'x' : '-';
    speedupEl.style.color = speedup > 1 ? '#10b981' : '#f472b6';

    elementsProcessedEl.textContent = data.length.toLocaleString();

    let resultSize;
    if (Array.isArray(parallelResult)) {
        resultSize = parallelResult.length;
    } else if (typeof parallelResult === 'object') {
        resultSize = Object.keys(parallelResult).length;
    } else {
        resultSize = 1;
    }
    resultSizeEl.textContent = resultSize.toLocaleString();

    const throughput = data.length / (parallelTime / 1000);
    throughputEl.textContent = (throughput / 1000).toFixed(1) + 'K/s';

    const efficiency = speedup / workerCount * 100;
    efficiencyEl.textContent = efficiency > 0 ? efficiency.toFixed(1) + '%' : '-';

    // Result preview
    let preview = '';
    if (operation === 'map' || operation === 'filter') {
        const sample = parallelResult.slice(0, 10);
        preview = `[${sample.join(', ')}${parallelResult.length > 10 ? ', ...' : ''}]`;
    } else if (operation === 'reduce') {
        preview = `Sum: ${parallelResult.sum.toLocaleString()}, Mean: ${parallelResult.mean.toFixed(2)}, Max: ${parallelResult.max}, Min: ${parallelResult.min}`;
    } else if (operation === 'mapreduce') {
        const topWords = Object.entries(parallelResult)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        preview = topWords.map(([word, count]) => `${word}: ${count}`).join(', ');
    }
    resultPreviewEl.textContent = preview;

    // Worker stats
    let statsHtml = '';
    for (const stat of workerStats) {
        const rate = stat.time > 0 ? (stat.elements / stat.time * 1000).toFixed(0) : '-';
        statsHtml += `
            <div class="worker-stat ${stat.status}">
                <div class="worker-name">Worker ${stat.id}</div>
                <div class="worker-elements">${stat.elements.toLocaleString()} elements</div>
                <div class="worker-time">${stat.time.toFixed(1)} ms</div>
                <div class="worker-rate">${rate} elem/s</div>
            </div>
        `;
    }
    workerStatsEl.innerHTML = statsHtml;

    draw();
}

function draw() {
    const w = parallelCanvas.width;
    const h = parallelCanvas.height;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const workerCount = workers.length || parseInt(workerCountSelect.value);
    const barHeight = (h - 80) / workerCount;
    const barMaxWidth = w - 120;

    // Title
    ctx.fillStyle = '#34d399';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Worker Progress', w / 2, 20);

    // Draw worker bars
    for (let i = 0; i < workerCount; i++) {
        const y = 40 + i * barHeight;
        const progress = workerProgress[i] || 0;
        const stat = workerStats[i] || { status: 'idle' };

        // Label
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`W${i}`, 30, y + barHeight / 2 + 4);

        // Background bar
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(40, y + 5, barMaxWidth, barHeight - 10);

        // Progress bar
        const barWidth = (progress / 100) * barMaxWidth;
        const gradient = ctx.createLinearGradient(40, 0, 40 + barWidth, 0);

        if (stat.status === 'complete') {
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(1, '#059669');
        } else if (stat.status === 'processing') {
            gradient.addColorStop(0, '#f472b6');
            gradient.addColorStop(1, '#db2777');
        } else {
            gradient.addColorStop(0, '#4a5568');
            gradient.addColorStop(1, '#2d3748');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(40, y + 5, barWidth, barHeight - 10);

        // Progress text
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${progress.toFixed(0)}%`, 50 + barMaxWidth, y + barHeight / 2 + 4);

        // Data chunks visualization
        if (workerStats[i] && workerStats[i].elements > 0) {
            const elements = workerStats[i].elements;
            const maxElements = Math.max(...workerStats.map(s => s.elements || 0));
            const chunkWidth = (elements / maxElements) * 50;

            ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
            ctx.fillRect(w - 60, y + 8, chunkWidth, barHeight - 16);
        }
    }

    // Legend
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981';
    ctx.fillRect(10, h - 25, 10, 10);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('Complete', 25, h - 16);

    ctx.fillStyle = '#f472b6';
    ctx.fillRect(90, h - 25, 10, 10);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('Processing', 105, h - 16);

    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(180, h - 25, 10, 10);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('Data Size', 195, h - 16);
}

function reset() {
    isRunning = false;
    workers.forEach(w => w.terminate());
    workers = [];
    workerProgress = [];
    workerStats = [];
    data = [];
    parallelResult = null;
    sequentialResult = null;
    parallelTime = 0;
    sequentialTime = 0;

    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, parallelCanvas.width, parallelCanvas.height);
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Run Parallel" to begin', parallelCanvas.width / 2, parallelCanvas.height / 2);
}

operationSelect.addEventListener('change', updateOperationDescription);
startBtn.addEventListener('click', runParallel);
sequentialBtn.addEventListener('click', runSequential);
resetBtn.addEventListener('click', reset);

updateOperationDescription();
reset();
