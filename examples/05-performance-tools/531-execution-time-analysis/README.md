# 執行時間分析 (Execution Time Analysis)

這個範例展示了如何通過手動或半自動的 **Instrumentation (插樁)** 技術，在 Web Worker 內部對函數執行時間進行分析。

## 原理

1.  **Profiler 物件**：維護一個記錄表，儲存每個函數的呼叫次數和總執行時間。
2.  **Wrap 函數**：創建一個高階函數 (Higher-Order Function)，它在呼叫原始函數前後分別記錄 `performance.now()`，並更新統計數據。
3.  **應用**：將業務邏輯函數替換為 Wrap 後的版本。

## 使用場景

當你需要找出 Web Worker 中哪個具體函數佔用了最多時間，但又無法使用瀏覽器 DevTools 的 Profiler 時（例如在生產環境或自動化測試中），這種輕量級的 Profiling 非常有用。
