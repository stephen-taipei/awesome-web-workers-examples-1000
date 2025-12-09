// 主執行緒邏輯

// 熔斷器配置
const CONFIG = {
    failureThreshold: 5,    // 連續失敗閾值
    resetTimeout: 5000,     // 熔斷重置時間 (毫秒)
    requestTimeout: 2000    // 請求超時時間
};

// 狀態定義
const STATE = {
    CLOSED: 'CLOSED',       // 正常
    OPEN: 'OPEN',           // 熔斷
    HALF_OPEN: 'HALF_OPEN'  // 半開啟
};

// 全域變數
let currentState = STATE.CLOSED;
let failureCount = 0;
let resetTimer = null;
let resetCountdownInterval = null;
let autoRequestInterval = null;
let reliability = 1.0;
let requestId = 0;

// DOM 元素
const stateIndicator = document.getElementById('state-indicator');
const currentStateText = document.getElementById('current-state-text');
const failureCountEl = document.getElementById('failure-count');
const resetTimeoutEl = document.getElementById('reset-timeout');
const requestLogEl = document.getElementById('request-log');
const serviceReliabilitySelect = document.getElementById('service-reliability');
const sendRequestBtn = document.getElementById('send-request-btn');
const autoRequestBtn = document.getElementById('auto-request-btn');
const stopAutoBtn = document.getElementById('stop-auto-btn');
const resetCbBtn = document.getElementById('reset-cb-btn');

// Worker (我們只用一個 Worker 來模擬服務端)
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { id, success, message } = e.data;
    handleResponse(id, success, message);
};

// 初始化顯示
updateUI();

// 事件監聽
serviceReliabilitySelect.addEventListener('change', (e) => {
    reliability = parseFloat(e.target.value);
});

sendRequestBtn.addEventListener('click', () => {
    sendRequest();
});

autoRequestBtn.addEventListener('click', () => {
    sendRequestBtn.disabled = true;
    autoRequestBtn.disabled = true;
    stopAutoBtn.disabled = false;
    sendRequest(); // 立即發送一個
    autoRequestInterval = setInterval(sendRequest, 1000);
});

stopAutoBtn.addEventListener('click', () => {
    clearInterval(autoRequestInterval);
    sendRequestBtn.disabled = false;
    autoRequestBtn.disabled = false;
    stopAutoBtn.disabled = true;
});

resetCbBtn.addEventListener('click', () => {
    resetCircuitBreaker();
});

// 核心邏輯：發送請求
function sendRequest() {
    requestId++;
    const currentId = requestId;

    // 1. 檢查熔斷器狀態
    if (currentState === STATE.OPEN) {
        log(currentId, 'circuit-open', `請求被攔截 (熔斷器開啟中)`);
        return;
    }

    // 2. 發送請求給 Worker
    log(currentId, 'pending', `正在發送請求...`);

    // 如果是 HALF_OPEN，我們限制只能有一個並發請求 (這裡簡化處理，因為我們是單線程觸發)
    // 實際應用中可能需要鎖機制

    worker.postMessage({
        id: currentId,
        reliability: reliability,
        timeout: CONFIG.requestTimeout
    });
}

// 核心邏輯：處理響應
function handleResponse(id, success, message) {
    if (success) {
        onSuccess(id, message);
    } else {
        onFailure(id, message);
    }
}

function onSuccess(id, message) {
    log(id, 'success', `請求成功: ${message}`);

    if (currentState === STATE.HALF_OPEN) {
        // 半開啟狀態下成功 -> 恢復正常
        transitionTo(STATE.CLOSED);
        log(id, 'success', `[熔斷器] 服務恢復，狀態切換至 CLOSED`);
    } else if (currentState === STATE.CLOSED) {
        // 正常狀態下成功 -> 重置失敗計數
        failureCount = 0;
        updateUI();
    }
}

function onFailure(id, message) {
    log(id, 'error', `請求失敗: ${message}`);

    if (currentState === STATE.CLOSED) {
        failureCount++;
        if (failureCount >= CONFIG.failureThreshold) {
            transitionTo(STATE.OPEN);
            log(id, 'error', `[熔斷器] 失敗達到閾值 (${CONFIG.failureThreshold})，狀態切換至 OPEN`);
        }
    } else if (currentState === STATE.HALF_OPEN) {
        // 半開啟狀態下失敗 -> 重新熔斷
        transitionTo(STATE.OPEN);
        log(id, 'error', `[熔斷器] 探測失敗，狀態切換回 OPEN`);
    }
    updateUI();
}

// 狀態轉換
function transitionTo(newState) {
    currentState = newState;

    if (newState === STATE.OPEN) {
        failureCount = 0; // 重置計數，準備下一輪
        startResetTimer();
    } else if (newState === STATE.CLOSED) {
        failureCount = 0;
        stopResetTimer();
    } else if (newState === STATE.HALF_OPEN) {
        stopResetTimer();
    }

    updateUI();
}

// 熔斷重置計時器
function startResetTimer() {
    let remaining = CONFIG.resetTimeout / 1000;
    resetTimeoutEl.textContent = remaining;

    // 清除舊的計時器
    if (resetTimer) clearTimeout(resetTimer);
    if (resetCountdownInterval) clearInterval(resetCountdownInterval);

    // 倒數顯示
    resetCountdownInterval = setInterval(() => {
        remaining--;
        resetTimeoutEl.textContent = remaining;
        if (remaining <= 0) clearInterval(resetCountdownInterval);
    }, 1000);

    // 實際切換
    resetTimer = setTimeout(() => {
        transitionTo(STATE.HALF_OPEN);
        log(0, 'pending', `[熔斷器] 冷卻時間結束，狀態切換至 HALF_OPEN (嘗試恢復)`);
    }, CONFIG.resetTimeout);
}

function stopResetTimer() {
    if (resetTimer) clearTimeout(resetTimer);
    if (resetCountdownInterval) clearInterval(resetCountdownInterval);
    resetTimeoutEl.textContent = 0;
}

function resetCircuitBreaker() {
    transitionTo(STATE.CLOSED);
    log(0, 'success', `[手動] 熔斷器已重置為 CLOSED`);
}

// UI 更新
function updateUI() {
    // 更新指示器樣式
    stateIndicator.className = `state-indicator ${currentState.toLowerCase().replace('_', '-')}`;
    stateIndicator.textContent = currentState.replace('_', ' ');

    // 更新文字描述
    let stateText = '';
    switch(currentState) {
        case STATE.CLOSED: stateText = 'CLOSED (正常)'; break;
        case STATE.OPEN: stateText = 'OPEN (熔斷)'; break;
        case STATE.HALF_OPEN: stateText = 'HALF-OPEN (探測)'; break;
    }
    currentStateText.textContent = stateText;

    // 更新數值
    failureCountEl.textContent = failureCount;
}

function log(id, type, msg) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();

    // 如果是 pending (還沒完成)，我們不給樣式，或者只給灰階
    // 這裡為了簡單，只處理 success, error, circuit-open
    if (type === 'pending') {
        entry.style.background = 'rgba(255, 255, 255, 0.05)';
        entry.style.borderLeft = '3px solid #6c757d';
    }

    entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">#${id} ${msg}</span>`;
    requestLogEl.prepend(entry);

    // 保持日誌數量在一定範圍內
    if (requestLogEl.children.length > 50) {
        requestLogEl.lastElementChild.remove();
    }
}
