const runBtn = document.getElementById('runBtn');
const sampleSizeSelect = document.getElementById('sampleSize');
const dimensionsInput = document.getElementById('dimensions');
const statusText = document.getElementById('statusText');
const timeVal = document.getElementById('timeVal');
const varExplained = document.getElementById('varExplained');
const canvas = document.getElementById('pcaCanvas');
const ctx = canvas.getContext('2d');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeVal.textContent = `${data.duration}ms`;
            varExplained.textContent = `${(data.totalVariance * 100).toFixed(2)}%`;
            
            drawProjection(data.projectedData, data.labels);
            runBtn.disabled = false;
        }
    };
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const samples = parseInt(sampleSizeSelect.value);
    const dimensions = parseInt(dimensionsInput.value);

    runBtn.disabled = true;
    statusText.textContent = 'Generating Data...';
    timeVal.textContent = '-';
    varExplained.textContent = '-';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    worker.postMessage({
        command: 'run',
        samples,
        dimensions
    });
});

function drawProjection(data, labels) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Find bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < data.length; i += 2) {
        if (data[i] < minX) minX = data[i];
        if (data[i] > maxX) maxX = data[i];
        if (data[i+1] < minY) minY = data[i+1];
        if (data[i+1] > maxY) maxY = data[i+1];
    }

    // Center and Scale
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(w / rangeX, h / rangeY) * 0.9; // 90% fit
    const offsetX = w / 2 - (minX + rangeX / 2) * scale;
    const offsetY = h / 2 - (minY + rangeY / 2) * scale;

    const colors = ['#e74c3c', '#2ecc71', '#3498db']; // For 3 clusters

    for (let i = 0; i < data.length; i += 2) {
        const x = data[i] * scale + offsetX;
        const y = data[i+1] * scale + offsetY;
        const label = labels[i/2];

        ctx.fillStyle = colors[label % colors.length];
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

initWorker();
