/**
 * 訊息排序機制 Web Worker
 *
 * 功能：模擬非同步處理，以隨機延遲回傳訊息
 * 通訊模式：postMessage with sequence numbers
 *
 * @description
 * 此 Worker 負責：
 * 1. 接收帶有序號的訊息
 * 2. 模擬處理延遲（隨機或固定）
 * 3. 回傳處理結果，可能以亂序到達主執行緒
 */

// ===== 配置 =====

let config = {
    minDelay: 100,
    maxDelay: 2000,
    mode: 'random'  // 'random' 或 'ordered'
};

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONFIGURE':
            handleConfigure(payload);
            break;

        case 'PROCESS_MESSAGE':
            handleProcessMessage(payload);
            break;

        case 'BATCH_PROCESS':
            handleBatchProcess(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理配置更新
 */
function handleConfigure(payload) {
    if (payload.minDelay !== undefined) {
        config.minDelay = payload.minDelay;
    }
    if (payload.maxDelay !== undefined) {
        config.maxDelay = payload.maxDelay;
    }
    if (payload.mode !== undefined) {
        config.mode = payload.mode;
    }

    self.postMessage({
        type: 'CONFIGURED',
        payload: config
    });
}

/**
 * 處理單一訊息
 */
function handleProcessMessage(payload) {
    const { sequenceNumber, content, timestamp } = payload;

    // 計算處理延遲
    const delay = calculateDelay(sequenceNumber);

    setTimeout(() => {
        self.postMessage({
            type: 'MESSAGE_PROCESSED',
            payload: {
                sequenceNumber: sequenceNumber,
                content: content,
                originalTimestamp: timestamp,
                processedAt: Date.now(),
                processingDelay: delay
            }
        });
    }, delay);
}

/**
 * 處理批次訊息
 */
function handleBatchProcess(payload) {
    const { messages } = payload;

    messages.forEach(msg => {
        handleProcessMessage(msg);
    });

    self.postMessage({
        type: 'BATCH_STARTED',
        payload: {
            count: messages.length
        }
    });
}

/**
 * 計算處理延遲
 */
function calculateDelay(sequenceNumber) {
    if (config.mode === 'ordered') {
        // 按序號順序處理，序號越小延遲越短
        return config.minDelay + (sequenceNumber * 50);
    } else {
        // 隨機延遲
        return config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
    }
}

/**
 * 發送錯誤訊息
 */
function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
