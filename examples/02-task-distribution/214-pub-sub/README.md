# #214 發布訂閱 (Pub/Sub)

> 使用發布訂閱模式實現 Worker 之間的解耦通訊

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Communication](https://img.shields.io/badge/分類-通訊協調-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 **發布訂閱模式 (Publish/Subscribe Pattern)** 實現 Worker 之間的解耦通訊，讓訂閱者只接收感興趣的主題訊息。

### 主要功能

- 發布者和訂閱者完全解耦
- 支援多主題訂閱和動態訂閱管理
- 訂閱者只收到已訂閱主題的訊息
- 支援萬用字元訂閱 (如 `system.*`)
- 主執行緒作為訊息代理 (Message Broker)

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **設計模式** | Publish/Subscribe Pattern |
| **訊息代理** | 主執行緒 |
| **主題格式** | 點分隔命名空間 |
| **萬用字元** | 支援 `*` |
| **難度等級** | 中級 |

---

## 檔案結構

```
214-pub-sub/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本 (訊息代理)
├── worker.js       # Web Worker 腳本 (訂閱者)
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 使用方式

### 本地運行

1. 使用 HTTP 伺服器啟動專案：

```bash
# 使用 Node.js
npx serve .

# 或使用 Python
python -m http.server 8000
```

2. 開啟瀏覽器訪問：`http://localhost:8000/examples/02-task-distribution/214-pub-sub/`

### 操作說明

1. **建立 Workers**：輸入數量並點擊建立
2. **訂閱主題**：選擇 Worker 和主題，點擊訂閱
3. **發布訊息**：選擇主題，輸入內容，點擊發布
4. **觀察結果**：查看通訊記錄，確認訂閱者收到訊息

---

## 發布訂閱模式

### 核心概念

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Publisher  │────▶│ Message      │────▶│ Subscriber  │
│  (發布者)    │     │ Broker       │     │  (訂閱者)   │
└─────────────┘     │ (訊息代理)    │     └─────────────┘
                    │              │     ┌─────────────┐
                    │              │────▶│ Subscriber  │
                    │              │     │  (訂閱者)   │
                    └──────────────┘     └─────────────┘
```

### 與觀察者模式的差異

| 特性 | 發布訂閱 | 觀察者模式 |
|------|---------|-----------|
| 耦合度 | 完全解耦 | 鬆散耦合 |
| 中間層 | 需要訊息代理 | 直接通訊 |
| 主題過濾 | 支援 | 通常不支援 |
| 複雜度 | 較高 | 較低 |

---

## 訊息格式

### 訂閱請求 (主執行緒 → Worker)

```javascript
{
    type: 'SUBSCRIBE',
    payload: { topic: 'news' }
}
```

### 訊息分發 (主執行緒 → Worker)

```javascript
{
    type: 'MESSAGE',
    payload: {
        topic: 'news',
        data: { message: 'Breaking News!' },
        publishedAt: 1699123456789
    }
}
```

### 收到確認 (Worker → 主執行緒)

```javascript
{
    type: 'RECEIVED',
    payload: {
        topic: 'news',
        data: { message: 'Breaking News!' },
        receivedAt: 1699123456790,
        latency: 1
    }
}
```

---

## 程式碼範例

### 訊息代理實現 (主執行緒)

```javascript
// 主題訂閱管理 (topic -> Set of workerIds)
const subscriptions = new Map();

/**
 * 發布訊息到指定主題
 */
function publish(topic, payload) {
    const subscribers = findSubscribers(topic);

    subscribers.forEach(workerId => {
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
            worker.postMessage({
                type: 'MESSAGE',
                payload: { topic, data: payload }
            });
        }
    });
}

/**
 * 找出所有訂閱者 (支援萬用字元)
 */
function findSubscribers(topic) {
    const result = new Set();

    // 直接訂閱
    const direct = subscriptions.get(topic);
    if (direct) direct.forEach(id => result.add(id));

    // 萬用字元匹配 (如 system.* 匹配 system.status)
    subscriptions.forEach((subscribers, subTopic) => {
        if (subTopic.endsWith('.*')) {
            const prefix = subTopic.slice(0, -1);
            if (topic.startsWith(prefix)) {
                subscribers.forEach(id => result.add(id));
            }
        }
    });

    return result;
}

/**
 * 訂閱管理
 */
function subscribe(workerId, topic) {
    if (!subscriptions.has(topic)) {
        subscriptions.set(topic, new Set());
    }
    subscriptions.get(topic).add(workerId);
}

function unsubscribe(workerId, topic) {
    const subscribers = subscriptions.get(topic);
    if (subscribers) {
        subscribers.delete(workerId);
    }
}
```

### Worker 訂閱者實現

```javascript
// 已訂閱的主題
const subscriptions = new Set();

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'SUBSCRIBE':
            subscriptions.add(payload.topic);
            break;

        case 'UNSUBSCRIBE':
            subscriptions.delete(payload.topic);
            break;

        case 'MESSAGE':
            // 處理收到的訊息
            processMessage(payload.topic, payload.data);
            break;
    }
};

function processMessage(topic, data) {
    console.log(`收到 [${topic}]:`, data);

    // 根據主題執行不同邏輯
    switch (topic) {
        case 'tasks':
            handleTask(data);
            break;
        case 'alerts':
            handleAlert(data);
            break;
    }
}
```

---

## 使用場景

1. **微服務通訊**：服務之間透過主題進行解耦通訊
2. **事件驅動架構**：系統元件透過事件進行互動
3. **即時通知**：向訂閱者推送即時更新
4. **任務分發**：將任務分配給感興趣的處理者
5. **日誌收集**：收集不同來源的日誌訊息

---

## 主題命名建議

使用點分隔的命名空間：

```
news              # 一般新聞
news.sports       # 體育新聞
news.tech         # 科技新聞
system.status     # 系統狀態
system.config     # 系統配置
tasks.assigned    # 任務分配
tasks.completed   # 任務完成
```

萬用字元訂閱：

```javascript
subscribe('system.*')   // 訂閱所有 system 開頭的主題
subscribe('news.*')     // 訂閱所有 news 開頭的主題
```

---

## 瀏覽器支援

| 瀏覽器 | 版本 |
|--------|------|
| Chrome | 4+ |
| Firefox | 3.5+ |
| Safari | 4+ |
| Edge | 12+ |

---

## 相關連結

- [MDN Web Workers API](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Pub/Sub Pattern - Wikipedia](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)

---

## 下一個範例

**#215 訊息序列化** - 實現自訂訊息序列化格式。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #214 - 發布訂閱
</p>
