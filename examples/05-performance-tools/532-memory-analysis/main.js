const startBtn = document.getElementById('startBtn');
const allocBtn = document.getElementById('allocBtn');
const clearBtn = document.getElementById('clearBtn');
const stopBtn = document.getElementById('stopBtn');
const currentMemEl = document.getElementById('currentMem');
const memChart = document.getElementById('memChart');
const ctx = memChart.getContext('2d');

let worker;
let isRunning = false;
let memHistory = [];
const maxPoints = 60;

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'tick') {
            updateChart(e.data.usedMB);
        }
    };
}

function updateChart(usedMB) {
    currentMemEl.textContent = `${usedMB.toFixed(1)} MB`;

    memHistory.push(usedMB);
    if (memHistory.length > maxPoints) memHistory.shift();

    const width = memChart.width = memChart.offsetWidth;
    const height = memChart.height = memChart.offsetHeight;

    ctx.clearRect(0, 0, width, height);

    if (memHistory.length < 2) return;

    const maxVal = Math.max(...memHistory) * 1.5 || 100;
    const stepX = width / (maxPoints - 1);

    // Draw area
    ctx.beginPath();
    ctx.moveTo(0, height);
    memHistory.forEach((val, i) => {
        const x = i * stepX;
        const y = height - (val / maxVal * height);
        ctx.lineTo(x, y);
    });
    ctx.lineTo((memHistory.length - 1) * stepX, height);
    ctx.fillStyle = 'rgba(16,185,129,0.2)';
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    memHistory.forEach((val, i) => {
        const x = i * stepX;
        const y = height - (val / maxVal * height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

startBtn.addEventListener('click', () => {
    if (isRunning) return;
    if (!worker) initWorker();

    worker.postMessage({ action: 'start' });
    isRunning = true;

    startBtn.disabled = true;
    allocBtn.disabled = false;
    clearBtn.disabled = false;
    stopBtn.disabled = false;
});

stopBtn.addEventListener('click', () => {
    if (!isRunning) return;

    worker.postMessage({ action: 'stop' });
    isRunning = false;

    startBtn.disabled = false;
    allocBtn.disabled = true;
    clearBtn.disabled = true;
    stopBtn.disabled = true;
});

allocBtn.addEventListener('click', () => {
    worker.postMessage({ action: 'alloc' });
});

clearBtn.addEventListener('click', () => {
    worker.postMessage({ action: 'clear' });
});

initWorker();
