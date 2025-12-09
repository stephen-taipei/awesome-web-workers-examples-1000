# Worker 健康檢查 (Worker Health Check)

此示例展示如何實作 Worker 的健康檢查機制 (Heartbeat)，以確保 Worker 正常運作並能回應請求。

## 功能說明

1.  **心跳機制 (Heartbeat)**: 主執行緒定期 (每 2 秒) 發送 `ping` 訊息給 Worker。
2.  **回應檢測**: Worker 收到 `ping` 後必須回應 `pong`。
3.  **逾時判定**: 如果主執行緒在發送 `ping` 後超過一定時間 (1 秒) 未收到 `pong`，或者長時間未收到任何 `pong`，則將 Worker 標記為 `unhealthy`。
4.  **異常模擬**:
    *   **模擬凍結**: 發送指令讓 Worker 進入 `while` 迴圈 5 秒，期間無法處理任何訊息（包括心跳回應），導致狀態變為 `unhealthy`。當迴圈結束後，Worker 恢復回應，狀態變回 `healthy`。
    *   **模擬崩潰**: 讓 Worker 拋出未捕獲的錯誤，觸發 `onerror` 事件，狀態變為 `dead`。
5.  **生命週期管理**: 支援手動終止 Worker。

## 使用方式

1.  開啟 `index.html`。
2.  點擊「新增 Worker」可以增加監控對象。
3.  **測試凍結**: 點擊 Worker 卡片上的「模擬凍結 (5s)」。
    *   觀察日誌：發送凍結指令。
    *   觀察狀態：幾秒後，因為沒有收到心跳回應，狀態會變為紅色 (Unhealthy)。
    *   等待 5 秒後，Worker 恢復，發送解凍訊息和心跳回應，狀態變回綠色 (Healthy)。
4.  **測試崩潰**: 點擊「模擬崩潰」。
    *   Worker 拋出錯誤，被主執行緒捕獲。
    *   狀態變為灰色 (Dead)，心跳停止。
5.  **手動終止**: 點擊「終止」直接銷毀 Worker。

## 技術重點

*   **Heartbeat Protocol**: 應用層的心跳協議設計。
*   **Event Loop Blocking**: 展示長時間同步任務如何阻塞 Worker 的訊息處理。
*   **Error Handling**: 使用 `worker.onerror` 捕獲 Worker 內部的未捕獲異常。
