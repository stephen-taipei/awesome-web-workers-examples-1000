/**
 * 廣播訊息 Web Worker
 *
 * 功能：接收廣播訊息並回應
 * 通訊模式：BroadcastChannel API
 *
 * @description
 * 此 Worker 連接到指定的 BroadcastChannel，接收來自主執行緒的廣播訊息，
 * 並透過同一頻道發送回應。
 */

// ===== 狀態變數 =====

// Worker ID
let workerId = null;

// BroadcastChannel 實例
let broadcastChannel = null;

// 訊息計數器
let messageCount = 0;

// 處理的任務數
let taskCount = 0;

// ===== 初始化訊息處理 =====

/**
 * 監聽主執行緒傳來的直接訊息
 * 用於初始化和特殊指令
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'INIT':
            handleInit(payload);
            break;

        default:
            console.warn(`[Worker] 未知的直接訊息類型: ${type}`);
    }
};

/**
 * 處理初始化
 * @param {Object} payload - 初始化資料
 */
function handleInit(payload) {
    workerId = payload.workerId;
    const channelName = payload.channelName;

    // 建立 BroadcastChannel 連接
    broadcastChannel = new BroadcastChannel(channelName);

    // 監聽廣播訊息
    broadcastChannel.onmessage = handleBroadcastMessage;

    // 通知主執行緒初始化完成
    self.postMessage({
        type: 'INITIALIZED',
        payload: { workerId }
    });

    // 透過廣播頻道通知就緒
    broadcastReply('READY', { status: 'ready' });

    console.log(`[Worker ${workerId}] 已連接到頻道: ${channelName}`);
}

// ===== 廣播訊息處理 =====

/**
 * 處理來自 BroadcastChannel 的訊息
 * @param {MessageEvent} event - 訊息事件
 */
function handleBroadcastMessage(event) {
    const { type, payload, from } = event.data;

    // 忽略自己發送的訊息
    if (from === `worker-${workerId}`) {
        return;
    }

    messageCount++;

    switch (type) {
        case 'TEXT':
            handleTextMessage(payload);
            break;

        case 'PING':
            handlePing(payload);
            break;

        case 'STATUS_REQUEST':
            handleStatusRequest();
            break;

        case 'RESET':
            handleReset(payload);
            break;

        case 'TASK':
            handleTask(payload);
            break;

        case 'SHUTDOWN':
            handleShutdown(payload);
            break;

        default:
            console.log(`[Worker ${workerId}] 收到訊息 [${type}]:`, payload);
    }
}

/**
 * 處理文字訊息
 * @param {Object} payload - 訊息內容
 */
function handleTextMessage(payload) {
    console.log(`[Worker ${workerId}] 收到文字訊息: ${payload.message}`);

    // 可以選擇回應
    broadcastReply('TEXT_RECEIVED', {
        originalMessage: payload.message,
        receivedAt: Date.now()
    });
}

/**
 * 處理 PING 請求
 * @param {Object} payload - PING 資料
 */
function handlePing(payload) {
    // 回應 PONG
    broadcastReply('PONG', {
        sentAt: payload.sentAt,
        respondedAt: Date.now()
    });
}

/**
 * 處理狀態請求
 */
function handleStatusRequest() {
    broadcastReply('STATUS', {
        messageCount,
        taskCount,
        uptime: Date.now(),
        memoryUsage: self.performance ? self.performance.memory : null
    });
}

/**
 * 處理重置指令
 * @param {Object} payload - 重置資料
 */
function handleReset(payload) {
    messageCount = 0;
    taskCount = 0;

    broadcastReply('RESET_COMPLETE', {
        resetAt: payload.resetAt,
        completedAt: Date.now()
    });

    console.log(`[Worker ${workerId}] 已重置計數器`);
}

/**
 * 處理任務
 * @param {Object} payload - 任務資料
 */
function handleTask(payload) {
    const { taskId, data } = payload;
    taskCount++;

    // 模擬處理任務 (計算總和)
    const result = data.reduce((sum, num) => sum + num, 0);

    // 添加隨機延遲模擬不同處理時間
    const delay = Math.random() * 500 + 100;

    setTimeout(() => {
        broadcastReply('TASK_RESULT', {
            taskId,
            result,
            processedBy: workerId,
            processingTime: delay
        });
    }, delay);
}

/**
 * 處理關閉通知
 * @param {Object} payload - 關閉資料
 */
function handleShutdown(payload) {
    console.log(`[Worker ${workerId}] 收到關閉通知: ${payload.reason}`);

    // 關閉 BroadcastChannel
    if (broadcastChannel) {
        broadcastChannel.close();
    }
}

// ===== 回應函數 =====

/**
 * 透過廣播頻道發送回應
 * @param {string} type - 訊息類型
 * @param {*} payload - 訊息內容
 */
function broadcastReply(type, payload) {
    if (!broadcastChannel) {
        console.warn(`[Worker ${workerId}] BroadcastChannel 尚未初始化`);
        return;
    }

    broadcastChannel.postMessage({
        type,
        payload,
        from: `worker-${workerId}`,
        workerId,
        timestamp: Date.now()
    });
}
