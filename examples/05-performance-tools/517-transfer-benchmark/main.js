/**
 * #517 Transfer Benchmark - Compares transferable vs structured clone
 */
const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    ['param', 'run-btn', 'stop-btn', 'progress-bar', 'progress-text', 'result-section', 'result-stats', 'error-message'].forEach(id => {
        elements[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = document.getElementById(id);
    });

    elements.runBtn.onclick = async () => {
        const sizeMB = parseInt(elements.param.value);
        const size = sizeMB * 1024 * 1024;
        updateUI(true);
        elements.resultSection.classList.add('hidden');

        const results = {};
        const worker = new Worker('worker.js');

        // Clone benchmark
        updateProgress(20, 'Testing structured clone...');
        let buffer = new ArrayBuffer(size);
        new Uint8Array(buffer).fill(42);

        const cloneStart = performance.now();
        await new Promise(resolve => {
            worker.onmessage = () => resolve();
            worker.postMessage({ type: 'CLONE', buffer });
        });
        results['Structured Clone'] = performance.now() - cloneStart;

        // Transfer benchmark
        updateProgress(60, 'Testing transferable...');
        buffer = new ArrayBuffer(size);
        new Uint8Array(buffer).fill(42);

        const transferStart = performance.now();
        await new Promise(resolve => {
            worker.onmessage = () => resolve();
            worker.postMessage({ type: 'TRANSFER', buffer }, [buffer]);
        });
        results['Transferable'] = performance.now() - transferStart;

        worker.terminate();

        updateProgress(100, 'Complete');
        results['Buffer Size'] = `${sizeMB} MB`;
        results['Speedup'] = `${(results['Structured Clone'] / results['Transferable']).toFixed(1)}x`;

        elements.resultStats.innerHTML = Object.entries(results).map(([k, v]) =>
            `<div class="stat-item"><span class="stat-label">${k}:</span><span class="stat-value">${typeof v === 'number' ? v.toFixed(2) + ' ms' : v}</span></div>`
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
