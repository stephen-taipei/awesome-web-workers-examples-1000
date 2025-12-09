const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const objectCountInput = document.getElementById('objectCount');
const allocationIntervalInput = document.getElementById('allocationInterval');
const statusSpan = document.getElementById('status');
const avgLatencySpan = document.getElementById('avgLatency');
const maxLatencySpan = document.getElementById('maxLatency');
const gcCountSpan = document.getElementById('gcCount');
const totalTimeSpan = document.getElementById('totalTime');
const latencyChartCanvas = document.getElementById('latencyChart');
const ctx = latencyChartCanvas.getContext('2d');

let worker;
let isRunning = false;
let startTime;
let latencyHistory = [];
const maxHistory = 100;

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;
        if (type === 'tick') {
            updateStats(data);
        }
    };
}

function updateStats(data) {
    const { latency, memory } = data;

    // Update latency metrics
    latencyHistory.push(latency);
    if (latencyHistory.length > maxHistory) latencyHistory.shift();

    const avg = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
    const max = Math.max(...latencyHistory);

    avgLatencySpan.textContent = avg.toFixed(2);
    maxLatencySpan.textContent = max.toFixed(2);

    // Simple GC detection logic: if memory usage drops significantly
    // This assumes we receive usedJSHeapSize.
    // Note: performance.memory is only available in Chrome/Chromium workers and requires specific flags sometimes.
    // Our worker will try to send it if available.
    if (memory) {
         gcCountSpan.textContent = `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`;
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    totalTimeSpan.textContent = `${elapsed}s`;

    drawChart();
}

function drawChart() {
    // Simple line chart
    const width = latencyChartCanvas.width = latencyChartCanvas.offsetWidth;
    const height = latencyChartCanvas.height = latencyChartCanvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);

    if (latencyHistory.length < 2) return;

    const maxVal = Math.max(...latencyHistory) * 1.2 || 10;
    const stepX = width / (maxHistory - 1);

    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;

    latencyHistory.forEach((val, i) => {
        const x = i * stepX;
        const y = height - (val / maxVal * height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Threshold line (e.g., 16ms for 60fps)
    const y16ms = height - (16.6 / maxVal * height);
    if (y16ms > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, y16ms);
        ctx.lineTo(width, y16ms);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('16.6ms', 5, y16ms - 5);
    }
}

startBtn.addEventListener('click', () => {
    if (isRunning) return;

    if (!worker) initWorker();

    const objCount = parseInt(objectCountInput.value);
    const interval = parseInt(allocationIntervalInput.value);

    worker.postMessage({
        action: 'start',
        config: { objectCount: objCount, interval: interval }
    });

    isRunning = true;
    startTime = performance.now();
    latencyHistory = [];

    startBtn.disabled = true;
    stopBtn.disabled = false;
    objectCountInput.disabled = true;
    allocationIntervalInput.disabled = true;
    statusSpan.textContent = '測試進行中...';
    statusSpan.style.color = '#fbbf24';
});

stopBtn.addEventListener('click', () => {
    if (!isRunning) return;

    worker.postMessage({ action: 'stop' });

    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    objectCountInput.disabled = false;
    allocationIntervalInput.disabled = false;
    statusSpan.textContent = '測試已停止';
    statusSpan.style.color = '#eee';
});

initWorker();
