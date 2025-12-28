let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('result').textContent = e.data.payload.decoded;
            document.getElementById('size').textContent = e.data.payload.size + ' bytes';
            document.getElementById('result-section').classList.remove('hidden');
        } else if (e.data.type === 'ERROR') {
            alert('Error: ' + e.data.payload.message);
        }
        document.getElementById('decode-btn').disabled = false;
    };
    document.getElementById('decode-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'DECODE', payload: { hex: document.getElementById('hex-input').value }});
    };
});
