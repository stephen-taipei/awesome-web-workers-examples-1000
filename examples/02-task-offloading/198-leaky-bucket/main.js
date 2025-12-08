const requestBtn = document.getElementById('requestBtn');
const burstBtn = document.getElementById('burstBtn');
const updateConfigBtn = document.getElementById('updateConfigBtn');
const capacityInput = document.getElementById('capacity');
const leakRateInput = document.getElementById('leakRate');
const currentLevelDisplay = document.getElementById('currentLevel');
const statusTextDisplay = document.getElementById('statusText');
const waterDiv = document.getElementById('water');
const processedStreamDiv = document.getElementById('processedStream');
const logList = document.getElementById('logList');

const worker = new Worker('worker.js');

updateConfig();

requestBtn.addEventListener('click', () => sendRequest(1));
burstBtn.addEventListener('click', () => sendRequest(5));
updateConfigBtn.addEventListener('click', updateConfig);

worker.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'STATUS_UPDATE':
            updateVisualization(payload);
            break;
        case 'EVENT_LOG':
            addLog(payload);
            break;
    }
};

function sendRequest(amount) {
    worker.postMessage({ type: 'ADD_WATER', amount: amount });
}

function updateConfig() {
    const capacity = parseInt(capacityInput.value, 10);
    const leakRate = parseFloat(leakRateInput.value);

    if (capacity <= 0 || leakRate <= 0) {
        alert('請輸入有效數值');
        return;
    }

    worker.postMessage({
        type: 'CONFIG',
        payload: { capacity, leakRate }
    });
}

function updateVisualization(state) {
    const { currentWater, capacity, isLeaking } = state;

    // Update text
    currentLevelDisplay.textContent = `${currentWater.toFixed(2)} / ${capacity}`;
    statusTextDisplay.textContent = isLeaking ? '正在處理 (漏水中)' : '閒置';

    // Update water height
    const percentage = Math.min(100, (currentWater / capacity) * 100);
    waterDiv.style.height = `${percentage}%`;

    // Update stream animation
    if (isLeaking) {
        processedStreamDiv.classList.add('active');
    } else {
        processedStreamDiv.classList.remove('active');
    }
}

function addLog(data) {
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString();

    li.className = data.type; // add, drop, process

    let message = '';
    if (data.type === 'add') {
        message = `📥 收到請求 (${data.amount})`;
    } else if (data.type === 'drop') {
        message = `⛔ 桶滿溢出，丟棄請求 (${data.amount})`;
    } else if (data.type === 'process') {
        message = `⚙️ 處理請求中...`;
    }

    li.innerHTML = `<span style="color:#999">[${time}]</span> ${message}`;
    logList.insertBefore(li, logList.firstChild);

    if (logList.children.length > 30) {
        logList.removeChild(logList.lastChild);
    }
}
