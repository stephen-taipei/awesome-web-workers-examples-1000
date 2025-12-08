// 主執行緒代碼
const requestBtn = document.getElementById('requestBtn');
const burstBtn = document.getElementById('burstBtn');
const updateConfigBtn = document.getElementById('updateConfigBtn');
const capacityInput = document.getElementById('capacity');
const refillRateInput = document.getElementById('refillRate');
const tokenCountDisplay = document.getElementById('tokenCount');
const statusTextDisplay = document.getElementById('statusText');
const logList = document.getElementById('logList');

// 創建 Worker
const worker = new Worker('worker.js');

// 初始化配置
updateConfig();

// 事件監聽
requestBtn.addEventListener('click', () => {
    sendRequest();
});

burstBtn.addEventListener('click', () => {
    for (let i = 0; i < 10; i++) {
        sendRequest();
    }
});

updateConfigBtn.addEventListener('click', updateConfig);

// 監聽 Worker 訊息
worker.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'STATUS_UPDATE':
            updateStatus(payload);
            break;
        case 'REQUEST_RESULT':
            logRequest(payload);
            break;
    }
};

function sendRequest() {
    worker.postMessage({ type: 'REQUEST' });
}

function updateConfig() {
    const capacity = parseInt(capacityInput.value, 10);
    const refillRate = parseFloat(refillRateInput.value);

    if (isNaN(capacity) || capacity <= 0 || isNaN(refillRate) || refillRate <= 0) {
        alert('請輸入有效的正數');
        return;
    }

    worker.postMessage({
        type: 'CONFIG',
        payload: { capacity, refillRate }
    });
}

function updateStatus(status) {
    tokenCountDisplay.textContent = status.tokens.toFixed(2);
}

function logRequest(result) {
    const li = document.createElement('li');
    const timestamp = new Date().toLocaleTimeString();

    li.className = result.allowed ? 'allowed' : 'denied';

    const statusText = result.allowed ? '✅ 通過' : '⛔ 限流';
    const detailText = `剩餘令牌: ${result.remainingTokens.toFixed(2)}`;

    li.innerHTML = `
        <span>${statusText} - ${detailText}</span>
        <span class="timestamp">${timestamp}</span>
    `;

    logList.insertBefore(li, logList.firstChild);

    // 保持日誌列表長度
    if (logList.children.length > 50) {
        logList.removeChild(logList.lastChild);
    }

    statusTextDisplay.textContent = result.allowed ? '請求允許' : '請求被拒絕 (限流)';
    statusTextDisplay.style.color = result.allowed ? '#28a745' : '#dc3545';

    // 簡單的動畫效果
    setTimeout(() => {
        statusTextDisplay.textContent = '就緒';
        statusTextDisplay.style.color = '#333';
    }, 1000);
}
