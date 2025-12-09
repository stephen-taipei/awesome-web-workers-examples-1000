/**
 * 重連機制 Web Worker
 *
 * 功能：模擬可能斷線的服務，用於測試重連機制
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 模擬一個可能隨時斷線的服務，
 * 支援連線、斷線、崩潰等狀態
 */

// ===== 狀態變數 =====

// 是否已連線
let isConnected = false;

// 是否應該崩潰
let shouldCrash = false;

// 連線開始時間
let connectionStartTime = 0;

// 心跳計時器
let heartbeatTimer = null;

// ===== 訊息處理 =====

/**
 * 監聯主執行緒傳來的訊息
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONNECT':
            handleConnect();
            break;

        case 'DISCONNECT':
            handleDisconnect('manual');
            break;

        case 'SIMULATE_CRASH':
            handleSimulateCrash();
            break;

        case 'PING':
            handlePing(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理連線請求
 */
function handleConnect() {
    if (isConnected) {
        sendLog('warning', 'Worker 已經連線');
        return;
    }

    // 模擬連線建立過程
    sendLog('info', 'Worker 正在建立連線...');

    // 隨機模擬連線失敗（20% 機率）
    const shouldFail = Math.random() < 0.2;

    setTimeout(() => {
        if (shouldCrash) {
            shouldCrash = false;
            sendConnectionFailed('連線過程中發生錯誤');
            return;
        }

        if (shouldFail) {
            sendConnectionFailed('模擬連線失敗');
            return;
        }

        // 連線成功
        isConnected = true;
        connectionStartTime = Date.now();

        self.postMessage({
            type: 'CONNECTED',
            payload: {
                timestamp: connectionStartTime
            }
        });

        sendLog('info', 'Worker 連線成功');

        // 啟動心跳
        startHeartbeat();

    }, 500); // 模擬連線延遲
}

/**
 * 處理斷線請求
 */
function handleDisconnect(reason) {
    if (!isConnected) {
        return;
    }

    isConnected = false;
    stopHeartbeat();

    const uptime = Date.now() - connectionStartTime;

    self.postMessage({
        type: 'DISCONNECTED',
        payload: {
            reason: reason,
            uptime: uptime,
            timestamp: Date.now()
        }
    });

    sendLog('info', `Worker 已斷線 (原因: ${reason}, 連線時長: ${formatDuration(uptime)})`);
}

/**
 * 處理模擬崩潰
 */
function handleSimulateCrash() {
    sendLog('warning', 'Worker 即將模擬崩潰');

    shouldCrash = true;

    // 如果已連線，立即斷線
    if (isConnected) {
        handleDisconnect('crash');
    }
}

/**
 * 處理心跳請求
 */
function handlePing(payload) {
    if (!isConnected) {
        return;
    }

    self.postMessage({
        type: 'PONG',
        payload: {
            sequence: payload.sequence,
            timestamp: Date.now()
        }
    });
}

/**
 * 啟動心跳（模擬定期活動）
 */
function startHeartbeat() {
    stopHeartbeat();

    heartbeatTimer = setInterval(() => {
        if (!isConnected) {
            stopHeartbeat();
            return;
        }

        // 隨機模擬斷線（1% 機率每次心跳）
        if (Math.random() < 0.01) {
            sendLog('warning', '模擬隨機斷線');
            handleDisconnect('random');
        }
    }, 1000);
}

/**
 * 停止心跳
 */
function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

// ===== 通訊函數 =====

/**
 * 發送連線失敗訊息
 */
function sendConnectionFailed(reason) {
    self.postMessage({
        type: 'CONNECTION_FAILED',
        payload: {
            reason: reason,
            timestamp: Date.now()
        }
    });
    sendLog('error', `連線失敗: ${reason}`);
}

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

/**
 * 格式化持續時間
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}小時${minutes % 60}分${seconds % 60}秒`;
    } else if (minutes > 0) {
        return `${minutes}分${seconds % 60}秒`;
    } else {
        return `${seconds}秒`;
    }
}
