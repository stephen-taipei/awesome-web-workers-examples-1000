/**
 * 訊息確認 Web Worker
 *
 * 功能：接收訊息並回傳確認 (ACK)，模擬可靠訊息傳遞
 * 通訊模式：postMessage (MSG/ACK)
 *
 * @description
 * 此 Worker 接收訊息後進行處理，
 * 處理完成後回傳 ACK 確認訊息
 */

// ===== 狀態變數 =====

// 處理延遲（毫秒）
let processDelay = 500;

// 模擬失敗率（0-100）
let failRate = 20;

// 是否運行中
let isRunning = false;

// 已處理的訊息序號集合（用於去重）
const processedSequences = new Set();

// 處理統計
let stats = {
    received: 0,
    processed: 0,
    acksSent: 0,
    acksDropped: 0
};

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

        case 'MESSAGE':
            handleMessage(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理設定請求
 */
function handleConfigure(payload) {
    processDelay = payload.processDelay || 500;
    failRate = payload.failRate || 20;

    sendLog('info', `Worker 設定更新: 處理延遲=${processDelay}ms, 失敗率=${failRate}%`);
}

/**
 * 處理開始請求
 */
function handleStart() {
    isRunning = true;
    processedSequences.clear();
    stats = { received: 0, processed: 0, acksSent: 0, acksDropped: 0 };

    sendLog('info', 'Worker 已啟動，準備接收訊息');

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
    sendLog('info', `Worker 已停止，共處理 ${stats.processed} 則訊息，發送 ${stats.acksSent} 個 ACK`);
}

/**
 * 處理訊息
 */
function handleMessage(payload) {
    if (!isRunning) {
        return;
    }

    const { sequence, content, timestamp, isRetry } = payload;
    stats.received++;

    // 檢查是否為重複訊息
    if (processedSequences.has(sequence)) {
        sendLog('warning', `收到重複訊息 #${sequence}，直接回傳 ACK`);
        // 重複訊息仍需回傳 ACK
        sendAck(sequence, timestamp, true);
        return;
    }

    sendLog('info', `收到訊息 #${sequence}${isRetry ? ' (重傳)' : ''}: ${content.substring(0, 30)}...`);

    // 模擬處理延遲
    setTimeout(() => {
        if (!isRunning) {
            return;
        }

        // 標記為已處理
        processedSequences.add(sequence);
        stats.processed++;

        // 決定是否模擬 ACK 丟失
        const shouldDropAck = Math.random() * 100 < failRate;

        if (shouldDropAck) {
            stats.acksDropped++;
            sendLog('warning', `模擬 ACK #${sequence} 丟失`);
            // 不發送 ACK，讓發送端超時重傳
        } else {
            sendAck(sequence, timestamp, false);
        }
    }, processDelay);
}

/**
 * 發送 ACK
 */
function sendAck(sequence, originalTimestamp, isDuplicate) {
    stats.acksSent++;

    self.postMessage({
        type: 'ACK',
        payload: {
            sequence: sequence,
            originalTimestamp: originalTimestamp,
            ackTimestamp: Date.now(),
            isDuplicate: isDuplicate,
            stats: { ...stats }
        }
    });

    sendLog('info', `發送 ACK #${sequence}${isDuplicate ? ' (重複確認)' : ''}`);
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
