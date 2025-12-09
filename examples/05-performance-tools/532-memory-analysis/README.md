# 記憶體分析 (Memory Analysis)

這個範例展示了如何監控 Web Worker 的記憶體使用情況。

## 技術說明

*   **`performance.memory` API**: 這是一個非標準的 API，但在 Chrome 和 Edge 等基於 Chromium 的瀏覽器中廣泛可用。它提供了以下資訊：
    *   `jsHeapSizeLimit`: 記憶體限制。
    *   `totalJSHeapSize`: 已分配的總記憶體。
    *   `usedJSHeapSize`: 當前使用的記憶體。

*   **Fallback**: 對於不支援此 API 的瀏覽器（如 Firefox, Safari），此範例會回退到基於已知分配物件大小的模擬估算。

## 使用方法

1.  點擊「開始監控」。
2.  點擊「分配記憶體」來增加 Worker 的記憶體佔用。
3.  觀察圖表變化。
4.  點擊「釋放記憶體」來清空參照，等待下一次 GC 回收。
