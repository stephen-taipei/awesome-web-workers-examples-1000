# #219 流式傳輸 Streaming Transfer

## 概述

此範例展示如何使用 **Streams API** 在 Web Worker 中實現串流數據傳遞，適合處理大量數據的高效傳輸場景。

## 功能特點

- **串流傳輸**：使用 ReadableStream 進行數據串流
- **分塊傳輸**：將大數據分割成小區塊傳輸
- **即時進度**：顯示傳輸進度和速度
- **可中斷**：支援取消正在進行的傳輸
- **視覺化**：動態展示數據流動過程

## 技術重點

### ReadableStream 創建

```javascript
const stream = new ReadableStream({
    start(controller) {
        // 初始化
    },

    async pull(controller) {
        // 產生數據區塊
        const chunk = generateChunk(chunkSize);
        controller.enqueue(chunk);

        // 完成時關閉
        if (done) {
            controller.close();
        }
    },

    cancel(reason) {
        // 處理取消
    }
});
```

### Transferable 傳輸

```javascript
// 使用 Transferable 提高效能
const buffer = data.buffer.slice(0);
self.postMessage({
    type: 'STREAM_CHUNK',
    payload: { data: buffer, index, size }
}, [buffer]); // 傳輸 ownership
```

## 使用方式

1. **設定參數**：調整資料量、區塊大小和延遲時間
2. **開始傳輸**：點擊「開始串流傳輸」
3. **觀察進度**：查看進度條和傳輸統計
4. **查看視覺化**：觀察數據流動動畫
5. **取消傳輸**：可隨時點擊「取消傳輸」中斷

## 檔案結構

```
219-streaming-transfer/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件
```

## Worker 通訊協議

### 主執行緒 → Worker

```javascript
// 開始串流
{ type: 'START_STREAM', payload: { dataSize, chunkSize, delay } }

// 取消串流
{ type: 'CANCEL_STREAM' }
```

### Worker → 主執行緒

```javascript
// 進度更新
{ type: 'STREAM_PROGRESS', payload: { transferredBytes, totalBytes, chunkIndex, totalChunks, progress, speed } }

// 區塊數據 (Transferable)
{ type: 'STREAM_CHUNK', payload: { data, index, size } }

// 傳輸完成
{ type: 'STREAM_COMPLETE', payload: { totalBytes, totalChunks, duration, speed } }

// 傳輸取消
{ type: 'STREAM_CANCELLED', payload: {} }
```

## 串流傳輸 vs 一次性傳輸

| 特性 | 串流傳輸 | 一次性傳輸 |
|------|----------|------------|
| 記憶體使用 | 低 (只需區塊大小) | 高 (需要完整數據) |
| 開始處理時間 | 立即 | 需等待全部完成 |
| 可中斷性 | 支援 | 困難 |
| 進度追蹤 | 精確 | 有限 |
| 適用場景 | 大檔案、即時處理 | 小數據、簡單傳輸 |

## 應用場景

1. **大檔案處理**：處理 GB 級別的檔案而不耗盡記憶體
2. **即時數據處理**：邊接收邊處理數據
3. **漸進式載入**：逐步顯示處理結果
4. **網路傳輸**：配合 fetch API 進行串流下載
5. **視訊/音訊處理**：處理媒體串流

## 效能優化

### 區塊大小建議

| 場景 | 建議區塊大小 |
|------|--------------|
| 低延遲需求 | 1-4 KB |
| 平衡效能 | 8-16 KB |
| 高吞吐量 | 32-64 KB |

### Transferable 物件

使用 Transferable 可以零拷貝傳輸數據：

```javascript
// 傳統複製 (慢)
postMessage({ data: arrayBuffer });

// Transferable (快)
postMessage({ data: arrayBuffer }, [arrayBuffer]);
```

## 瀏覽器支援

Streams API 需要以下瀏覽器版本：

- Chrome 52+
- Edge 79+
- Firefox 65+
- Safari 10.1+

## 注意事項

- ⚠️ Transferable Streams 支援有限，本範例使用手動區塊傳輸
- ⚠️ 傳輸後的 ArrayBuffer 將變為不可用 (ownership 轉移)
- ✅ 適合大數據量場景
- ✅ 可配合 BackPressure 機制控制流量

## 相關資源

- [Streams API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [ReadableStream - MDN](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [Transferable Objects - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [Using Readable Streams - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
