let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('jwt-result').textContent = e.data.payload.jwt;
            document.getElementById('result-section').classList.remove('hidden');
        } else if (e.data.type === 'ERROR') {
            alert('Error: ' + e.data.payload.message);
        }
        document.getElementById('create-btn').disabled = false;
    };
    document.getElementById('create-btn').onclick = function() {
        this.disabled = true;
        try {
            const payload = JSON.parse(document.getElementById('payload-input').value);
            worker.postMessage({ type: 'CREATE', payload: { data: payload, secret: document.getElementById('secret-input').value }});
        } catch(e) {
            alert('Invalid JSON payload');
            this.disabled = false;
        }
    };
});
