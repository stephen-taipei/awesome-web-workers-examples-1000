# 壓縮效能測試 (Compression Performance)

本範例展示使用 Web Worker 結合 Compression Streams API 進行數據壓縮。

## 功能簡介

- **GZIP 壓縮**：使用瀏覽器原生的 `CompressionStream` 對 ArrayBuffer 進行 GZIP 壓縮。

## 技術重點

- **Compression Streams API**：允許 JavaScript 訪問瀏覽器的壓縮引擎，比 JS 實現的壓縮庫（如 pako）更高效且體積更小。
- **Streaming**：雖然此範例處理的是單個 ArrayBuffer，但 Streams API 實際上支持流式處理，適合處理超大文件。

## 使用方式

1.  選擇「數據大小」。
2.  點擊「測試 GZIP 壓縮」。
3.  查看壓縮前後的大小及耗時。
