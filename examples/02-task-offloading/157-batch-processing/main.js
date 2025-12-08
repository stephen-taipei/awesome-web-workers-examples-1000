const itemCount = 1000;
const items = Array.from({ length: itemCount }, (_, i) => ({ id: i, data: Math.random() * 1000 }));

const runIndividualBtn = document.getElementById('runIndividualBtn');
const runBatchBtn = document.getElementById('runBatchBtn');
const clearBtn = document.getElementById('clearBtn');
const individualTimeSpan = document.getElementById('individualTime');
const batchTimeSpan = document.getElementById('batchTime');
const logDiv = document.getElementById('log');

let worker;

function createWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
}

function log(message) {
    const entry = document.createElement('div');
    entry.textContent = `> ${message}`;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

runIndividualBtn.addEventListener('click', () => {
    runIndividualBtn.disabled = true;
    runBatchBtn.disabled = true;
    createWorker();

    log(`Starting individual processing of ${itemCount} items...`);
    const startTime = performance.now();
    let completed = 0;

    worker.onmessage = function(e) {
        completed++;
        if (completed === itemCount) {
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            individualTimeSpan.textContent = duration;
            log(`Individual processing finished in ${duration} ms`);
            runIndividualBtn.disabled = false;
            runBatchBtn.disabled = false;
        }
    };

    items.forEach(item => {
        worker.postMessage({ type: 'individual', id: item.id, data: item.data });
    });
});

runBatchBtn.addEventListener('click', () => {
    runIndividualBtn.disabled = true;
    runBatchBtn.disabled = true;
    createWorker();

    log(`Starting batch processing of ${itemCount} items...`);
    const startTime = performance.now();

    // Split into batches of 100
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }

    let completedBatches = 0;

    worker.onmessage = function(e) {
        completedBatches++;
        if (completedBatches === batches.length) {
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            batchTimeSpan.textContent = duration;
            log(`Batch processing finished in ${duration} ms`);
            runIndividualBtn.disabled = false;
            runBatchBtn.disabled = false;
        }
    };

    batches.forEach(batch => {
        worker.postMessage({ type: 'batch', data: batch });
    });
});

clearBtn.addEventListener('click', () => {
    logDiv.innerHTML = '';
    individualTimeSpan.textContent = '-';
    batchTimeSpan.textContent = '-';
});
