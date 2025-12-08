# #212 雙向通訊 (Bi-directional Communication)

> 使用 Promise 包裝器實現 Web Worker 的請求-回應通訊模式

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Communication](https://img.shields.io/badge/分類-通訊協調-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 **Promise 包裝器** 建立一個可靠的雙向通訊機制，讓 Web Worker 通訊更像傳統的函數呼叫。

### 主要功能

- 每個請求都有唯一 ID，確保回應正確匹配
- 使用 Promise 讓非同步呼叫更直覺
- 支援超時處理和錯誤處理
- 可同時發送多個請求，各自獨立等待結果
- 完整的請求生命週期追蹤

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | Request-Response Pattern |
| **核心技術** | Promise Wrapper |
| **超時處理** | 支援 |
| **並行請求** | 支援 |
| **難度等級** | 中級 |

---

## 檔案結構

```
212-bidirectional-communication/
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

2. 開啟瀏覽器訪問：`http://localhost:8000/examples/02-task-distribution/212-bidirectional-communication/`

### 操作說明

1. **單一請求**：輸入數字並點擊「發送請求」計算平方
2. **延遲請求**：測試模擬耗時操作的請求
3. **批量請求**：同時發送多個並行請求
4. **超時測試**：測試請求超時處理機制

---

## Worker 通訊模式

### 請求格式

```javascript
{
    requestId: number,    // 唯一請求 ID
    action: string,       // 請求動作
    data: any            // 請求資料
}
```

### 回應格式

```javascript
// 成功回應
{
    requestId: number,    // 對應的請求 ID
    success: true,
    data: any            // 回應資料
}

// 失敗回應
{
    requestId: number,
    success: false,
    error: string        // 錯誤訊息
}
```

### 支援的動作

| 動作 | 說明 | 輸入 | 輸出 |
|------|------|------|------|
| `SQUARE` | 計算平方 | `{ number }` | `{ result, original }` |
| `DELAYED_RESPONSE` | 延遲回應 | `{ delay }` | `{ message, completedAt }` |
| `FACTORIAL` | 計算階乘 | `{ number }` | `{ result, original }` |
| `RANDOM` | 隨機數生成 | `{ min, max, count }` | `{ numbers, min, max, count }` |

---

## 程式碼範例

### Promise 包裝器實現

```javascript
// 待處理請求的 Map
const pendingRequests = new Map();
let requestIdCounter = 0;

/**
 * 發送請求給 Worker 並返回 Promise
 */
function sendRequest(action, data, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const requestId = ++requestIdCounter;

        // 設定超時
        const timeoutId = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error(`請求超時 (ID: ${requestId})`));
            }
        }, timeout);

        // 儲存待處理請求
        pendingRequests.set(requestId, { resolve, reject, timeoutId });

        // 發送請求
        worker.postMessage({ requestId, action, data });
    });
}

// 處理回應
worker.onmessage = (event) => {
    const { requestId, success, data, error } = event.data;
    const pending = pendingRequests.get(requestId);

    if (pending) {
        clearTimeout(pending.timeoutId);
        pendingRequests.delete(requestId);

        if (success) {
            pending.resolve(data);
        } else {
            pending.reject(new Error(error));
        }
    }
};
```

### 使用範例

```javascript
// 單一請求
const result = await sendRequest('SQUARE', { number: 7 });
console.log(result); // { result: 49, original: 7 }

// 並行請求
const results = await Promise.all([
    sendRequest('SQUARE', { number: 1 }),
    sendRequest('SQUARE', { number: 2 }),
    sendRequest('SQUARE', { number: 3 })
]);

// 超時處理
try {
    await sendRequest('DELAYED_RESPONSE', { delay: 5000 }, 3000);
} catch (error) {
    console.log('請求超時');
}
```

### Worker 內部處理

```javascript
self.onmessage = function(event) {
    const { requestId, action, data } = event.data;

    switch (action) {
        case 'SQUARE':
            const result = data.number * data.number;
            self.postMessage({
                requestId,
                success: true,
                data: { result, original: data.number }
            });
            break;
        // ... 其他動作
    }
};
```

---

## 效能考量

### 優點

1. **可靠性**：每個請求都能追蹤並正確匹配回應
2. **可讀性**：使用 async/await 讓程式碼更直覺
3. **錯誤處理**：內建超時和錯誤處理機制
4. **並行支援**：可同時發送多個請求

### 注意事項

1. **記憶體**：大量未完成請求會佔用記憶體
2. **超時設定**：應根據實際需求調整超時時間
3. **請求數量**：避免同時發送過多請求

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
- [MDN Promise](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN postMessage](https://developer.mozilla.org/zh-TW/docs/Web/API/Worker/postMessage)

---

## 下一個範例

**#213 廣播訊息** - 使用 BroadcastChannel API 實現一對多的訊息廣播。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #212 - 雙向通訊
</p>
