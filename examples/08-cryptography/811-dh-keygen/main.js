let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
            document.getElementById('progress-bar').style.width = payload.percent + '%';
            document.getElementById('progress-text').textContent = payload.message;
        } else if (type === 'RESULT') {
            document.getElementById('public-value').textContent = payload.publicValue;
            document.getElementById('time-result').textContent = payload.duration.toFixed(2) + ' ms';
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('generate-btn').disabled = false;
    };
    document.getElementById('generate-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'GENERATE', payload: { bits: parseInt(document.getElementById('bits-select').value) }});
    };
});
