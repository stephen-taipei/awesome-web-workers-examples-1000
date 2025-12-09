const serializeBtn = document.getElementById('serializeBtn');
const statusDiv = document.getElementById('status');
const outputInfo = document.getElementById('outputInfo');
const resultOutput = document.getElementById('resultOutput');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { type, data, duration, size } = e.data;

    if (type === 'success') {
        statusDiv.textContent = `Completed in ${duration}ms`;
        outputInfo.textContent = `Serialized Size: ${(size / 1024 / 1024).toFixed(2)} MB`;
        
        // Truncate for display if too large
        const displayLimit = 10000;
        if (data.length > displayLimit) {
            resultOutput.value = data.substring(0, displayLimit) + `\n... (truncated, total length: ${data.length})`;
        } else {
            resultOutput.value = data;
        }
        serializeBtn.disabled = false;
    } else if (type === 'progress') {
        statusDiv.textContent = data;
    } else if (type === 'error') {
        statusDiv.textContent = `Error: ${data}`;
        statusDiv.style.color = 'red';
        serializeBtn.disabled = false;
    }
};

worker.onerror = function(error) {
    statusDiv.textContent = `Worker Error: ${error.message}`;
    statusDiv.style.color = 'red';
    serializeBtn.disabled = false;
};

serializeBtn.addEventListener('click', () => {
    const modelSize = parseInt(document.getElementById('modelSize').value);
    const weightsPerLayer = parseInt(document.getElementById('weightsPerLayer').value);
    const prettyPrint = document.getElementById('prettyPrint').checked;

    serializeBtn.disabled = true;
    statusDiv.style.color = 'black';
    statusDiv.textContent = 'Generating and serializing model...';
    resultOutput.value = '';
    outputInfo.textContent = '';

    worker.postMessage({
        command: 'serialize',
        modelSize,
        weightsPerLayer,
        prettyPrint
    });
});
