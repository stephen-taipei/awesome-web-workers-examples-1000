// Fork-Join Pattern - Main Thread

const taskSelect = document.getElementById('taskSelect');
const taskDescription = document.getElementById('taskDescription');
const dataSizeInput = document.getElementById('dataSize');
const workerCountInput = document.getElementById('workerCount');
const thresholdInput = document.getElementById('threshold');
const depthInput = document.getElementById('depth');

const runBtn = document.getElementById('runBtn');
const compareBtn = document.getElementById('compareBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const statusEl = document.getElementById('status');
const resultValueEl = document.getElementById('resultValue');
const parallelTimeEl = document.getElementById('parallelTime');
const sequentialTimeEl = document.getElementById('sequentialTime');
const speedupEl = document.getElementById('speedup');
const taskCountEl = document.getElementById('taskCount');
const maxDepthEl = document.getElementById('maxDepth');
const efficiencyEl = document.getElementById('efficiency');
const timelineContainer = document.getElementById('timelineContainer');

const canvas = document.getElementById('forkJoinCanvas');
const ctx = canvas.getContext('2d');

let workers = [];
let taskTree = null;
let executionTimeline = [];
let sequentialTime = null;

const tasks = {
    arraySum: {
        name: 'Array Sum',
        description: `計算大型陣列的總和
Fork: 將陣列分割成多個子陣列
Join: 合併各子陣列的部分和
適用: 任何可累加的運算`,
        generate: (size) => {
            const arr = new Array(size);
            for (let i = 0; i < size; i++) {
                arr[i] = Math.random() * 100;
            }
            return arr;
        },
        sequential: (data) => data.reduce((a, b) => a + b, 0)
    },
    mergeSort: {
        name: 'Merge Sort',
        description: `合併排序演算法
Fork: 將陣列分成左右兩半
Join: 合併已排序的子陣列
適用: 需要穩定排序的場景`,
        generate: (size) => {
            const arr = new Array(size);
            for (let i = 0; i < size; i++) {
                arr[i] = Math.floor(Math.random() * 1000000);
            }
            return arr;
        },
        sequential: (data) => {
            const arr = data.slice();
            mergeSort(arr, 0, arr.length - 1);
            return arr.slice(0, 10).join(', ') + '...';
        }
    },
    primeCount: {
        name: 'Prime Count',
        description: `統計指定範圍內的質數數量
Fork: 將數值範圍分段
Join: 合併各段的質數計數
適用: 計算密集型任務`,
        generate: (size) => ({ start: 2, end: size }),
        sequential: (data) => {
            let count = 0;
            for (let n = data.start; n <= data.end; n++) {
                if (isPrime(n)) count++;
            }
            return count;
        }
    },
    matrixMult: {
        name: 'Matrix Multiply',
        description: `矩陣乘法運算
Fork: 將結果矩陣分塊計算
Join: 合併各區塊結果
適用: 科學計算、機器學習`,
        generate: (size) => {
            const dim = Math.floor(Math.sqrt(size / 2));
            const A = [], B = [];
            for (let i = 0; i < dim; i++) {
                A[i] = []; B[i] = [];
                for (let j = 0; j < dim; j++) {
                    A[i][j] = Math.random() * 10;
                    B[i][j] = Math.random() * 10;
                }
            }
            return { A, B, dim };
        },
        sequential: (data) => {
            const { A, B, dim } = data;
            const C = [];
            for (let i = 0; i < dim; i++) {
                C[i] = [];
                for (let j = 0; j < dim; j++) {
                    let sum = 0;
                    for (let k = 0; k < dim; k++) {
                        sum += A[i][k] * B[k][j];
                    }
                    C[i][j] = sum;
                }
            }
            return `${dim}x${dim} matrix`;
        }
    }
};

function mergeSort(arr, left, right) {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

function merge(arr, left, mid, right) {
    const temp = [];
    let i = left, j = mid + 1;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) temp.push(arr[i++]);
        else temp.push(arr[j++]);
    }
    while (i <= mid) temp.push(arr[i++]);
    while (j <= right) temp.push(arr[j++]);
    for (let k = 0; k < temp.length; k++) {
        arr[left + k] = temp[k];
    }
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

function updateTaskDescription() {
    const selected = taskSelect.value;
    taskDescription.textContent = tasks[selected].description;
}

function terminateWorkers() {
    workers.forEach(w => w.terminate());
    workers = [];
}

function initVisualization() {
    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click "Execute Fork-Join" to start parallel processing', canvas.width / 2, canvas.height / 2);
}

function drawForkJoinTree(tree, results) {
    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!tree) return;

    const nodesByLevel = [];
    function collectNodes(node, level) {
        if (!nodesByLevel[level]) nodesByLevel[level] = [];
        nodesByLevel[level].push(node);
        if (node.children) {
            node.children.forEach(child => collectNodes(child, level + 1));
        }
    }
    collectNodes(tree, 0);

    const levelHeight = canvas.height / (nodesByLevel.length + 1);
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    // Draw connections first
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 2;

    nodesByLevel.forEach((nodes, level) => {
        const y = (level + 1) * levelHeight;
        const spacing = canvas.width / (nodes.length + 1);

        nodes.forEach((node, idx) => {
            const x = (idx + 1) * spacing;
            node._x = x;
            node._y = y;

            if (node.children) {
                node.children.forEach(child => {
                    if (child._x !== undefined) {
                        ctx.beginPath();
                        ctx.moveTo(x, y + 15);
                        ctx.lineTo(child._x, child._y - 15);
                        ctx.stroke();
                    }
                });
            }
        });
    });

    // Draw nodes
    nodesByLevel.forEach((nodes, level) => {
        nodes.forEach((node, idx) => {
            const x = node._x;
            const y = node._y;
            const color = colors[level % colors.length];
            const isComplete = results && results[node.id] !== undefined;

            // Node circle
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fillStyle = isComplete ? color : 'rgba(255,255,255,0.1)';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Node label
            ctx.fillStyle = isComplete ? '#fff' : '#666';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(node.id.toString(), x, y + 4);
        });
    });

    // Legend
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'left';
    ctx.fillText('Fork-Join Tree: Each node represents a subtask', 20, 20);
    ctx.fillText(`Total Tasks: ${countNodes(tree)}`, 20, 38);
}

function countNodes(node) {
    let count = 1;
    if (node.children) {
        node.children.forEach(child => count += countNodes(child));
    }
    return count;
}

function createTaskTree(totalSize, threshold, maxDepth, depth = 0, id = 0) {
    const node = { id, size: totalSize, depth };

    if (totalSize <= threshold || depth >= maxDepth) {
        node.isLeaf = true;
        return { node, nextId: id + 1 };
    }

    const halfSize = Math.floor(totalSize / 2);
    const leftResult = createTaskTree(halfSize, threshold, maxDepth, depth + 1, id + 1);
    const rightResult = createTaskTree(totalSize - halfSize, threshold, maxDepth, depth + 1, leftResult.nextId);

    node.children = [leftResult.node, rightResult.node];
    return { node, nextId: rightResult.nextId };
}

async function runForkJoin() {
    const taskType = taskSelect.value;
    const dataSize = parseInt(dataSizeInput.value);
    const workerCount = parseInt(workerCountInput.value);
    const threshold = parseInt(thresholdInput.value);
    const maxDepth = parseInt(depthInput.value);

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Generating data...';

    // Generate data
    const data = tasks[taskType].generate(dataSize);

    // Create task tree
    const treeResult = createTaskTree(dataSize, threshold, maxDepth);
    taskTree = treeResult.node;
    const taskCount = treeResult.nextId;

    drawForkJoinTree(taskTree, {});

    // Initialize workers
    terminateWorkers();
    for (let i = 0; i < workerCount; i++) {
        workers.push(new Worker('worker.js'));
    }

    progressText.textContent = 'Executing Fork-Join...';
    const startTime = performance.now();
    executionTimeline = [];

    // Collect leaf tasks
    const leafTasks = [];
    function collectLeaves(node, start = 0) {
        if (node.isLeaf) {
            leafTasks.push({ id: node.id, start, size: node.size });
            return;
        }
        if (node.children) {
            let offset = start;
            node.children.forEach(child => {
                collectLeaves(child, offset);
                offset += child.size;
            });
        }
    }
    collectLeaves(taskTree);

    // Distribute tasks to workers
    const results = {};
    let completedTasks = 0;

    const taskPromises = leafTasks.map((task, idx) => {
        return new Promise((resolve) => {
            const worker = workers[idx % workerCount];
            const taskStart = performance.now();

            const handler = (e) => {
                if (e.data.taskId === task.id) {
                    worker.removeEventListener('message', handler);
                    results[task.id] = e.data.result;
                    completedTasks++;

                    executionTimeline.push({
                        taskId: task.id,
                        workerId: idx % workerCount,
                        start: taskStart - startTime,
                        end: performance.now() - startTime
                    });

                    const progress = (completedTasks / leafTasks.length) * 100;
                    progressBar.style.width = progress + '%';
                    progressText.textContent = `Completed ${completedTasks}/${leafTasks.length} tasks`;

                    drawForkJoinTree(taskTree, results);
                    resolve();
                }
            };

            worker.addEventListener('message', handler);

            // Prepare task data
            let taskData;
            if (taskType === 'arraySum') {
                taskData = data.slice(task.start, task.start + task.size);
            } else if (taskType === 'mergeSort') {
                taskData = data.slice(task.start, task.start + task.size);
            } else if (taskType === 'primeCount') {
                const rangeSize = Math.floor((data.end - data.start) / taskCount);
                taskData = {
                    start: data.start + task.id * rangeSize,
                    end: data.start + (task.id + 1) * rangeSize - 1
                };
            } else if (taskType === 'matrixMult') {
                const blockSize = Math.floor(data.dim / Math.sqrt(taskCount));
                const blocksPerRow = Math.ceil(data.dim / blockSize);
                const blockRow = Math.floor(task.id / blocksPerRow);
                const blockCol = task.id % blocksPerRow;
                taskData = {
                    A: data.A,
                    B: data.B,
                    startRow: blockRow * blockSize,
                    endRow: Math.min((blockRow + 1) * blockSize, data.dim),
                    startCol: blockCol * blockSize,
                    endCol: Math.min((blockCol + 1) * blockSize, data.dim),
                    dim: data.dim
                };
            }

            worker.postMessage({
                taskId: task.id,
                taskType,
                data: taskData
            });
        });
    });

    await Promise.all(taskPromises);

    const parallelTime = performance.now() - startTime;

    // Join results
    let finalResult;
    if (taskType === 'arraySum') {
        finalResult = Object.values(results).reduce((a, b) => a + b, 0);
    } else if (taskType === 'mergeSort') {
        const sortedArrays = Object.values(results);
        finalResult = mergeSortedArrays(sortedArrays);
        finalResult = finalResult.slice(0, 10).join(', ') + '...';
    } else if (taskType === 'primeCount') {
        finalResult = Object.values(results).reduce((a, b) => a + b, 0);
    } else if (taskType === 'matrixMult') {
        finalResult = `${data.dim}x${data.dim} matrix computed`;
    }

    // Mark all nodes as complete
    function markComplete(node) {
        results[node.id] = true;
        if (node.children) {
            node.children.forEach(markComplete);
        }
    }
    markComplete(taskTree);
    drawForkJoinTree(taskTree, results);

    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    statusEl.textContent = 'Completed';
    statusEl.style.color = '#34d399';
    resultValueEl.textContent = typeof finalResult === 'number' ? finalResult.toFixed(2) : finalResult;
    parallelTimeEl.textContent = parallelTime.toFixed(2) + ' ms';
    taskCountEl.textContent = taskCount;
    maxDepthEl.textContent = maxDepth;

    if (sequentialTime !== null) {
        sequentialTimeEl.textContent = sequentialTime.toFixed(2) + ' ms';
        const speedup = sequentialTime / parallelTime;
        speedupEl.textContent = speedup.toFixed(2) + 'x';
        efficiencyEl.textContent = ((speedup / workerCount) * 100).toFixed(1) + '%';
    } else {
        sequentialTimeEl.textContent = 'Click Compare';
        speedupEl.textContent = '-';
        efficiencyEl.textContent = '-';
    }

    renderTimeline();
    terminateWorkers();
}

function mergeSortedArrays(arrays) {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];

    let result = arrays[0];
    for (let i = 1; i < arrays.length; i++) {
        result = mergeTwoArrays(result, arrays[i]);
    }
    return result;
}

function mergeTwoArrays(a, b) {
    const result = [];
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] <= b[j]) result.push(a[i++]);
        else result.push(b[j++]);
    }
    while (i < a.length) result.push(a[i++]);
    while (j < b.length) result.push(b[j++]);
    return result;
}

async function runSequential() {
    const taskType = taskSelect.value;
    const dataSize = parseInt(dataSizeInput.value);

    progressContainer.classList.remove('hidden');
    progressBar.style.width = '50%';
    progressText.textContent = 'Running sequential computation...';

    const data = tasks[taskType].generate(dataSize);

    const startTime = performance.now();
    const result = tasks[taskType].sequential(data);
    sequentialTime = performance.now() - startTime;

    progressContainer.classList.add('hidden');

    if (resultContainer.classList.contains('hidden')) {
        resultContainer.classList.remove('hidden');
        statusEl.textContent = 'Sequential Only';
        resultValueEl.textContent = typeof result === 'number' ? result.toFixed(2) : result;
        parallelTimeEl.textContent = '-';
    }

    sequentialTimeEl.textContent = sequentialTime.toFixed(2) + ' ms';

    if (parallelTimeEl.textContent !== '-') {
        const parallelTime = parseFloat(parallelTimeEl.textContent);
        const speedup = sequentialTime / parallelTime;
        const workerCount = parseInt(workerCountInput.value);
        speedupEl.textContent = speedup.toFixed(2) + 'x';
        efficiencyEl.textContent = ((speedup / workerCount) * 100).toFixed(1) + '%';
    }
}

function renderTimeline() {
    if (executionTimeline.length === 0) {
        timelineContainer.innerHTML = '<p style="color: #4a7a5a; text-align: center;">No timeline data</p>';
        return;
    }

    const maxTime = Math.max(...executionTimeline.map(t => t.end));
    const workerCount = parseInt(workerCountInput.value);
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    let html = '';
    for (let w = 0; w < workerCount; w++) {
        const workerTasks = executionTimeline.filter(t => t.workerId === w);
        html += `<div class="timeline-row">
            <span class="timeline-label">Worker ${w}</span>
            <div class="timeline-bar-container">`;

        workerTasks.forEach(task => {
            const left = (task.start / maxTime) * 100;
            const width = ((task.end - task.start) / maxTime) * 100;
            html += `<div class="timeline-bar" style="left: ${left}%; width: ${Math.max(width, 1)}%; background: ${colors[w % colors.length]}">T${task.taskId}</div>`;
        });

        html += '</div></div>';
    }

    timelineContainer.innerHTML = html;
}

function reset() {
    terminateWorkers();
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    sequentialTime = null;
    taskTree = null;
    executionTimeline = [];
    initVisualization();
}

taskSelect.addEventListener('change', updateTaskDescription);
runBtn.addEventListener('click', runForkJoin);
compareBtn.addEventListener('click', runSequential);
resetBtn.addEventListener('click', reset);

updateTaskDescription();
initVisualization();
