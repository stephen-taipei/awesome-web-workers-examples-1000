let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'RESULT') {
            document.getElementById('verify-result').textContent = payload.valid ? 'VALID - Signature verified!' : 'INVALID - Signature failed!';
            document.getElementById('verify-result').style.color = payload.valid ? '#28a745' : '#dc3545';
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        } else if (type === 'ERROR') {
            document.getElementById('error-message').textContent = payload.message;
            document.getElementById('error-message').classList.remove('hidden');
        }
        document.getElementById('test-btn').disabled = false;
        document.getElementById('tamper-btn').disabled = false;
    };
    document.getElementById('test-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'TEST', payload: { message: document.getElementById('message-input').value, tamper: false }});
    };
    document.getElementById('tamper-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'TEST', payload: { message: document.getElementById('message-input').value, tamper: true }});
    };
});
