# 閒置 Worker 回收 (Idle Worker Reclaim)

此示例展示如何實作一個能夠自動回收閒置資源的 Worker 池。

## 功能說明

1.  **動態創建 Worker**: 當有新任務且沒有閒置 Worker 時，系統會自動創建新的 Worker。
2.  **閒置狀態追蹤**: 每個 Worker 都會記錄最後一次完成任務的時間 (`lastUsed`)。
3.  **定期檢查**: 系統透過 `setInterval` 定期檢查所有 Worker 的狀態。
4.  **自動回收**: 如果 Worker 閒置時間超過設定的閾值 (`idleTimeout`)，該 Worker 會被 `terminate()` 並從池中移除。
5.  **視覺化監控**: 介面即時顯示每個 Worker 的狀態（活躍/閒置）以及閒置時間。

## 使用方式

1.  開啟 `index.html`。
2.  點擊「新增任務」或「新增一批任務」按鈕來模擬負載。
3.  觀察 Worker 被創建並執行任務。
4.  任務完成後，Worker 進入閒置狀態。
5.  觀察閒置時間計數器。
6.  當閒置時間超過設定值（預設 3000ms），Worker 會被自動回收。
7.  你可以調整「閒置逾時」和「檢查間隔」參數並點擊「更新設定」來測試不同行為。

## 技術重點

*   **Worker Pool Pattern**: 管理一組 Worker 的生命週期。
*   **Resource Management**: 及時釋放不再使用的資源，避免記憶體洩漏或過度佔用。
*   **Timer Based Cleanup**: 使用 `setInterval` 進行週期性的資源清理。
