let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'RESULT') {
            document.getElementById('alice-secret').textContent = payload.aliceSecret;
            document.getElementById('bob-secret').textContent = payload.bobSecret;
            document.getElementById('match-result').textContent = payload.match ? 'YES - Secrets match!' : 'NO';
            document.getElementById('match-result').style.color = payload.match ? '#28a745' : '#dc3545';
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('derive-btn').disabled = false;
    };
    document.getElementById('derive-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'DERIVE' });
    };
});
