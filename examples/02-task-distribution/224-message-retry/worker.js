/**
 * 訊息重傳機制 Web Worker
 *
 * 功能：處理訊息並模擬失敗情況，支援自動重傳機制
 * 通訊模式：postMessage with message ID tracking
 *
 * @description
 * 此 Worker 負責：
 * 1. 接收主執行緒傳來的訊息
 * 2. 模擬處理過程（可能失敗）
 * 3. 回報處理結果（成功/失敗）
 * 4. 由主執行緒決定是否重傳
 */

// ===== 狀態變數 =====

// 模擬失敗率 (0-100)
let failureRate = 50;

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

        case 'PROCESS_MESSAGE':
            handleProcessMessage(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理配置更新
 * @param {Object} payload - 配置參數
 */
function handleConfigure(payload) {
    if (typeof payload.failureRate === 'number') {
        failureRate = Math.max(0, Math.min(100, payload.failureRate));
    }

    self.postMessage({
        type: 'CONFIGURED',
        payload: {
            failureRate: failureRate
        }
    });
}

/**
 * 處理訊息
 * @param {Object} payload - 訊息資料
 */
function handleProcessMessage(payload) {
    const { messageId, content, attempt } = payload;

    // 模擬處理延遲
    const processingTime = Math.random() * 500 + 100;

    setTimeout(() => {
        // 根據失敗率決定是否成功
        const success = Math.random() * 100 >= failureRate;

        if (success) {
            // 處理成功
            self.postMessage({
                type: 'MESSAGE_SUCCESS',
                payload: {
                    messageId: messageId,
                    content: content,
                    attempt: attempt,
                    processingTime: processingTime
                }
            });
        } else {
            // 處理失敗
            self.postMessage({
                type: 'MESSAGE_FAILED',
                payload: {
                    messageId: messageId,
                    content: content,
                    attempt: attempt,
                    error: '模擬處理失敗',
                    processingTime: processingTime
                }
            });
        }
    }, processingTime);
}

/**
 * 發送錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: {
            message: message
        }
    });
}
