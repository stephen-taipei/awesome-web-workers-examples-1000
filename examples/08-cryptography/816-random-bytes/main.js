let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'RESULT') {
            document.getElementById('output-result').textContent = payload.output;
            document.getElementById('size-result').textContent = payload.size + ' bytes';
            document.getElementById('result-section').classList.remove('hidden');
            document.getElementById('progress-bar').style.width = '100%';
        }
        document.getElementById('generate-btn').disabled = false;
    };
    document.getElementById('generate-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'GENERATE', payload: {
            size: parseInt(document.getElementById('size-input').value),
            format: document.getElementById('format-select').value
        }});
    };
});
