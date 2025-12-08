# 160. 任務取消 (Task Cancellation)

本範例展示如何結合 `AbortController` 與 Web Workers 來實作可取消的非同步任務。

## 功能說明

- 啟動一個耗時的 Web Worker 計算任務。
- 使用 `AbortController` API 在主執行緒發送取消信號。
- 監聽 `abort` 事件並使用 `worker.terminate()` 強制終止 Worker。
- 使用 `Promise` 包裝 Worker 操作，使其符合現代非同步程式設計模式。

## 技術重點

1.  **AbortController**: 用於控制 DOM 請求 (如 fetch) 的標準 API，也可用於自定義非同步任務。
2.  **worker.terminate()**: 立即停止 Worker 執行緒的方法，是取消 CPU 密集型任務最可靠的方式。
3.  **Promise包裝**: 將事件驅動的 Worker 通訊轉換為 Promise，方便使用 `async/await`。

## 使用方式

1. 設定任務預計執行時間。
2. 點擊「開始任務」。
3. 在任務完成前，點擊「取消任務」即可中斷執行。
