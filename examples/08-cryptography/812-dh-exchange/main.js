let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'RESULT') {
            document.getElementById('shared-secret').textContent = payload.sharedSecret;
            document.getElementById('agreement-result').textContent = 'Keys derived successfully';
            document.getElementById('agreement-result').style.color = '#28a745';
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('exchange-btn').disabled = false;
    };
    document.getElementById('exchange-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'EXCHANGE' });
    };
});
