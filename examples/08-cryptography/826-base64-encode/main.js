let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('result').textContent = e.data.payload.encoded;
            document.getElementById('input-size').textContent = e.data.payload.inputSize + ' bytes';
            document.getElementById('output-size').textContent = e.data.payload.outputSize + ' chars';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('encode-btn').disabled = false;
    };
    document.getElementById('encode-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'ENCODE', payload: {
            text: document.getElementById('text-input').value,
            urlSafe: document.getElementById('urlsafe').checked
        }});
    };
});
