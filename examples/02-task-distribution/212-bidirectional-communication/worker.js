/**
 * 雙向通訊 Web Worker
 *
 * 功能：處理來自主執行緒的請求並返回對應回應
 * 通訊模式：Request-Response Pattern
 *
 * @description
 * 此 Worker 接收帶有 requestId 的請求，處理後返回相同 requestId 的回應，
 * 讓主執行緒能正確匹配請求與回應。
 */

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 * 訊息格式：{ requestId: number, action: string, data: any }
 */
self.onmessage = function(event) {
    const { requestId, action, data } = event.data;

    // 根據 action 處理請求
    switch (action) {
        case 'SQUARE':
            handleSquare(requestId, data);
            break;

        case 'DELAYED_RESPONSE':
            handleDelayedResponse(requestId, data);
            break;

        case 'FACTORIAL':
            handleFactorial(requestId, data);
            break;

        case 'RANDOM':
            handleRandom(requestId, data);
            break;

        default:
            sendError(requestId, `未知的動作: ${action}`);
    }
};

// ===== 請求處理函數 =====

/**
 * 處理計算平方請求
 * @param {number} requestId - 請求 ID
 * @param {Object} data - 請求資料
 */
function handleSquare(requestId, data) {
    const { number } = data;

    if (typeof number !== 'number' || isNaN(number)) {
        sendError(requestId, '無效的數字');
        return;
    }

    const result = number * number;
    sendSuccess(requestId, { result, original: number });
}

/**
 * 處理延遲回應請求 (模擬耗時操作)
 * @param {number} requestId - 請求 ID
 * @param {Object} data - 請求資料
 */
function handleDelayedResponse(requestId, data) {
    const { delay } = data;

    if (typeof delay !== 'number' || delay < 0) {
        sendError(requestId, '無效的延遲時間');
        return;
    }

    // 模擬耗時操作
    setTimeout(() => {
        sendSuccess(requestId, {
            message: `延遲 ${delay}ms 後完成`,
            completedAt: new Date().toISOString()
        });
    }, delay);
}

/**
 * 處理計算階乘請求
 * @param {number} requestId - 請求 ID
 * @param {Object} data - 請求資料
 */
function handleFactorial(requestId, data) {
    const { number } = data;

    if (typeof number !== 'number' || !Number.isInteger(number) || number < 0) {
        sendError(requestId, '請提供非負整數');
        return;
    }

    if (number > 170) {
        sendError(requestId, '數字過大，會導致 Infinity');
        return;
    }

    let result = 1;
    for (let i = 2; i <= number; i++) {
        result *= i;
    }

    sendSuccess(requestId, { result, original: number });
}

/**
 * 處理隨機數生成請求
 * @param {number} requestId - 請求 ID
 * @param {Object} data - 請求資料
 */
function handleRandom(requestId, data) {
    const { min = 0, max = 100, count = 1 } = data;

    if (count < 1 || count > 1000) {
        sendError(requestId, '數量必須在 1-1000 之間');
        return;
    }

    const numbers = [];
    for (let i = 0; i < count; i++) {
        numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    sendSuccess(requestId, { numbers, min, max, count });
}

// ===== 回應函數 =====

/**
 * 發送成功回應
 * @param {number} requestId - 請求 ID
 * @param {*} data - 回應資料
 */
function sendSuccess(requestId, data) {
    self.postMessage({
        requestId,
        success: true,
        data
    });
}

/**
 * 發送錯誤回應
 * @param {number} requestId - 請求 ID
 * @param {string} error - 錯誤訊息
 */
function sendError(requestId, error) {
    self.postMessage({
        requestId,
        success: false,
        error
    });
}
