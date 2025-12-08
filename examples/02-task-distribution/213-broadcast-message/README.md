# #213 廣播訊息 (Broadcast Message)

> 使用 BroadcastChannel API 實現一對多的訊息廣播

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Communication](https://img.shields.io/badge/分類-通訊協調-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 **BroadcastChannel API** 實現一對多的訊息廣播機制，讓主執行緒能夠同時與多個 Worker 進行通訊。

### 主要功能

- 使用 BroadcastChannel 建立通訊頻道
- 支援一對多訊息廣播
- 動態建立和管理多個 Worker
- 同步狀態通知和任務分發
- 完整的訊息追蹤和日誌記錄

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | One-to-Many Broadcast |
| **核心技術** | BroadcastChannel API |
| **頻道機制** | 同名頻道自動連接 |
| **適用場景** | 狀態同步、全域通知 |
| **難度等級** | 中級 |

---

## 檔案結構

```
213-broadcast-message/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
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

2. 開啟瀏覽器訪問：`http://localhost:8000/examples/02-task-distribution/213-broadcast-message/`

### 操作說明

1. **建立 Workers**：輸入數量並點擊建立
2. **廣播訊息**：輸入文字並點擊廣播
3. **發送指令**：使用預設指令按鈕
4. **管理 Workers**：可個別終止或全部終止

---

## BroadcastChannel API

### 基本概念

BroadcastChannel API 允許同源的不同瀏覽上下文（視窗、Tab、iframe、Worker）之間進行通訊。

```javascript
// 建立/連接到頻道
const channel = new BroadcastChannel('my-channel');

// 發送訊息
channel.postMessage({ type: 'HELLO', data: 'world' });

// 接收訊息
channel.onmessage = (event) => {
    console.log(event.data);
};

// 關閉頻道
channel.close();
```

### 特點

- **同名連接**：所有使用相同頻道名稱的 BroadcastChannel 實例會自動連接
- **廣播模式**：發送的訊息會傳遞給所有其他訂閱者
- **不含發送者**：發送者不會收到自己發送的訊息
- **同源限制**：僅限同源頁面之間通訊

---

## 訊息格式

### 廣播訊息格式

```javascript
{
    type: string,        // 訊息類型
    payload: any,        // 訊息內容
    from: string,        // 發送者 ('main' 或 'worker-{id}')
    workerId: number,    // Worker ID (僅 Worker 發送時)
    timestamp: number    // 時間戳記
}
```

### 支援的訊息類型

| 類型 | 方向 | 說明 |
|------|------|------|
| `TEXT` | Main → Workers | 文字訊息 |
| `PING` | Main → Workers | 連線測試 |
| `PONG` | Workers → Main | PING 回應 |
| `STATUS_REQUEST` | Main → Workers | 請求狀態 |
| `STATUS` | Workers → Main | 狀態回報 |
| `RESET` | Main → Workers | 重置指令 |
| `TASK` | Main → Workers | 分配任務 |
| `TASK_RESULT` | Workers → Main | 任務結果 |
| `SHUTDOWN` | Main → Workers | 關閉通知 |

---

## 程式碼範例

### 主執行緒設定

```javascript
// 建立 BroadcastChannel
const channel = new BroadcastChannel('worker-broadcast');

// 監聽來自 Worker 的訊息
channel.onmessage = (event) => {
    const { type, payload, workerId } = event.data;
    console.log(`Worker ${workerId} 說: ${type}`, payload);
};

// 廣播訊息給所有 Worker
function broadcast(type, payload) {
    channel.postMessage({
        type,
        payload,
        from: 'main',
        timestamp: Date.now()
    });
}

// 範例：廣播文字訊息
broadcast('TEXT', { message: 'Hello, Workers!' });
```

### Worker 設定

```javascript
let channel = null;
let workerId = null;

// 初始化時連接到頻道
self.onmessage = (event) => {
    if (event.data.type === 'INIT') {
        workerId = event.data.payload.workerId;
        const channelName = event.data.payload.channelName;

        // 連接到廣播頻道
        channel = new BroadcastChannel(channelName);

        // 監聽廣播訊息
        channel.onmessage = handleBroadcast;
    }
};

function handleBroadcast(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PING':
            // 回應 PONG
            channel.postMessage({
                type: 'PONG',
                payload: { respondedAt: Date.now() },
                workerId
            });
            break;
    }
}
```

---

## 與 postMessage 的比較

| 特性 | BroadcastChannel | postMessage |
|------|-----------------|-------------|
| 通訊模式 | 一對多 | 一對一 |
| 目標指定 | 不需要 | 需要引用 |
| 跨 Tab 通訊 | 支援 | 需額外處理 |
| 效能 | 更高效 | 需逐一發送 |
| 靈活性 | 頻道為單位 | 更精確控制 |

---

## 使用場景

1. **狀態同步**：在多個 Worker 之間同步共享狀態
2. **全域通知**：發送系統級別的通知訊息
3. **配置更新**：動態更新所有 Worker 的配置
4. **負載均衡**：向所有 Worker 廣播任務，由空閒者處理
5. **關閉協調**：優雅地關閉所有 Worker

---

## 瀏覽器支援

| 瀏覽器 | 版本 |
|--------|------|
| Chrome | 54+ |
| Firefox | 38+ |
| Safari | 15.4+ |
| Edge | 79+ |

---

## 相關連結

- [MDN BroadcastChannel](https://developer.mozilla.org/zh-TW/docs/Web/API/BroadcastChannel)
- [MDN Web Workers API](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)

---

## 下一個範例

**#214 發布訂閱** - 實現更靈活的發布訂閱模式。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #213 - 廣播訊息
</p>
