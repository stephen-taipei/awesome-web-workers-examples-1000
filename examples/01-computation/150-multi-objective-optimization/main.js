const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const canvas = document.getElementById('paretoChart');
const ctx = canvas.getContext('2d');

let worker;

function initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
}
initCanvas();
window.addEventListener('resize', initCanvas);

startBtn.addEventListener('click', () => {
    if (worker) worker.terminate();

    const problem = document.getElementById('problem').value;
    const popSize = parseInt(document.getElementById('popSize').value);
    const generations = parseInt(document.getElementById('generations').value);
    const mutationRate = parseFloat(document.getElementById('mutationRate').value);
    const crossoverRate = parseFloat(document.getElementById('crossoverRate').value);

    worker = new Worker('worker.js');

    statusDiv.textContent = 'Running NSGA-II...';
    statusDiv.className = 'status-running';
    startBtn.disabled = true;

    worker.postMessage({
        type: 'start',
        data: { problem, popSize, generations, mutationRate, crossoverRate }
    });

    worker.onmessage = function(e) {
        const { type } = e.data;
        if (type === 'progress') {
            statusDiv.textContent = `Running... Generation ${e.data.generation}`;
            drawParetoFront(e.data.paretoFront, problem);
        } else if (type === 'done') {
            statusDiv.textContent = 'Optimization Complete';
            statusDiv.className = 'status-done';
            startBtn.disabled = false;
            drawParetoFront(e.data.paretoFront, problem);
        }
    };
});

function drawParetoFront(front, problem) {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    // Determine bounds
    let minX = 0, maxX = 1;
    let minY = 0, maxY = 1;

    // For ZDT problems, F1 is [0,1]. F2 varies.
    // ZDT1: F2 ~ [0, 1]
    // ZDT2: F2 ~ [0, 1]
    // ZDT3: F2 ~ [-0.7, 1]

    if (problem === 'ZDT3') {
        minY = -0.8; maxY = 1.0;
    } else {
        minY = 0; maxY = 1.0; // standard
    }

    // Add margins
    const margin = 40;
    const drawW = width - 2 * margin;
    const drawH = height - 2 * margin;

    // Draw Axes
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin); // X axis
    ctx.lineTo(width - margin, height - margin - 5);
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(margin, margin); // Y axis
    ctx.lineTo(margin + 5, margin);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('f1', width / 2, height - 5);
    ctx.textAlign = 'right';
    ctx.fillText('f2', margin - 5, height / 2);

    // Plot Points
    ctx.fillStyle = '#6f42c1';
    for (let point of front) {
        let x = point[0];
        let y = point[1];

        let px = margin + ((x - minX) / (maxX - minX)) * drawW;
        let py = height - margin - ((y - minY) / (maxY - minY)) * drawH;

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Draw Reference Pareto Front (Analytical)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
        let f1 = i / 100;
        let f2 = 0;
        // g(x) = 1 for true front
        if (problem === 'ZDT1') {
            f2 = 1 - Math.sqrt(f1);
        } else if (problem === 'ZDT2') {
            f2 = 1 - Math.pow(f1, 2);
        } else if (problem === 'ZDT3') {
            f2 = 1 - Math.sqrt(f1) - f1 * Math.sin(10 * Math.PI * f1);
        }

        let px = margin + ((f1 - minX) / (maxX - minX)) * drawW;
        let py = height - margin - ((f2 - minY) / (maxY - minY)) * drawH;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Legend
    ctx.fillStyle = '#6f42c1';
    ctx.fillRect(width - 150, 20, 10, 10);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('Found Solutions', width - 135, 30);

    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(width - 150, 40, 10, 10);
    ctx.fillStyle = '#333';
    ctx.fillText('True Pareto Front', width - 135, 50);
}
