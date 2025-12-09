// 主執行緒代碼
const requestBtn = document.getElementById('requestBtn');
const burstBtn = document.getElementById('burstBtn');
const updateConfigBtn = document.getElementById('updateConfigBtn');
const windowSizeInput = document.getElementById('windowSize');
const limitInput = document.getElementById('limit');
const currentCountDisplay = document.getElementById('currentCount');
const statusTextDisplay = document.getElementById('statusText');
const windowContainer = document.getElementById('windowContainer');

const worker = new Worker('worker.js');

let config = {
    windowSize: 10, // seconds
    limit: 5
};

// 用於動畫的狀態
const activeDots = [];

updateConfig();

requestBtn.addEventListener('click', sendRequest);
burstBtn.addEventListener('click', () => {
    let count = 0;
    const interval = setInterval(() => {
        sendRequest();
        count++;
        if (count >= 5) clearInterval(interval);
    }, 100);
});

updateConfigBtn.addEventListener('click', updateConfig);

worker.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'REQUEST_RESULT') {
        handleRequestResult(payload);
    } else if (type === 'STATUS_UPDATE') {
        updateStatus(payload);
    }
};

function sendRequest() {
    worker.postMessage({ type: 'REQUEST', timestamp: Date.now() });
}

function updateConfig() {
    const windowSize = parseInt(windowSizeInput.value, 10);
    const limit = parseInt(limitInput.value, 10);

    if (windowSize <= 0 || limit <= 0) {
        alert('請輸入有效的正整數');
        return;
    }

    config = { windowSize, limit };

    worker.postMessage({
        type: 'CONFIG',
        payload: config
    });
}

function handleRequestResult(result) {
    const { allowed, timestamp, count } = result;

    statusTextDisplay.textContent = allowed ? '請求允許' : '請求被拒絕';
    statusTextDisplay.style.color = allowed ? '#28a745' : '#dc3545';
    currentCountDisplay.textContent = count;

    addDot(allowed, timestamp);

    setTimeout(() => {
        statusTextDisplay.textContent = '就緒';
        statusTextDisplay.style.color = '#333';
    }, 1000);
}

function updateStatus(payload) {
    currentCountDisplay.textContent = payload.count;
}

function addDot(allowed, timestamp) {
    const dot = document.createElement('div');
    dot.className = `request-dot ${allowed ? 'allowed' : 'denied'}`;
    windowContainer.appendChild(dot);

    const dotObj = {
        element: dot,
        timestamp: timestamp
    };
    activeDots.push(dotObj);
}

// 動畫循環：移動點並移除過期的點
function animate() {
    const now = Date.now();
    const windowMs = config.windowSize * 1000;

    for (let i = activeDots.length - 1; i >= 0; i--) {
        const dot = activeDots[i];
        const age = now - dot.timestamp;

        // 計算位置：右側是現在(0s)，左側是過去(windowSize)
        // 0% (right) -> 100% (left)
        const positionPercentage = (age / windowMs) * 100;

        if (positionPercentage > 100) {
            // 超出窗口，移除
            if (dot.element.parentNode) {
                dot.element.parentNode.removeChild(dot.element);
            }
            activeDots.splice(i, 1);
        } else {
            // 更新位置
            dot.element.style.right = `${positionPercentage}%`;
        }
    }

    requestAnimationFrame(animate);
}

animate();
