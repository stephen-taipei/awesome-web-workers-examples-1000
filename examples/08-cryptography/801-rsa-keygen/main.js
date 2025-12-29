let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'RESULT') {
            document.getElementById('public-key').textContent = JSON.stringify(payload.publicKey);
            document.getElementById('private-key').textContent = JSON.stringify(payload.privateKey).substring(0, 200) + '...';
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        } else if (type === 'ERROR') {
            document.getElementById('error-message').textContent = payload.message;
            document.getElementById('error-message').classList.remove('hidden');
        }
        document.getElementById('generate-btn').disabled = false;
    };
    document.getElementById('generate-btn').onclick = function() {
        this.disabled = true;
        document.getElementById('error-message').classList.add('hidden');
        worker.postMessage({ type: 'GENERATE', payload: { keySize: parseInt(document.getElementById('keysize-select').value) }});
    };
});
