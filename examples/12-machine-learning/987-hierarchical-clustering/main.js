const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pointCountSelect = document.getElementById('pointCount');
const linkageSelect = document.getElementById('linkage');
const targetClustersInput = document.getElementById('targetClusters');
const kDisplay = document.getElementById('kDisplay');
const clusterCountDisplay = document.getElementById('clusterCountDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('hcCanvas');
const ctx = canvas.getContext('2d');

let worker;
// Define color palette for clusters
const clusterColors = [
    '#d32f2f', '#c2185b', '#7b1fa2', '#512da8', '#303f9f',
    '#1976d2', '#0288d1', '#0097a7', '#00796b', '#388e3c',
    '#689f38', '#afb42b', '#fbc02d', '#ffa000', '#f57c00',
    '#e64a19', '#5d4037', '#616161', '#455a64'
];

targetClustersInput.addEventListener('input', () => kDisplay.textContent = targetClustersInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'step') {
            clusterCountDisplay.textContent = data.currentClusters;
            drawState(data.points, data.merges, data.clusters);
        } else if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'done') {
            statusText.textContent = 'Finished';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const points = parseInt(pointCountSelect.value);
    const linkage = linkageSelect.value;
    const targetK = parseInt(targetClustersInput.value);
    const speed = parseInt(document.querySelector('input[name="speed"]:checked').value);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Generating Data...';
    clusterCountDisplay.textContent = points;

    worker.postMessage({
        command: 'start',
        points,
        linkage,
        targetK,
        delay: speed,
        width: canvas.width,
        height: canvas.height
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

function drawState(points, merges, clusters) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw connections (Dendrogram projected on 2D)
    // We draw lines between merged centroids or points?
    // Drawing lines connecting all points in a cluster is messy.
    // A better way: Draw the history of merges.
    // `merges` contains { a: idx, b: idx, newPos: [x,y] } ??
    // Worker sends full clusters assignment.
    
    // Simple Visualization:
    // Draw points colored by their current cluster ID.
    // Optionally draw lines connecting points in the same cluster (MST style) or just the bounding box.
    // Let's just draw points colored by cluster.
    
    // Draw points
    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i+1];
        const pointIdx = i/2;
        
        // Find which cluster this point belongs to
        // clusters is an array of arrays: [[pt1, pt2], [pt3]]
        let clusterId = -1;
        for (let c = 0; c < clusters.length; c++) {
            if (clusters[c].includes(pointIdx)) {
                clusterId = c;
                break;
            }
        }

        const color = clusterId >= 0 ? clusterColors[clusterId % clusterColors.length] : '#999';
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border for selected/active
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // Draw recent merges lines?
    // The worker logic should ideally send the specific merge that just happened to draw a line.
    // But complete redraw is easier.
    // Let's visually connect centroids of the clusters being merged?
    // We'll rely on color for grouping in this 2D view.
}

initWorker();
