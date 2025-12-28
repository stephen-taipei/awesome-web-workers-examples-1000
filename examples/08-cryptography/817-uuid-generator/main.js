let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            const list = document.getElementById('uuid-list');
            list.innerHTML = e.data.payload.uuids.map(u => `<div class="stat-item"><code style="color: var(--primary-color);">${u}</code></div>`).join('');
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('generate-btn').disabled = false;
    };
    document.getElementById('generate-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'GENERATE', payload: { count: parseInt(document.getElementById('count-input').value) }});
    };
});
