/**
 * #516 Worker Benchmark - Tests worker creation and messaging overhead
 */
const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    ['param', 'run-btn', 'stop-btn', 'progress-bar', 'progress-text', 'result-section', 'result-stats', 'error-message'].forEach(id => {
        elements[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = document.getElementById(id);
    });

    elements.runBtn.onclick = async () => {
        const count = parseInt(elements.param.value);
        updateUI(true);
        elements.resultSection.classList.add('hidden');

        const results = {};

        // Worker creation benchmark
        updateProgress(10, 'Testing worker creation...');
        const createStart = performance.now();
        const workers = [];
        for (let i = 0; i < 10; i++) {
            workers.push(new Worker('worker.js'));
        }
        results['Creation (10 workers)'] = performance.now() - createStart;
        workers.forEach(w => w.terminate());

        // Message round-trip benchmark
        updateProgress(40, 'Testing message round-trip...');
        const worker = new Worker('worker.js');
        const msgStart = performance.now();
        let received = 0;

        await new Promise(resolve => {
            worker.onmessage = () => {
                received++;
                if (received >= count) {
                    results['Message Round-trip'] = performance.now() - msgStart;
                    resolve();
                }
            };
            for (let i = 0; i < count; i++) {
                worker.postMessage({ type: 'ECHO', data: i });
            }
        });

        // Large message benchmark
        updateProgress(70, 'Testing large message...');
        const largeData = new Array(10000).fill(0).map((_, i) => ({ id: i, value: Math.random() }));
        const largeStart = performance.now();
        await new Promise(resolve => {
            worker.onmessage = () => {
                results['Large Message (10K objects)'] = performance.now() - largeStart;
                resolve();
            };
            worker.postMessage({ type: 'ECHO', data: largeData });
        });

        worker.terminate();

        updateProgress(100, 'Complete');
        results['Messages/sec'] = Math.round(count / (results['Message Round-trip'] / 1000));

        elements.resultStats.innerHTML = Object.entries(results).map(([k, v]) =>
            `<div class="stat-item"><span class="stat-label">${k}:</span><span class="stat-value">${typeof v === 'number' && k.includes('sec') ? v.toLocaleString() : (v.toFixed(2) + ' ms')}</span></div>`
        ).join('');
        elements.resultSection.classList.remove('hidden');
        updateUI(false);
    };

    elements.stopBtn.onclick = () => updateUI(false);
    document.querySelectorAll('.preset-btn').forEach(b => b.onclick = () => elements.param.value = b.dataset.value);
});

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function updateUI(running) {
    elements.runBtn.disabled = running;
    elements.stopBtn.disabled = !running;
}
