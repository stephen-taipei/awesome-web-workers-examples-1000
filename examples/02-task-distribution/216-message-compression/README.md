# #216 訊息壓縮 Message Compression

## 概述

此範例展示如何使用 **CompressionStream API** 在 Web Worker 中實現訊息自動壓縮傳輸，減少數據傳輸量並提高效能。

## 功能特點

- **自動壓縮**：使用 CompressionStream 對訊息進行壓縮
- **多種演算法**：支援 GZIP、Deflate、Deflate-Raw 三種壓縮演算法
- **即時統計**：顯示原始大小、壓縮後大小、壓縮率和處理時間
- **視覺化比較**：以進度條形式直觀展示壓縮效果
- **效能比較**：一鍵比較不同演算法的壓縮效能

## 技術重點

### CompressionStream API

```javascript
// 壓縮數據
async function compressData(data, algorithm) {
    const cs = new CompressionStream(algorithm);
    const readableStream = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        }
    });
    const compressedStream = readableStream.pipeThrough(cs);
    // 讀取壓縮後的數據...
}

// 解壓縮數據
async function decompressData(data, algorithm) {
    const ds = new DecompressionStream(algorithm);
    const readableStream = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        }
    });
    const decompressedStream = readableStream.pipeThrough(ds);
    // 讀取解壓縮後的數據...
}
```

### 支援的壓縮演算法

| 演算法 | 說明 | 適用場景 |
|--------|------|----------|
| `gzip` | 最常用的壓縮格式，壓縮率高 | 通用壓縮 |
| `deflate` | 不含標頭的壓縮格式 | 自定義協議 |
| `deflate-raw` | 原始 deflate 串流 | 底層協議 |

## 使用方式

1. **輸入訊息**：在文字區域輸入要傳輸的內容，或選擇預設範例
2. **選擇演算法**：選擇要使用的壓縮演算法
3. **壓縮傳送**：點擊「壓縮並傳送」按鈕進行壓縮
4. **查看結果**：觀察壓縮統計和視覺化比較
5. **解壓縮**：可選擇解壓縮還原原始數據
6. **效能比較**：點擊「效能比較」一次測試所有演算法

## 檔案結構

```
216-message-compression/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件
```

## Worker 通訊協議

### 主執行緒 → Worker

```javascript
// 壓縮請求
{ type: 'COMPRESS', payload: { data: string, algorithm: string } }

// 解壓縮請求
{ type: 'DECOMPRESS', payload: { data: number[], algorithm: string } }

// 效能比較請求
{ type: 'COMPARE', payload: { data: string } }
```

### Worker → 主執行緒

```javascript
// 壓縮結果
{ type: 'COMPRESS_RESULT', payload: { originalSize, compressedSize, ratio, duration, compressedData, algorithm } }

// 解壓縮結果
{ type: 'DECOMPRESS_RESULT', payload: { compressedSize, decompressedSize, duration, decompressedText, algorithm } }

// 比較結果
{ type: 'COMPARE_RESULT', payload: { originalSize, results: [...] } }

// 日誌訊息
{ type: 'LOG', payload: { level, message, timestamp } }

// 錯誤訊息
{ type: 'ERROR', payload: { message } }
```

## 瀏覽器支援

CompressionStream API 需要以下瀏覽器版本：

- Chrome 80+
- Edge 80+
- Firefox 113+
- Safari 16.4+

## 應用場景

1. **大量文字傳輸**：減少 Worker 與主執行緒間的數據傳輸量
2. **JSON 數據壓縮**：壓縮 API 回應數據
3. **日誌數據處理**：壓縮大量日誌資料
4. **離線數據儲存**：減少 IndexedDB 或 localStorage 的儲存空間

## 效能考量

- 壓縮/解壓縮操作在 Worker 中執行，不阻塞主執行緒
- 對於小型數據（< 1KB），壓縮可能不會帶來顯著優勢
- 重複性高的數據壓縮效果更好
- JSON 格式通常比純文字有更好的壓縮率

## 相關資源

- [CompressionStream API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)
- [DecompressionStream API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream)
- [Streams API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
