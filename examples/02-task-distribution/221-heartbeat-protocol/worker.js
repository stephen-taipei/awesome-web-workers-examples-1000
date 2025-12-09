/**
 * 心跳協議 Web Worker
 *
 * 功能：接收心跳請求並回應，模擬連線保活機制
 * 通訊模式：postMessage (PING/PONG)
 *
 * @description
 * 此 Worker 接收 PING 訊息並回應 PONG，
 * 可設定回應延遲以模擬網路延遲或 Worker 負載
 */

// ===== 狀態變數 =====

// 回應延遲（毫秒）
let responseDelay = 100;

// 是否模擬卡死
let isHanging = false;

// 是否運行中
let isRunning = false;

// 心跳計數
let heartbeatCount = 0;

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONFIGURE':
            handleConfigure(payload);
            break;

        case 'START':
            handleStart();
            break;

        case 'STOP':
            handleStop();
            break;

        case 'PING':
            handlePing(payload);
            break;

        case 'SIMULATE_HANG':
            handleSimulateHang(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理設定請求
 */
function handleConfigure(payload) {
    responseDelay = payload.responseDelay || 100;
    sendLog('info', `Worker 設定更新: 回應延遲=${responseDelay}ms`);
}

/**
 * 處理開始請求
 */
function handleStart() {
    isRunning = true;
    isHanging = false;
    heartbeatCount = 0;

    sendLog('info', 'Worker 已啟動，準備接收心跳');

    // 發送就緒訊息
    self.postMessage({
        type: 'READY',
        payload: { timestamp: Date.now() }
    });
}

/**
 * 處理停止請求
 */
function handleStop() {
    isRunning = false;
    isHanging = false;
    sendLog('info', `Worker 已停止，共回應 ${heartbeatCount} 次心跳`);
}

/**
 * 處理心跳請求 (PING)
 */
function handlePing(payload) {
    if (!isRunning) {
        return;
    }

    // 如果模擬卡死，不回應
    if (isHanging) {
        return;
    }

    const { sequence, timestamp } = payload;
    heartbeatCount++;

    // 模擬處理延遲後回應
    setTimeout(() => {
        if (!isRunning || isHanging) {
            return;
        }

        self.postMessage({
            type: 'PONG',
            payload: {
                sequence: sequence,
                pingTimestamp: timestamp,
                pongTimestamp: Date.now(),
                heartbeatCount: heartbeatCount
            }
        });
    }, responseDelay);
}

/**
 * 處理模擬卡死請求
 */
function handleSimulateHang(payload) {
    isHanging = payload.hang;

    if (isHanging) {
        sendLog('warning', 'Worker 開始模擬卡死狀態（不再回應心跳）');
    } else {
        sendLog('info', 'Worker 恢復正常狀態');
    }
}

// ===== 通訊函數 =====

/**
 * 發送日誌訊息
 */
function sendLog(level, message) {
    self.postMessage({
        type: 'LOG',
        payload: {
            level: level,
            message: message,
            timestamp: Date.now()
        }
    });
}

/**
 * 發送錯誤訊息
 */
function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: {
            message: message
        }
    });
}
