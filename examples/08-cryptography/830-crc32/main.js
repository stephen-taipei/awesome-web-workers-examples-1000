let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('hex-result').textContent = e.data.payload.hex;
            document.getElementById('dec-result').textContent = e.data.payload.decimal;
            document.getElementById('size-result').textContent = e.data.payload.size + ' bytes';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('calc-btn').disabled = false;
    };
    document.getElementById('calc-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'CALCULATE', payload: { text: document.getElementById('text-input').value }});
    };
});
