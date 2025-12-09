// Optimistic Concurrency Control - Main Thread

const scenarioSelect = document.getElementById('scenarioSelect');
const scenarioDescription = document.getElementById('scenarioDescription');
const workerCountInput = document.getElementById('workerCount');
const transactionCountInput = document.getElementById('transactionCount');
const conflictProbabilityInput = document.getElementById('conflictProbability');
const maxRetriesInput = document.getElementById('maxRetries');

const runBtn = document.getElementById('runBtn');
const compareBtn = document.getElementById('compareBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const totalTransactionsEl = document.getElementById('totalTransactions');
const committedEl = document.getElementById('committed');
const conflictsEl = document.getElementById('conflicts');
const retriesEl = document.getElementById('retries');
const occTimeEl = document.getElementById('occTime');
const lockTimeEl = document.getElementById('lockTime');
const commitRateEl = document.getElementById('commitRate');
const throughputEl = document.getElementById('throughput');
const transactionLog = document.getElementById('transactionLog');

const canvas = document.getElementById('occCanvas');
const ctx = canvas.getContext('2d');

let workers = [];
let transactionHistory = [];
let sharedState = {};
let versionCounter = 0;
let occStartTime = 0;
let lockingTime = null;

const scenarios = {
    banking: {
        name: 'Banking Transactions',
        description: `Simulate concurrent bank account transfers.
Multiple workers try to transfer money between accounts.
Conflicts occur when accessing the same account.`,
        initialState: { accounts: [1000, 1000, 1000, 1000, 1000] }
    },
    inventory: {
        name: 'Inventory Management',
        description: `Manage product inventory with concurrent updates.
Workers reserve, update, and release stock quantities.
Conflicts on same product updates.`,
        initialState: { products: [100, 100, 100, 100, 100] }
    },
    document: {
        name: 'Document Editing',
        description: `Collaborative document editing simulation.
Multiple users edit different sections concurrently.
Conflicts when editing the same section.`,
        initialState: { sections: ['', '', '', '', ''] }
    },
    counter: {
        name: 'Shared Counter',
        description: `Classic concurrent counter increment problem.
All workers increment the same counter.
High conflict rate demonstrates OCC behavior.`,
        initialState: { counter: 0 }
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
}

function initializeSharedState(scenario) {
    sharedState = JSON.parse(JSON.stringify(scenarios[scenario].initialState));
    versionCounter = 0;
    transactionHistory = [];
}

function runOCC() {
    const workerCount = parseInt(workerCountInput.value);
    const transactionCount = parseInt(transactionCountInput.value);
    const conflictProbability = parseInt(conflictProbabilityInput.value);
    const maxRetries = parseInt(maxRetriesInput.value);
    const scenario = scenarioSelect.value;

    terminateAllWorkers();
    initializeSharedState(scenario);

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting OCC workers...';

    occStartTime = performance.now();

    let completedWorkers = 0;
    let totalTransactions = 0;
    let totalCommitted = 0;
    let totalConflicts = 0;
    let totalRetries = 0;

    const workerResults = [];

    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker('worker.js');
        workers.push(worker);

        worker.onmessage = (e) => {
            const data = e.data;

            if (data.type === 'validate') {
                // Validation request from worker
                const validation = validateTransaction(data.transaction);
                worker.postMessage({
                    type: 'validation_result',
                    transactionId: data.transaction.id,
                    valid: validation.valid,
                    newVersion: validation.newVersion,
                    reason: validation.reason
                });

                if (validation.valid) {
                    applyTransaction(data.transaction);
                }

                // Log transaction
                transactionHistory.push({
                    ...data.transaction,
                    status: validation.valid ? 'committed' : 'conflict',
                    reason: validation.reason
                });

                updateVisualization();

            } else if (data.type === 'progress') {
                updateProgress(data, workerCount);

            } else if (data.type === 'complete') {
                completedWorkers++;
                workerResults.push(data.stats);

                totalTransactions += data.stats.transactions;
                totalCommitted += data.stats.committed;
                totalConflicts += data.stats.conflicts;
                totalRetries += data.stats.retries;

                if (completedWorkers === workerCount) {
                    showResults(totalTransactions, totalCommitted, totalConflicts, totalRetries);
                }
            }
        };

        worker.postMessage({
            type: 'start',
            workerId: i,
            scenario,
            transactionCount,
            conflictProbability,
            maxRetries,
            initialState: sharedState,
            initialVersion: versionCounter
        });
    }

    drawVisualization();
}

function validateTransaction(transaction) {
    // Check if read set is still valid (versions haven't changed)
    const readSetValid = transaction.readSet.every(item => {
        return item.version === versionCounter;
    });

    if (!readSetValid) {
        return {
            valid: false,
            reason: 'Read set outdated',
            newVersion: versionCounter
        };
    }

    // Check for write-write conflicts with committed transactions
    const hasWriteConflict = transactionHistory.some(tx => {
        if (tx.status !== 'committed') return false;
        if (tx.commitTime < transaction.startTime) return false;

        return tx.writeSet.some(w1 =>
            transaction.writeSet.some(w2 => w1.key === w2.key)
        );
    });

    if (hasWriteConflict) {
        return {
            valid: false,
            reason: 'Write-write conflict',
            newVersion: versionCounter
        };
    }

    // Validation passed
    return {
        valid: true,
        newVersion: ++versionCounter
    };
}

function applyTransaction(transaction) {
    transaction.writeSet.forEach(write => {
        const keys = write.key.split('.');
        let target = sharedState;
        for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = write.value;
    });
}

function updateProgress(data, workerCount) {
    const avgProgress = data.progress;
    progressBar.style.width = avgProgress + '%';
    progressText.textContent = `Worker ${data.workerId}: ${data.committed} committed, ${data.conflicts} conflicts`;
}

function runLocking() {
    const workerCount = parseInt(workerCountInput.value);
    const transactionCount = parseInt(transactionCountInput.value);
    const scenario = scenarioSelect.value;

    progressContainer.classList.remove('hidden');
    progressText.textContent = 'Running with pessimistic locking for comparison...';

    const worker = new Worker('worker.js');
    const lockStart = performance.now();

    worker.onmessage = (e) => {
        if (e.data.type === 'locking_complete') {
            lockingTime = performance.now() - lockStart;
            lockTimeEl.textContent = lockingTime.toFixed(2) + ' ms';
            worker.terminate();
            progressContainer.classList.add('hidden');
        }
    };

    worker.postMessage({
        type: 'locking_mode',
        scenario,
        transactionCount: transactionCount * workerCount,
        initialState: scenarios[scenario].initialState
    });
}

function showResults(total, committed, conflicts, retries) {
    const occTime = performance.now() - occStartTime;

    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    totalTransactionsEl.textContent = total;
    committedEl.textContent = committed;
    conflictsEl.textContent = conflicts;
    retriesEl.textContent = retries;

    occTimeEl.textContent = occTime.toFixed(2) + ' ms';

    const commitRate = (committed / total * 100).toFixed(1);
    commitRateEl.textContent = commitRate + '%';

    const throughput = (committed / (occTime / 1000)).toFixed(1);
    throughputEl.textContent = throughput + ' tx/s';

    if (lockingTime) {
        lockTimeEl.textContent = lockingTime.toFixed(2) + ' ms';
    }

    renderTransactionLog();
    drawVisualization();
}

function renderTransactionLog() {
    const recentTx = transactionHistory.slice(-30);

    let html = '<table><tr><th>TX ID</th><th>Worker</th><th>Type</th><th>Status</th><th>Retries</th></tr>';

    recentTx.forEach(tx => {
        const statusClass = tx.status === 'committed' ? 'tx-committed' :
                           tx.status === 'conflict' ? 'tx-conflict' : 'tx-retry';

        html += `<tr>
            <td>${tx.id}</td>
            <td>W${tx.workerId}</td>
            <td>${tx.operation || '-'}</td>
            <td class="${statusClass}">${tx.status}</td>
            <td>${tx.retryCount || 0}</td>
        </tr>`;
    });

    html += '</table>';
    transactionLog.innerHTML = html;
}

function drawVisualization() {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Transaction Timeline', w / 2, 25);

    if (transactionHistory.length === 0) {
        ctx.fillStyle = '#555';
        ctx.font = '14px sans-serif';
        ctx.fillText('Click "Run OCC Simulation" to start', w / 2, h / 2);
        return;
    }

    const workerCount = parseInt(workerCountInput.value);
    const laneHeight = (h - padding * 2) / workerCount;

    // Draw worker lanes
    for (let i = 0; i < workerCount; i++) {
        const y = padding + i * laneHeight;

        // Lane label
        ctx.fillStyle = '#a78bfa';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`W${i}`, padding - 10, y + laneHeight / 2 + 4);

        // Lane background
        ctx.fillStyle = i % 2 === 0 ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.02)';
        ctx.fillRect(padding, y, w - padding * 2, laneHeight);

        // Lane border
        ctx.strokeStyle = 'rgba(139,92,246,0.2)';
        ctx.beginPath();
        ctx.moveTo(padding, y + laneHeight);
        ctx.lineTo(w - padding, y + laneHeight);
        ctx.stroke();
    }

    // Draw transactions
    const maxTx = 100;
    const displayTx = transactionHistory.slice(-maxTx);
    const txWidth = Math.max(4, (w - padding * 2) / displayTx.length - 2);

    displayTx.forEach((tx, index) => {
        const x = padding + index * (txWidth + 2);
        const y = padding + tx.workerId * laneHeight + 5;
        const height = laneHeight - 10;

        // Transaction color based on status
        let color;
        switch (tx.status) {
            case 'committed':
                color = '#34d399';
                break;
            case 'conflict':
                color = '#f87171';
                break;
            default:
                color = '#fbbf24';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y, txWidth, height);

        // Retry indicator
        if (tx.retryCount > 0) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(x + txWidth / 2, y + height + 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Legend
    const legendY = h - 20;
    const legendItems = [
        { color: '#34d399', label: 'Committed' },
        { color: '#f87171', label: 'Conflict' },
        { color: '#fbbf24', label: 'Retry' }
    ];

    let legendX = padding;
    ctx.font = '10px sans-serif';
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, legendY - 8, 12, 12);
        ctx.fillStyle = '#a78bfa';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legendX + 16, legendY + 2);
        legendX += 90;
    });

    // Stats summary
    const committed = transactionHistory.filter(t => t.status === 'committed').length;
    const conflicts = transactionHistory.filter(t => t.status === 'conflict').length;

    ctx.fillStyle = '#ddd6fe';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Committed: ${committed} | Conflicts: ${conflicts}`, w - padding, legendY + 2);
}

function updateVisualization() {
    requestAnimationFrame(drawVisualization);
}

function reset() {
    terminateAllWorkers();
    transactionHistory = [];
    sharedState = {};
    lockingTime = null;

    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');

    totalTransactionsEl.textContent = '-';
    committedEl.textContent = '-';
    conflictsEl.textContent = '-';
    retriesEl.textContent = '-';
    occTimeEl.textContent = '-';
    lockTimeEl.textContent = '-';
    commitRateEl.textContent = '-';
    throughputEl.textContent = '-';
    transactionLog.innerHTML = '';

    drawVisualization();
}

// Event Listeners
scenarioSelect.addEventListener('change', updateScenarioDisplay);
runBtn.addEventListener('click', runOCC);
compareBtn.addEventListener('click', runLocking);
resetBtn.addEventListener('click', reset);

// Initialize
updateScenarioDisplay();
drawVisualization();
