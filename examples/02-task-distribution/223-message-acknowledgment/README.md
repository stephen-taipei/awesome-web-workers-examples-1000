# 223 訊息確認 Message Acknowledgment

<p align="center">
  <span class="badge badge-warning">🟡 進階</span>
  <span class="badge badge-primary">Dedicated Worker</span>
  <span class="badge badge-secondary">通訊協調</span>
</p>

## 功能說明

此範例展示如何實現**訊息確認機制 (Message Acknowledgment / ACK)**。發送訊息後等待接收方確認，若超時未收到確認則自動重傳，確保訊息可靠傳遞。

### 核心概念

- **序號追蹤**：每則訊息分配唯一序號，用於識別和追蹤
- **ACK 確認**：接收方處理完訊息後回傳確認 (ACK)
- **超時重傳**：設定時間內未收到 ACK 則重新發送
- **去重機制**：接收方識別重複訊息，避免重複處理

## 技術規格

| 項目 | 說明 |
|------|------|
| Worker 類型 | Dedicated Worker |
| 通訊方式 | postMessage (MSG/ACK) |
| 可靠性保證 | At-least-once 傳遞 |
| 超時處理 | 可設定超時時間和重試次數 |
| 序號管理 | 單調遞增序號 |

## 檔案結構

```
223-message-acknowledgment/
├── index.html    # 主頁面
├── main.js       # 主執行緒腳本
├── worker.js     # Worker 腳本
├── style.css     # 樣式表
└── README.md     # 說明文件
```

## 使用方式

1. 設定 ACK 超時時間和最大重傳次數
2. 設定 Worker 處理延遲和模擬失敗率
3. 點擊「啟動系統」
4. 發送訊息並觀察 ACK 確認流程

## 通訊協議

### 主執行緒 → Worker

```javascript
// 設定參數
{ type: 'CONFIGURE', payload: { processDelay, failRate } }

// 啟動 Worker
{ type: 'START' }

// 停止 Worker
{ type: 'STOP' }

// 發送訊息
{ type: 'MESSAGE', payload: { sequence, content, timestamp, isRetry } }
```

### Worker → 主執行緒

```javascript
// Worker 就緒
{ type: 'READY', payload: { timestamp } }

// 確認訊息
{ type: 'ACK', payload: { sequence, originalTimestamp, ackTimestamp, isDuplicate, stats } }

// 日誌訊息
{ type: 'LOG', payload: { level, message, timestamp } }
```

## ACK 機制流程

```
主執行緒                                Worker
   │                                      │
   │──── MSG #1 (seq=1) ────────────────→│
   │                                      │ 處理訊息
   │←─────── ACK #1 ──────────────────────│
   │ ✓ 確認收到                            │
   │                                      │
   │──── MSG #2 (seq=2) ────────────────→│
   │         ✕ (ACK 丟失)                 │
   │                                      │
   │    [等待超時...]                      │
   │                                      │
   │──── MSG #2 (seq=2, retry=1) ───────→│
   │                                      │ 識別重複，直接回 ACK
   │←─────── ACK #2 ──────────────────────│
   │ ✓ 確認收到                            │
   │                                      │
```

## 關鍵程式碼

### 發送訊息並追蹤

```javascript
function sendMessage(content, retryCount = 0) {
    const sequence = ++sequenceCounter;
    const message = {
        sequence,
        content,
        timestamp: Date.now(),
        retryCount
    };

    // 發送給 Worker
    worker.postMessage({
        type: 'MESSAGE',
        payload: message
    });

    // 設定超時計時器
    message.timeoutTimer = setTimeout(() => {
        handleTimeout(sequence);
    }, config.ackTimeout);

    // 加入待確認佇列
    pendingMessages.set(sequence, message);
}
```

### 處理 ACK

```javascript
function handleAck(payload) {
    const { sequence, ackTimestamp, originalTimestamp } = payload;
    const message = pendingMessages.get(sequence);

    if (!message) return;

    // 清除超時計時器
    clearTimeout(message.timeoutTimer);

    // 計算 ACK 時間
    const ackTime = ackTimestamp - originalTimestamp;

    // 從待確認佇列移除
    pendingMessages.delete(sequence);

    // 更新統計
    stats.acked++;
}
```

### 處理超時

```javascript
function handleTimeout(sequence) {
    const message = pendingMessages.get(sequence);
    message.retryCount++;

    if (message.retryCount > config.maxRetries) {
        // 標記為失敗
        stats.failed++;
        pendingMessages.delete(sequence);
    } else {
        // 重傳訊息
        worker.postMessage({
            type: 'MESSAGE',
            payload: { ...message, isRetry: true }
        });

        // 設定新的超時計時器
        message.timeoutTimer = setTimeout(() => {
            handleTimeout(sequence);
        }, config.ackTimeout);
    }
}
```

### Worker 去重處理

```javascript
const processedSequences = new Set();

function handleMessage(payload) {
    const { sequence, content } = payload;

    // 檢查重複
    if (processedSequences.has(sequence)) {
        // 直接回傳 ACK，不重複處理
        sendAck(sequence, true);
        return;
    }

    // 處理訊息
    processMessage(content);

    // 標記已處理
    processedSequences.add(sequence);

    // 回傳 ACK
    sendAck(sequence, false);
}
```

## 參數調整建議

| 模式 | ACK 超時 | 失敗率 | 適用場景 |
|------|---------|--------|---------|
| 可靠模式 | 3000ms | 0% | 正常環境 |
| 正常模式 | 2000ms | 20% | 一般測試 |
| 不穩定模式 | 1000ms | 40% | 壓力測試 |
| 惡劣環境 | 500ms | 60% | 極限測試 |

## 統計指標

- **發送訊息**：已發送的訊息總數
- **已確認**：收到 ACK 確認的訊息數
- **重傳次數**：訊息重傳的總次數
- **失敗訊息**：達到最大重試次數仍失敗的訊息
- **成功率**：已確認 / 發送訊息 × 100%
- **平均確認時間**：從發送到收到 ACK 的平均時間

## 傳遞語義

此範例實現 **At-least-once** 傳遞語義：

| 語義 | 說明 | 本範例 |
|------|------|--------|
| At-most-once | 訊息最多傳遞一次，可能丟失 | ✗ |
| At-least-once | 訊息至少傳遞一次，可能重複 | ✓ |
| Exactly-once | 訊息恰好傳遞一次 | ✗ |

要實現 Exactly-once，需要額外的冪等性處理機制。

## 應用場景

1. **命令執行確認**：確保命令被執行
2. **資料同步**：確保資料更新被接收
3. **交易處理**：確保交易請求被處理
4. **日誌收集**：確保日誌不丟失

## 瀏覽器支援

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+

## 相關範例

- [#220 背壓控制](../220-backpressure-control/)
- [#221 心跳協議](../221-heartbeat-protocol/)
- [#222 重連機制](../222-reconnection-mechanism/)

## 下一步

恭喜完成通訊協調系列範例！接下來可以探索其他類別的 Web Workers 範例。
