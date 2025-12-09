# 222 重連機制 Reconnection Mechanism

<p align="center">
  <span class="badge badge-warning">🟡 進階</span>
  <span class="badge badge-primary">Dedicated Worker</span>
  <span class="badge badge-secondary">通訊協調</span>
</p>

## 功能說明

此範例展示如何實現 **自動重連機制 (Reconnection Mechanism)**，當 Worker 連線中斷時，使用指數退避 (Exponential Backoff) 策略自動嘗試重新連線。

### 核心概念

- **指數退避**：每次重連失敗後，等待時間按指數增長（1s → 2s → 4s → 8s...）
- **最大延遲**：設定等待時間上限，避免等待過久
- **隨機抖動 (Jitter)**：在延遲時間加入隨機變化，避免「驚群效應」
- **最大重試次數**：達到上限後停止重連，避免無限重試

## 技術規格

| 項目 | 說明 |
|------|------|
| Worker 類型 | Dedicated Worker |
| 通訊方式 | postMessage |
| 重連策略 | 指數退避 + 抖動 |
| 狀態管理 | 連線/斷線/重連中 |
| 連線監控 | 統計與歷史記錄 |

## 檔案結構

```
222-reconnection-mechanism/
├── index.html    # 主頁面
├── main.js       # 主執行緒腳本
├── worker.js     # Worker 腳本
├── style.css     # 樣式表
└── README.md     # 說明文件
```

## 使用方式

1. 設定指數退避參數（初始延遲、最大延遲、倍數）
2. 設定最大重試次數
3. 選擇是否啟用隨機抖動
4. 點擊「建立連線」開始
5. 可使用「模擬崩潰」測試重連機制

## 通訊協議

### 主執行緒 → Worker

```javascript
// 建立連線
{ type: 'CONNECT' }

// 斷開連線
{ type: 'DISCONNECT' }

// 模擬崩潰
{ type: 'SIMULATE_CRASH' }

// 心跳請求
{ type: 'PING', payload: { sequence } }
```

### Worker → 主執行緒

```javascript
// 連線成功
{ type: 'CONNECTED', payload: { timestamp } }

// 已斷線
{ type: 'DISCONNECTED', payload: { reason, uptime, timestamp } }

// 連線失敗
{ type: 'CONNECTION_FAILED', payload: { reason, timestamp } }

// 日誌訊息
{ type: 'LOG', payload: { level, message, timestamp } }
```

## 指數退避演算法

```
delay = min(initialDelay × multiplier^attempt, maxDelay)

若啟用抖動:
delay = delay + (delay × 0.3 × random())
```

### 延遲計算範例

| 重試次數 | 基本延遲 | 含抖動 (±30%) |
|---------|---------|---------------|
| 1 | 1s | 1s ~ 1.3s |
| 2 | 2s | 2s ~ 2.6s |
| 3 | 4s | 4s ~ 5.2s |
| 4 | 8s | 8s ~ 10.4s |
| 5 | 16s | 16s ~ 20.8s |
| 6+ | 30s (上限) | 30s ~ 39s |

## 關鍵程式碼

### 指數退避計算

```javascript
function scheduleReconnect() {
    // 計算延遲
    let delay = config.initialDelay * Math.pow(config.multiplier, reconnectState.attempts);
    delay = Math.min(delay, config.maxDelay);

    // 添加隨機抖動
    if (config.jitterEnabled) {
        const jitter = delay * 0.3 * Math.random();
        delay = delay + jitter;
    }

    // 排程重連
    reconnectTimer = setTimeout(() => {
        attemptConnection();
    }, delay);
}
```

### 連線狀態機

```
                 ┌─────────────────┐
                 │   Disconnected  │
                 └────────┬────────┘
                          │ connect()
                          ▼
                 ┌─────────────────┐
          ┌──────│   Connecting    │──────┐
          │      └─────────────────┘      │
          │              │                │
    連線失敗         連線成功         連線失敗
          │              │                │
          ▼              ▼                ▼
 ┌─────────────────┐ ┌─────────────────┐  │
 │   Reconnecting  │ │    Connected    │  │
 └────────┬────────┘ └────────┬────────┘  │
          │                   │           │
          │              斷線發生          │
          │                   │           │
          └───────────────────┴───────────┘
```

## 參數調整建議

| 策略 | 初始延遲 | 最大延遲 | 倍數 | 適用場景 |
|------|---------|---------|------|---------|
| 標準策略 | 1s | 30s | 2x | 一般應用 |
| 快速重連 | 500ms | 10s | 1.5x | 低延遲需求 |
| 保守策略 | 2s | 60s | 2x | 減少伺服器負載 |
| 積極重連 | 100ms | 5s | 2x | 關鍵連線 |

## 統計指標

- **成功連線**：成功建立連線的次數
- **斷線次數**：連線中斷的總次數
- **重連嘗試**：嘗試重連的總次數
- **連線率**：連線時間 / 總運行時間 × 100%

## 應用場景

1. **WebSocket 重連**：即時通訊應用的連線恢復
2. **API 請求重試**：網路請求失敗時的重試策略
3. **資料庫連線池**：資料庫連線斷開後的重連
4. **微服務通訊**：服務間通訊的容錯處理

## 為什麼需要隨機抖動？

當多個客戶端同時斷線（例如伺服器重啟），如果都使用相同的重連時間，會在同一時間點大量重連，造成「驚群效應」(Thundering Herd)。

加入隨機抖動後，重連時間會分散開來：
- 客戶端 A: 2.1s 後重連
- 客戶端 B: 2.5s 後重連
- 客戶端 C: 2.3s 後重連

這樣可以有效分散伺服器負載。

## 瀏覽器支援

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+

## 相關範例

- [#220 背壓控制](../220-backpressure-control/)
- [#221 心跳協議](../221-heartbeat-protocol/)
- [#223 訊息確認](../223-message-acknowledgment/)

## 下一步

試試 [#223 訊息確認](../223-message-acknowledgment/)，學習如何實現可靠的訊息傳遞機制。
