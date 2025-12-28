// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const simulateLoadBtn = document.getElementById('simulateLoadBtn');
const baseRateInput = document.getElementById('baseRate');
const targetLatencyInput = document.getElementById('targetLatency');
const adjustIntervalInput = document.getElementById('adjustInterval');

const currentRateDisplay = document.getElementById('currentRate');
const avgLatencyDisplay = document.getElementById('avgLatency');
const passedCountDisplay = document.getElementById('passedCount');
const rejectedCountDisplay = document.getElementById('rejectedCount');
const systemStatusDisplay = document.getElementById('systemStatus');
const adjustDirectionDisplay = document.getElementById('adjustDirection');
const loadLevelDisplay = document.getElementById('loadLevel');
const rateProgressBar = document.getElementById('rateProgress');
const logList = document.getElementById('logList');

// Chart
const canvas = document.getElementById('rateChart');
const ctx = canvas.getContext('2d');
const chartData = {
    rates: [],
    latencies: [],
    maxPoints: 60
};

// Worker
const worker = new Worker('worker.js');

// State
let isRunning = false;
let isHighLoad = false;
let requestInterval = null;
let statusInterval = null;

// Initialize
function init() {
    worker.postMessage({
        type: 'INIT',
        payload: {
            baseRate: parseInt(baseRateInput.value),
            targetLatency: parseInt(targetLatencyInput.value),
            adjustInterval: parseInt(adjustIntervalInput.value),
            minRate: 1,
            maxRate: 100
        }
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200;
    drawChart();
}

// Event Listeners
startBtn.addEventListener('click', startSystem);
stopBtn.addEventListener('click', stopSystem);
simulateLoadBtn.addEventListener('click', toggleHighLoad);

baseRateInput.addEventListener('change', updateConfig);
targetLatencyInput.addEventListener('change', updateConfig);
adjustIntervalInput.addEventListener('change', updateConfig);

worker.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'STATUS':
            updateDisplay(payload);
            break;
        case 'REQUEST_RESULT':
            // Handle individual request results if needed
            break;
        case 'LOG':
            addLog(payload);
            break;
    }
};

function startSystem() {
    worker.postMessage({ type: 'START' });
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // Send requests periodically
    requestInterval = setInterval(() => {
        for (let i = 0; i < 5; i++) {
            worker.postMessage({ type: 'REQUEST' });
        }
    }, 100);

    // Poll status
    statusInterval = setInterval(() => {
        worker.postMessage({ type: 'GET_STATUS' });
    }, 200);
}

function stopSystem() {
    worker.postMessage({ type: 'STOP' });
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;

    if (requestInterval) clearInterval(requestInterval);
    if (statusInterval) clearInterval(statusInterval);
}

function toggleHighLoad() {
    isHighLoad = !isHighLoad;
    worker.postMessage({ type: 'HIGH_LOAD', payload: { enabled: isHighLoad } });

    if (isHighLoad) {
        simulateLoadBtn.textContent = '結束高負載';
        simulateLoadBtn.classList.add('active');
    } else {
        simulateLoadBtn.textContent = '模擬高負載';
        simulateLoadBtn.classList.remove('active');
    }
}

function updateConfig() {
    worker.postMessage({
        type: 'UPDATE_CONFIG',
        payload: {
            baseRate: parseInt(baseRateInput.value),
            targetLatency: parseInt(targetLatencyInput.value),
            adjustInterval: parseInt(adjustIntervalInput.value)
        }
    });
}

function updateDisplay(status) {
    currentRateDisplay.textContent = status.currentRate;
    avgLatencyDisplay.textContent = status.avgLatency;
    passedCountDisplay.textContent = status.passedCount;
    rejectedCountDisplay.textContent = status.rejectedCount;

    // System status
    systemStatusDisplay.textContent = status.isRunning ? '運行中' : '閒置';
    systemStatusDisplay.className = 'value ' + (status.isRunning ? 'status-running' : 'status-idle');

    // Direction
    if (status.direction === 'increase') {
        adjustDirectionDisplay.textContent = '↑ 提升';
        adjustDirectionDisplay.className = 'value direction-up';
    } else if (status.direction === 'decrease') {
        adjustDirectionDisplay.textContent = '↓ 降低';
        adjustDirectionDisplay.className = 'value direction-down';
    } else {
        adjustDirectionDisplay.textContent = '— 穩定';
        adjustDirectionDisplay.className = 'value';
    }

    // Load level
    loadLevelDisplay.textContent = getLoadLevelText(status.loadLevel);
    loadLevelDisplay.className = 'value load-' + status.loadLevel;

    // Progress bar
    const progress = Math.round(status.rateProgress);
    rateProgressBar.style.width = progress + '%';
    rateProgressBar.textContent = progress + '%';

    // Update chart data
    chartData.rates.push(status.currentRate);
    chartData.latencies.push(status.avgLatency);

    if (chartData.rates.length > chartData.maxPoints) {
        chartData.rates.shift();
        chartData.latencies.shift();
    }

    drawChart();
}

function getLoadLevelText(level) {
    const texts = {
        'low': '低負載',
        'normal': '正常',
        'high': '高負載',
        'critical': '臨界'
    };
    return texts[level] || level;
}

function drawChart() {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    if (chartData.rates.length < 2) return;

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Draw rate line
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;

    const maxRate = 100;
    chartData.rates.forEach((rate, i) => {
        const x = padding + (i / (chartData.maxPoints - 1)) * plotWidth;
        const y = height - padding - (rate / maxRate) * plotHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw latency line
    ctx.beginPath();
    ctx.strokeStyle = '#dc3545';
    ctx.lineWidth = 2;

    const maxLatency = 300;
    chartData.latencies.forEach((latency, i) => {
        const x = padding + (i / (chartData.maxPoints - 1)) * plotWidth;
        const y = height - padding - (Math.min(latency, maxLatency) / maxLatency) * plotHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Legend
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#007bff';
    ctx.fillText('● 速率 (req/s)', padding, 20);
    ctx.fillStyle = '#dc3545';
    ctx.fillText('● 延遲 (ms)', padding + 100, 20);

    // Target latency line
    const targetY = height - padding - (parseInt(targetLatencyInput.value) / maxLatency) * plotHeight;
    ctx.beginPath();
    ctx.strokeStyle = '#28a745';
    ctx.setLineDash([5, 5]);
    ctx.moveTo(padding, targetY);
    ctx.lineTo(width - padding, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
}

function addLog(data) {
    const li = document.createElement('li');
    const time = new Date(data.timestamp).toLocaleTimeString();

    li.className = 'log-' + data.level;
    li.innerHTML = `<span class="log-time">[${time}]</span> ${data.message}`;

    logList.insertBefore(li, logList.firstChild);

    // Keep only recent logs
    while (logList.children.length > 50) {
        logList.removeChild(logList.lastChild);
    }
}

// Initialize on load
init();
