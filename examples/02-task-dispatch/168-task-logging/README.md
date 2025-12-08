# 任務日誌 (Task Logging)

此範例展示如何將 Web Worker 中執行的任務日誌回傳到主執行緒並顯示。

## 功能

- 在 Web Worker 中執行多個模擬任務。
- Worker 將執行過程中的日誌（Info, Warn, Error）即時發送回主執行緒。
- 主執行緒接收日誌並以格式化的方式顯示在介面上。

## 使用方式

1. 點擊 "Start Tasks" 按鈕開始執行任務。
2. 觀察下方日誌區域的輸出。
3. 點擊 "Clear Logs" 清除日誌。

## 技術重點

- **postMessage**: 用於 Worker 與主執行緒之間的通訊，傳遞日誌物件。
- **日誌結構**: 日誌包含時間戳記、層級（Info/Warn/Error）與訊息內容。
