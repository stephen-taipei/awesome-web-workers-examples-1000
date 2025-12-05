const runBtn = document.getElementById('runBtn');
const pointCountSelect = document.getElementById('pointCount');
const epsilonInput = document.getElementById('epsilon');
const minPtsInput = document.getElementById('minPts');
const datasetTypeSelect = document.getElementById('datasetType');
const epsDisplay = document.getElementById('epsDisplay');
const minPtsDisplay = document.getElementById('minPtsDisplay');
const statusText = document.getElementById('statusText');
const clustersCount = document.getElementById('clustersCount');
const noiseCount = document.getElementById('noiseCount');
const timeVal = document.getElementById('timeVal');
const canvas = document.getElementById('dbscanCanvas');
const ctx = canvas.getContext('2d');

let worker;
// Distinct colors for clusters
const colors = [
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab',
    '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047',
    '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00',
    '#f4511e', '#6d4c41', '#757575', '#546e7a'
];

epsilonInput.addEventListener('input', () => epsDisplay.textContent = epsilonInput.value);
minPtsInput.addEventListener('input', () => minPtsDisplay.textContent = minPtsInput.value);

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
            clustersCount.textContent = data.numClusters;
            noiseCount.textContent = data.numNoise;
            
            drawClusters(data.points, data.labels);
            runBtn.disabled = false;
        }
    };
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const points = parseInt(pointCountSelect.value);
    const epsilon = parseInt(epsilonInput.value);
    const minPts = parseInt(minPtsInput.value);
    const datasetType = datasetTypeSelect.value;

    runBtn.disabled = true;
    statusText.textContent = 'Generating Data...';
    clustersCount.textContent = '-';
    noiseCount.textContent = '-';
    timeVal.textContent = '-';

    worker.postMessage({
        command: 'run',
        points,
        epsilon,
        minPts,
        datasetType,
        width: canvas.width,
        height: canvas.height
    });
});

function drawClusters(points, labels) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i+1];
        const label = labels[i/2];

        if (label === -1) {
            // Noise
            ctx.fillStyle = '#424242';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Cluster
            ctx.fillStyle = colors[label % colors.length];
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

initWorker();
