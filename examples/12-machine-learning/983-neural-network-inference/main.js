const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const layerConfigInput = document.getElementById('layerConfig');
const batchSizeSelect = document.getElementById('batchSize');
const throughputEl = document.getElementById('throughput');
const latencyEl = document.getElementById('latency');
const totalSamplesEl = document.getElementById('totalSamples');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('perfCanvas');
const ctx = canvas.getContext('2d');

let worker;
let latencyHistory = [];
const maxHistory = 50;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            throughputEl.textContent = Math.round(data.ips).toLocaleString();
            latencyEl.textContent = data.avgLatency.toFixed(2);
            totalSamplesEl.textContent = data.totalSamples.toLocaleString();
            
            updateGraph(data.avgLatency);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const layersStr = layerConfigInput.value;
    const layers = layersStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const batchSize = parseInt(batchSizeSelect.value);

    if (layers.length === 0) {
        alert('Invalid layer configuration');
        return;
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Initializing Network...';
    
    latencyHistory = []; // Reset graph
    throughputEl.textContent = '-';
    latencyEl.textContent = '-';
    totalSamplesEl.textContent = '0';

    worker.postMessage({
        command: 'start',
        hiddenLayers: layers,
        batchSize
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        statusText.textContent = 'Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        worker = null;
    }
});

function updateGraph(latency) {
    latencyHistory.push(latency);
    if (latencyHistory.length > maxHistory) {
        latencyHistory.shift();
    }
    drawGraph();
}

function drawGraph() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (latencyHistory.length < 2) return;

    // Find range
    const maxLat = Math.max(...latencyHistory) * 1.2; // 20% padding
    const minLat = 0;

    const stepX = w / (maxHistory - 1);
    
    ctx.beginPath();
    ctx.strokeStyle = '#303f9f';
    ctx.lineWidth = 2;

    for (let i = 0; i < latencyHistory.length; i++) {
        const x = i * stepX;
        const y = h - (latencyHistory[i] / maxLat) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Text
    ctx.fillStyle = '#1a237e';
    ctx.font = '12px Arial';
    ctx.fillText(`${maxLat.toFixed(1)} ms`, 5, 15);
    ctx.fillText('0 ms', 5, h - 5);
}

initWorker();
