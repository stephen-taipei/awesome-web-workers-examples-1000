let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'RESULT') {
            document.getElementById('signature-result').textContent = payload.signature;
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('sign-btn').disabled = false;
    };
    document.getElementById('sign-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'SIGN', payload: { message: document.getElementById('message-input').value }});
    };
});
