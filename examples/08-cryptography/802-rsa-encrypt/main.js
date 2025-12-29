let worker = null, keys = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'KEYS_GENERATED') {
            keys = payload;
            document.getElementById('encrypt-btn').disabled = false;
            document.getElementById('progress-text').textContent = 'Keys ready - Click Encrypt';
        } else if (type === 'ENCRYPT_RESULT') {
            document.getElementById('ciphertext-result').textContent = payload.ciphertext;
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        } else if (type === 'ERROR') {
            document.getElementById('error-message').textContent = payload.message;
            document.getElementById('error-message').classList.remove('hidden');
        }
        document.getElementById('generate-btn').disabled = false;
        document.getElementById('encrypt-btn').disabled = !keys;
    };
    document.getElementById('generate-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'GENERATE_KEYS' });
    };
    document.getElementById('encrypt-btn').onclick = function() {
        if (!keys) return;
        this.disabled = true;
        worker.postMessage({ type: 'ENCRYPT', payload: {
            plaintext: document.getElementById('plaintext-input').value,
            publicKey: keys.publicKey
        }});
    };
});
