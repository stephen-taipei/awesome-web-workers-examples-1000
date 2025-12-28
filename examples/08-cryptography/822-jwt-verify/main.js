let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('valid-result').textContent = e.data.payload.valid ? 'YES' : 'NO';
            document.getElementById('valid-result').style.color = e.data.payload.valid ? '#28a745' : '#dc3545';
            document.getElementById('payload-result').textContent = JSON.stringify(e.data.payload.decoded, null, 2);
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('verify-btn').disabled = false;
    };
    document.getElementById('verify-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'VERIFY', payload: {
            jwt: document.getElementById('jwt-input').value,
            secret: document.getElementById('secret-input').value
        }});
    };
});
