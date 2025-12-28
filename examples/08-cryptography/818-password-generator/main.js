let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('password-result').textContent = e.data.payload.password;
            document.getElementById('entropy-result').textContent = e.data.payload.entropy.toFixed(1) + ' bits';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('generate-btn').disabled = false;
    };
    document.getElementById('generate-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'GENERATE', payload: {
            length: parseInt(document.getElementById('length-input').value),
            uppercase: document.getElementById('uppercase').checked,
            lowercase: document.getElementById('lowercase').checked,
            numbers: document.getElementById('numbers').checked,
            symbols: document.getElementById('symbols').checked
        }});
    };
});
