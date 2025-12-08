# 221 心跳協議 Heartbeat Protocol

<p align="center">
  <span class="badge badge-success">🟢 初級</span>
  <span class="badge badge-primary">Dedicated Worker</span>
  <span class="badge badge-secondary">通訊協調</span>
</p>

## 功能說明

此範例展示如何在 Web Worker 中實現**心跳協議 (Heartbeat Protocol)**。主執行緒定期發送 PING 訊息，Worker 回應 PONG，藉此監控 Worker 的健康狀態和連線品質。

### 核心概念

- **心跳 (Heartbeat)**：定期發送的探測訊息，確認對方仍在運作
- **PING/PONG**：標準的心跳請求與回應模式
- **超時偵測**：設定時間內未收到回應則判定為異常
- **延遲計算**：測量往返時間 (RTT) 評估通訊效能

## 技術規格

| 項目 | 說明 |
|------|------|
| Worker 類型 | Dedicated Worker |
| 通訊方式 | postMessage (PING/PONG) |
| 超時處理 | setTimeout 計時器 |
| 延遲計算 | 往返時間 (RTT) |
| 重試機制 | 可設定最大重試次數 |

## 檔案結構

```
221-heartbeat-protocol/
├── index.html    # 主頁面
├── main.js       # 主執行緒腳本
├── worker.js     # Worker 腳本
├── style.css     # 樣式表
└── README.md     # 說明文件
```

## 使用方式

1. 設定心跳間隔（多久發送一次 PING）
2. 設定超時時間（等待 PONG 的最大時間）
3. 設定最大重試次數
4. 點擊「啟動心跳」開始監控
5. 可點擊「模擬卡死」測試超時處理

## 通訊協議

### 主執行緒 → Worker

```javascript
// 設定參數
{ type: 'CONFIGURE', payload: { responseDelay } }

// 啟動 Worker
{ type: 'START' }

// 停止 Worker
{ type: 'STOP' }

// 心跳請求
{ type: 'PING', payload: { sequence, timestamp } }

// 模擬卡死
{ type: 'SIMULATE_HANG', payload: { hang: boolean } }
```

### Worker → 主執行緒

```javascript
// Worker 就緒
{ type: 'READY', payload: { timestamp } }

// 心跳回應
{ type: 'PONG', payload: { sequence, pingTimestamp, pongTimestamp, heartbeatCount } }

// 日誌訊息
{ type: 'LOG', payload: { level, message, timestamp } }
```

## 心跳協議流程

```
時間軸
  │
  ├─ T0: 發送 PING #1
  │      ↓
  │      └─ 設定超時計時器 (3000ms)
  │
  ├─ T0+100ms: 收到 PONG #1
  │            ↓
  │            ├─ 清除超時計時器
  │            ├─ 計算延遲 = 100ms
  │            └─ 狀態: 連線正常
  │
  ├─ T0+1000ms: 發送 PING #2
  │             ...
  │
  ├─ 若超時:
  │   ├─ 連續失敗 +1
  │   ├─ 若失敗次數 >= 最大重試
  │   │   └─ 狀態: 連線中斷
  │   └─ 繼續發送下一個 PING
  │
  └─ ...
```

## 關鍵程式碼

### 發送心跳

```javascript
function sendPing() {
    sequence++;
    waitingForPong = true;

    worker.postMessage({
        type: 'PING',
        payload: {
            sequence: sequence,
            timestamp: Date.now()
        }
    });

    // 設定超時計時器
    timeoutTimer = setTimeout(handleTimeout, config.timeout);
}
```

### 處理回應

```javascript
function handlePong(payload) {
    clearTimeout(timeoutTimer);
    waitingForPong = false;

    // 計算延遲
    const latency = payload.pongTimestamp - payload.pingTimestamp;

    // 重置失敗計數
    consecutiveFailures = 0;

    // 排程下一次心跳
    scheduleNextHeartbeat();
}
```

### Worker 回應

```javascript
function handlePing(payload) {
    const { sequence, timestamp } = payload;

    setTimeout(() => {
        self.postMessage({
            type: 'PONG',
            payload: {
                sequence: sequence,
                pingTimestamp: timestamp,
                pongTimestamp: Date.now()
            }
        });
    }, responseDelay);
}
```

## 參數調整建議

| 場景 | 心跳間隔 | 超時時間 | 說明 |
|------|---------|---------|------|
| 標準監控 | 1000ms | 3000ms | 適合大多數情況 |
| 高頻監控 | 500ms | 1500ms | 需要快速偵測異常 |
| 低頻監控 | 2000ms | 6000ms | 減少開銷 |
| 嚴格模式 | 1000ms | 2000ms | 快速判定離線 |

## 統計指標

- **發送心跳**：已發送的 PING 總數
- **收到回應**：已收到的 PONG 總數
- **超時次數**：未在時限內收到回應的次數
- **平均延遲**：所有成功心跳的平均往返時間
- **成功率**：收到回應 / 發送心跳 × 100%

## 應用場景

1. **WebSocket 保活**：維持長連接不被伺服器斷開
2. **Service Worker 監控**：確認 Service Worker 正常運作
3. **多 Worker 協調**：監控多個 Worker 的健康狀態
4. **即時應用**：聊天室、線上遊戲的連線監控

## 瀏覽器支援

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+

## 相關範例

- [#220 背壓控制](../220-backpressure-control/)
- [#222 重連機制](../222-reconnection-mechanism/)
- [#223 訊息確認](../223-message-acknowledgment/)

## 下一步

試試 [#222 重連機制](../222-reconnection-mechanism/)，學習如何實現 Worker 自動重連功能。
