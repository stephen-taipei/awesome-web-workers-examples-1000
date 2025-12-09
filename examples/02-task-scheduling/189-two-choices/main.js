// Main thread script

const worker = new Worker('worker.js');
const canvas = document.getElementById('loadChart');
const ctx = canvas.getContext('2d');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const algorithmSelect = document.getElementById('algorithm');
const arrivalRateInput = document.getElementById('arrivalRate');
const taskDurationInput = document.getElementById('taskDuration');

const maxLoadEl = document.getElementById('maxLoad');
const avgLoadEl = document.getElementById('avgLoad');
const varLoadEl = document.getElementById('varLoad');

let currentLoads = [];
let isRunning = false;

// Config display update
arrivalRateInput.addEventListener('input', (e) => {
    document.getElementById('arrivalRateVal').textContent = e.target.value;
    if (isRunning) updateWorkerConfig();
});

taskDurationInput.addEventListener('input', (e) => {
    document.getElementById('taskDurationVal').textContent = e.target.value;
    if (isRunning) updateWorkerConfig();
});

algorithmSelect.addEventListener('change', () => {
    if (isRunning) updateWorkerConfig();
});

function updateWorkerConfig() {
    worker.postMessage({
        type: 'updateConfig',
        payload: {
            algorithm: algorithmSelect.value,
            arrivalRate: parseInt(arrivalRateInput.value),
            taskDuration: parseInt(taskDurationInput.value)
        }
    });
}

// Charting
function drawChart(loads) {
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / loads.length;
    const maxBarHeight = height - 30; // Leave space for text

    ctx.clearRect(0, 0, width, height);

    // Determine scale based on max load in current view + padding
    // Or fixed scale? Dynamic is better.
    let maxLoad = Math.max(...loads, 10); // Minimum scale of 10

    ctx.fillStyle = '#007bff';
    ctx.strokeStyle = '#0056b3';

    loads.forEach((load, index) => {
        const barHeight = (load / maxLoad) * maxBarHeight;
        const x = index * barWidth;
        const y = height - barHeight;

        // Color gradient based on load
        if (load > maxLoad * 0.8) ctx.fillStyle = '#dc3545'; // High load red
        else if (load > maxLoad * 0.5) ctx.fillStyle = '#ffc107'; // Medium load yellow
        else ctx.fillStyle = '#28a745'; // Low load green

        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

        // Draw load number if bars are wide enough
        if (barWidth > 20) {
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.font = '10px Arial';
            ctx.fillText(load, x + barWidth/2, y - 5);
        }
    });

    // Draw baseline
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();
}

// Worker communication
worker.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'update') {
        currentLoads = payload.loads;
        maxLoadEl.textContent = payload.maxLoad;
        avgLoadEl.textContent = payload.avgLoad.toFixed(2);
        varLoadEl.textContent = payload.variance.toFixed(2);

        requestAnimationFrame(() => drawChart(currentLoads));
    }
};

// Controls
startBtn.addEventListener('click', () => {
    worker.postMessage({
        type: 'start',
        payload: {
            algorithm: algorithmSelect.value,
            arrivalRate: parseInt(arrivalRateInput.value),
            taskDuration: parseInt(taskDurationInput.value)
        }
    });
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    algorithmSelect.disabled = true; // Often better to restart for algo change, but we supported dynamic
});

stopBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'stop' });
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    algorithmSelect.disabled = false;
});

resetBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'reset' });
    if (isRunning) {
        worker.postMessage({ type: 'stop' });
        isRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        algorithmSelect.disabled = false;
    }
    drawChart([]);
    maxLoadEl.textContent = '0';
    avgLoadEl.textContent = '0';
    varLoadEl.textContent = '0';
});

// Initial draw
drawChart([]);
