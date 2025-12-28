let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            const info = e.data.payload.info;
            document.getElementById('pem-info').innerHTML = Object.entries(info)
                .map(([k,v]) => `<div class="stat-item"><span class="stat-label">${k}:</span><span class="stat-value" style="word-break: break-all;">${v}</span></div>`).join('');
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('parse-btn').disabled = false;
    };
    document.getElementById('parse-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'PARSE', payload: { pem: document.getElementById('pem-input').value }});
    };
});
