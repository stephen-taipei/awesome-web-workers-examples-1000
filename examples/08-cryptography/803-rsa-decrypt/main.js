let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'RESULT') {
            document.getElementById('original-result').textContent = payload.original;
            document.getElementById('encrypted-result').textContent = payload.encrypted.substring(0, 50) + '...';
            document.getElementById('decrypted-result').textContent = payload.decrypted;
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        } else if (type === 'ERROR') {
            document.getElementById('error-message').textContent = payload.message;
            document.getElementById('error-message').classList.remove('hidden');
        }
        document.getElementById('test-btn').disabled = false;
    };
    document.getElementById('test-btn').onclick = function() {
        this.disabled = true;
        document.getElementById('error-message').classList.add('hidden');
        worker.postMessage({ type: 'TEST', payload: { message: document.getElementById('plaintext-input').value }});
    };
});
