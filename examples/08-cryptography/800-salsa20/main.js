let worker = null, lastData = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'ENCRYPT_RESULT') {
            lastData = payload;
            document.getElementById('output-result').textContent = payload.ciphertext;
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        } else if (type === 'DECRYPT_RESULT') {
            document.getElementById('output-result').textContent = payload.plaintext;
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('encrypt-btn').disabled = false;
        document.getElementById('decrypt-btn').disabled = false;
    };
    document.getElementById('encrypt-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'ENCRYPT', payload: {
            plaintext: document.getElementById('plaintext-input').value,
            key: document.getElementById('key-input').value
        }});
    };
    document.getElementById('decrypt-btn').onclick = function() {
        if (!lastData) return;
        this.disabled = true;
        worker.postMessage({ type: 'DECRYPT', payload: { ...lastData, key: document.getElementById('key-input').value }});
    };
});
