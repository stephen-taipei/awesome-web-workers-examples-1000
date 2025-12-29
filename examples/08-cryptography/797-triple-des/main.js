/**
 * Triple DES - Main Thread
 */
let worker = null;
let lastEncrypted = null;

document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-bar').textContent = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'ENCRYPT_RESULT') {
            lastEncrypted = payload.ciphertext;
            showResult(payload.ciphertext, payload.duration);
        } else if (type === 'DECRYPT_RESULT') {
            showResult(payload.plaintext, payload.duration);
        } else if (type === 'ERROR') {
            document.getElementById('error-message').textContent = payload.message;
            document.getElementById('error-message').classList.remove('hidden');
        }
        document.getElementById('encrypt-btn').disabled = false;
        document.getElementById('decrypt-btn').disabled = false;
    };

    document.getElementById('encrypt-btn').onclick = function() {
        const plaintext = document.getElementById('plaintext-input').value;
        const key = document.getElementById('key-input').value;
        if (key.length !== 24) {
            document.getElementById('error-message').textContent = 'Key must be 24 characters';
            document.getElementById('error-message').classList.remove('hidden');
            return;
        }
        document.getElementById('error-message').classList.add('hidden');
        this.disabled = true;
        worker.postMessage({ type: 'ENCRYPT', payload: { plaintext, key } });
    };

    document.getElementById('decrypt-btn').onclick = function() {
        if (!lastEncrypted) return;
        const key = document.getElementById('key-input').value;
        this.disabled = true;
        worker.postMessage({ type: 'DECRYPT', payload: { ciphertext: lastEncrypted, key } });
    };
});

function showResult(output, duration) {
    document.getElementById('output-result').textContent = output;
    document.getElementById('time-result').textContent = duration.toFixed(2) + ' ms';
    document.getElementById('result-section').classList.remove('hidden');
    document.getElementById('progress-bar').style.width = '100%';
    document.getElementById('progress-text').textContent = 'Complete';
}
