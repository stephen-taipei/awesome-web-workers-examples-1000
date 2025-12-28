let worker = null;
document.addEventListener('DOMContentLoaded', function() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'RESULT') {
            document.getElementById('asn1-tree').textContent = e.data.payload.tree;
            document.getElementById('result-section').classList.remove('hidden');
        }
        document.getElementById('parse-btn').disabled = false;
    };
    document.getElementById('parse-btn').onclick = function() {
        this.disabled = true;
        worker.postMessage({ type: 'PARSE', payload: { hex: document.getElementById('asn1-input').value }});
    };
});
