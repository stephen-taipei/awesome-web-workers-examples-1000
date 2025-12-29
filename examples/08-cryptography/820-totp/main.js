let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('totp-result').textContent = e.data.payload.totp;
            document.getElementById('time-remaining').textContent = `Valid for ${e.data.payload.remaining} seconds`;
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('generate-btn').disabled = false;
    };
    document.getElementById('generate-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'GENERATE', payload: { secret: document.getElementById('secret-input').value }});
    };
});
