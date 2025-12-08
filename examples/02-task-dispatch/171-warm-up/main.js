const coldStartBtn = document.getElementById('coldStartBtn');
const coldResult = document.getElementById('coldResult');

const warmUpBtn = document.getElementById('warmUpBtn');
const warmStartBtn = document.getElementById('warmStartBtn');
const warmStatus = document.getElementById('warmStatus');
const warmResult = document.getElementById('warmResult');

let warmWorker = null;

// Scenario 1: Cold Start
coldStartBtn.addEventListener('click', () => {
    coldResult.textContent = 'Running...';
    coldStartBtn.disabled = true;

    const start = performance.now();
    const worker = new Worker('worker.js');

    // Send task immediately, but worker has to initialize first
    worker.postMessage({ type: 'task' });

    worker.onmessage = function(e) {
        if (e.data.type === 'result') {
            const end = performance.now();
            const latency = (end - start).toFixed(2);
            coldResult.textContent = `Latency: ${latency} ms`;
            worker.terminate();
            coldStartBtn.disabled = false;
        }
    };
});

// Scenario 2: Warm Up
warmUpBtn.addEventListener('click', () => {
    warmStatus.textContent = 'Warming up...';
    warmUpBtn.disabled = true;

    warmWorker = new Worker('worker.js');

    // Send initialization signal
    warmWorker.postMessage({ type: 'init' });

    warmWorker.onmessage = function(e) {
        if (e.data.type === 'ready') {
            warmStatus.textContent = 'Ready';
            warmStatus.style.color = 'green';
            warmStartBtn.disabled = false;
        } else if (e.data.type === 'result') {
            // Handle result from warm start test
            const end = performance.now();
            const latency = (end - window.warmStartTime).toFixed(2);
            warmResult.textContent = `Latency: ${latency} ms`;
            warmStartBtn.disabled = false;
        }
    };
});

warmStartBtn.addEventListener('click', () => {
    if (!warmWorker) return;

    warmResult.textContent = 'Running...';
    warmStartBtn.disabled = true;

    window.warmStartTime = performance.now();
    warmWorker.postMessage({ type: 'task' });
});
