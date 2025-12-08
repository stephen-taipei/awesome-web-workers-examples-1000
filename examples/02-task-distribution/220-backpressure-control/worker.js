/**
 * 背壓控制 Web Worker
 *
 * 功能：模擬訊息處理，實現背壓控制機制
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 接收訊息並模擬處理延遲，
 * 回報緩衝區狀態以觸發主執行緒的背壓控制
 */

// ===== 狀態變數 =====

// 訊息緩衝佇列
const messageBuffer = [];

// 處理中標記
let isProcessing = false;

// 是否運行中
let isRunning = false;

// 處理時間（毫秒）
let processTime = 50;

// 緩衝區大小上限
let bufferSize = 50;

// 高水位閾值（百分比）
let highWatermark = 80;

// 低水位閾值（固定為高水位的 50%）
const LOW_WATERMARK_RATIO = 0.5;

// 統計資訊
let stats = {
    processed: 0,
    dropped: 0
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

        case 'RESET':
            handleReset();
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理設定請求
 */
function handleConfigure(payload) {
    processTime = payload.processTime || 50;
    bufferSize = payload.bufferSize || 50;
    highWatermark = payload.highWatermark || 80;

    sendLog('info', `設定更新: 處理時間=${processTime}ms, 緩衝區=${bufferSize}, 高水位=${highWatermark}%`);
}

/**
 * 處理開始請求
 */
function handleStart() {
    isRunning = true;
    stats = { processed: 0, dropped: 0 };
    messageBuffer.length = 0;

    sendLog('info', 'Worker 已啟動，準備接收訊息');
    sendBufferStatus();

    // 開始處理迴圈
    if (!isProcessing) {
        processNextMessage();
    }
}

/**
 * 處理停止請求
 */
function handleStop() {
    isRunning = false;
    messageBuffer.length = 0;

    sendLog('info', `Worker 已停止，共處理 ${stats.processed} 則訊息`);
    sendBufferStatus();
}

/**
 * 處理收到的訊息
 */
function handleMessage(payload) {
    if (!isRunning) {
        return;
    }

    // 檢查緩衝區是否已滿
    if (messageBuffer.length >= bufferSize) {
        // 緩衝區已滿，丟棄訊息
        stats.dropped++;
        sendDropped(payload.id);
        return;
    }

    // 加入緩衝區
    messageBuffer.push({
        id: payload.id,
        data: payload.data,
        timestamp: payload.timestamp
    });

    // 回報緩衝區狀態
    sendBufferStatus();

    // 如果沒有在處理中，開始處理
    if (!isProcessing) {
        processNextMessage();
    }
}

/**
 * 處理重置請求
 */
function handleReset() {
    stats = { processed: 0, dropped: 0 };
    messageBuffer.length = 0;
    sendBufferStatus();
    sendLog('info', '統計資訊已重置');
}

// ===== 訊息處理邏輯 =====

/**
 * 處理下一則訊息
 */
function processNextMessage() {
    if (!isRunning || messageBuffer.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;

    // 取出訊息
    const message = messageBuffer.shift();

    // 回報緩衝區狀態
    sendBufferStatus();

    // 模擬處理延遲
    setTimeout(() => {
        if (!isRunning) {
            isProcessing = false;
            return;
        }

        // 處理完成
        stats.processed++;

        // 發送處理完成通知
        sendProcessed(message);

        // 繼續處理下一則
        processNextMessage();
    }, processTime);
}

// ===== 通訊函數 =====

/**
 * 發送緩衝區狀態
 */
function sendBufferStatus() {
    const usage = messageBuffer.length;
    const percent = (usage / bufferSize) * 100;
    const lowWatermark = highWatermark * LOW_WATERMARK_RATIO;

    self.postMessage({
        type: 'BUFFER_STATUS',
        payload: {
            usage: usage,
            capacity: bufferSize,
            percent: percent,
            isHighWater: percent >= highWatermark,
            isLowWater: percent <= lowWatermark,
            processed: stats.processed,
            dropped: stats.dropped
        }
    });
}

/**
 * 發送訊息處理完成通知
 */
function sendProcessed(message) {
    const latency = Date.now() - message.timestamp;

    self.postMessage({
        type: 'PROCESSED',
        payload: {
            id: message.id,
            latency: latency,
            totalProcessed: stats.processed
        }
    });
}

/**
 * 發送訊息丟棄通知
 */
function sendDropped(messageId) {
    self.postMessage({
        type: 'DROPPED',
        payload: {
            id: messageId,
            totalDropped: stats.dropped
        }
    });
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
