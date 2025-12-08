/**
 * 發布訂閱 Web Worker
 *
 * 功能：作為發布訂閱系統的訂閱者
 * 設計模式：Publish/Subscribe Pattern
 *
 * @description
 * 此 Worker 接收主執行緒分發的主題訊息，
 * 並可以透過主執行緒向其他訂閱者發布訊息。
 */

// ===== 狀態變數 =====

// Worker ID
let workerId = null;

// 已訂閱的主題
const subscriptions = new Set();

// 訊息計數
let messageCount = 0;

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'INIT':
            handleInit(payload);
            break;

        case 'SUBSCRIBE':
            handleSubscribe(payload);
            break;

        case 'UNSUBSCRIBE':
            handleUnsubscribe(payload);
            break;

        case 'MESSAGE':
            handleMessage(payload);
            break;

        default:
            console.warn(`[Worker ${workerId}] 未知的訊息類型: ${type}`);
    }
};

/**
 * 處理初始化
 * @param {Object} payload - 初始化資料
 */
function handleInit(payload) {
    workerId = payload.workerId;
    console.log(`[Worker ${workerId}] 已初始化`);
}

/**
 * 處理訂閱
 * @param {Object} payload - 訂閱資料
 */
function handleSubscribe(payload) {
    const { topic } = payload;
    subscriptions.add(topic);
    console.log(`[Worker ${workerId}] 已訂閱主題: ${topic}`);
}

/**
 * 處理取消訂閱
 * @param {Object} payload - 取消訂閱資料
 */
function handleUnsubscribe(payload) {
    const { topic } = payload;
    subscriptions.delete(topic);
    console.log(`[Worker ${workerId}] 已取消訂閱: ${topic}`);
}

/**
 * 處理接收到的訊息
 * @param {Object} payload - 訊息資料
 */
function handleMessage(payload) {
    const { topic, data, publishedAt } = payload;
    messageCount++;

    console.log(`[Worker ${workerId}] 收到 [${topic}]:`, data);

    // 通知主執行緒已收到訊息 (用於日誌顯示)
    self.postMessage({
        type: 'RECEIVED',
        payload: {
            topic,
            data,
            receivedAt: Date.now(),
            latency: Date.now() - publishedAt
        }
    });

    // 根據主題進行不同處理
    processMessage(topic, data);
}

/**
 * 根據主題處理訊息
 * @param {string} topic - 主題名稱
 * @param {*} data - 訊息資料
 */
function processMessage(topic, data) {
    // 根據不同主題執行不同邏輯
    switch (topic) {
        case 'tasks':
            handleTaskMessage(data);
            break;

        case 'alerts':
            handleAlertMessage(data);
            break;

        case 'system.config':
            handleConfigMessage(data);
            break;

        default:
            // 一般訊息處理
            console.log(`[Worker ${workerId}] 處理一般訊息: ${topic}`);
    }
}

/**
 * 處理任務訊息
 * @param {Object} data - 任務資料
 */
function handleTaskMessage(data) {
    console.log(`[Worker ${workerId}] 處理任務:`, data);

    // 模擬任務處理
    setTimeout(() => {
        // 完成後可以發布結果
        publish('tasks.completed', {
            originalTask: data,
            processedBy: workerId,
            completedAt: Date.now()
        });
    }, 1000);
}

/**
 * 處理警報訊息
 * @param {Object} data - 警報資料
 */
function handleAlertMessage(data) {
    console.log(`[Worker ${workerId}] 收到警報:`, data);
    // 可以執行特定的警報處理邏輯
}

/**
 * 處理配置訊息
 * @param {Object} data - 配置資料
 */
function handleConfigMessage(data) {
    console.log(`[Worker ${workerId}] 更新配置:`, data);
    // 可以更新 Worker 的內部配置
}

// ===== 發布函數 =====

/**
 * 透過主執行緒發布訊息到指定主題
 * @param {string} topic - 主題名稱
 * @param {*} data - 訊息資料
 */
function publish(topic, data) {
    self.postMessage({
        type: 'PUBLISH',
        payload: {
            topic,
            data,
            publishedBy: workerId
        }
    });
}

// ===== 工具函數 =====

/**
 * 取得目前訂閱的主題列表
 * @returns {string[]} 主題列表
 */
function getSubscriptions() {
    return Array.from(subscriptions);
}

/**
 * 檢查是否訂閱了指定主題
 * @param {string} topic - 主題名稱
 * @returns {boolean} 是否已訂閱
 */
function isSubscribed(topic) {
    return subscriptions.has(topic);
}
