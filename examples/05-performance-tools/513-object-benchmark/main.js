/**
 * #513 Object Benchmark - Main Thread
 */
let worker = null;
let isRunning = false;
const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    ['iterations', 'run-btn', 'stop-btn', 'progress-bar', 'progress-text', 'result-section', 'result-stats', 'error-message'].forEach(id => {
        elements[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = document.getElementById(id);
    });
    worker = new Worker('worker.js');
    worker.onmessage = e => {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            elements.progressBar.style.width = `${payload.percent}%`;
            elements.progressBar.textContent = `${payload.percent}%`;
            elements.progressText.textContent = payload.message;
        } else if (type === 'RESULT') {
            elements.resultStats.innerHTML = Object.entries(payload).map(([k, v]) =>
                `<div class="stat-item"><span class="stat-label">${k}:</span><span class="stat-value">${typeof v === 'number' ? v.toFixed(2) + ' ms' : v}</span></div>`
            ).join('');
            elements.resultSection.classList.remove('hidden');
            isRunning = false;
            updateUI(false);
        }
    };
    elements.runBtn.onclick = () => {
        const iterations = parseInt(elements.iterations.value);
        if (iterations < 1000) return;
        isRunning = true;
        updateUI(true);
        elements.resultSection.classList.add('hidden');
        worker.postMessage({ type: 'START', payload: { iterations } });
    };
    elements.stopBtn.onclick = () => { worker.terminate(); worker = new Worker('worker.js'); isRunning = false; updateUI(false); };
    document.querySelectorAll('.preset-btn').forEach(b => b.onclick = () => elements.iterations.value = b.dataset.value);
});

function updateUI(running) {
    elements.runBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    elements.iterations.disabled = running;
}
