# 優雅關閉 (Graceful Shutdown)

此範例展示如何優雅地關閉 Web Worker，確保正在執行的任務完成後才終止。

## 功能

- **開始任務**: 啟動一個模擬的長時間執行任務。
- **優雅關閉**: 發送關閉信號。如果 Worker 閒置，它會立即清理並關閉；如果正在執行任務，它會等待任務完成後再執行清理與關閉流程。
- **強制關閉**: 立即終止 Worker，不等待任務完成或清理 (模擬 `worker.terminate()`)。

## 使用方式

1. 點擊 "Start Long Task" 開始一個耗時 3 秒的任務。
2. 在任務執行期間，點擊 "Graceful Shutdown"。
3. 觀察 Log，Worker 會顯示 "Waiting for current task to finish..."，待任務完成後才執行 Cleanup 並關閉。
4. 若在閒置時點擊 "Graceful Shutdown"，則會立即執行清理並關閉。
5. "Force Kill" 則會立即停止所有動作。

## 技術重點

- **狀態旗標**: Worker 內部使用 `isShuttingDown` 旗標來拒絕新任務。
- **任務追蹤**: 追蹤 `activeTask` 狀態，判斷是否需要等待。
- **清理流程**: 在關閉前執行必要的資源釋放或資料保存 (模擬)。
- **自我關閉**: Worker 完成清理後呼叫 `close()` 自我終止，並通知主執行緒。
