# 最少連接 (Least Connections) 負載均衡

本範例展示如何實作最少連接 (Least Connections) 負載均衡策略。

## 原理

最少連接演算法動態監控每個 Worker 當前正在處理的任務數量（活躍連接數），並將新任務分配給當前最閒的 Worker。

## 特點

*   **優點**：非常適合任務處理時間差異很大的場景。它能確保 Worker 不會因為處理長任務而積壓過多工作，同時讓處理快任務的 Worker 能分擔更多負載。
*   **缺點**：實作相對複雜，需要維護每個 Worker 的即時狀態計數。

## 實作細節

*   主執行緒維護每個 Worker 物件的 `activeTasks` 計數器。
*   分配任務時：`activeTasks++`。
*   Worker 完成任務回報時：`activeTasks--`。
*   選擇 Worker 時：遍歷所有 Worker，找到 `activeTasks` 最小的那一個。

## 觀察重點

試著提交幾個長時間任務，然後開啟自動模擬流量。你會發現長任務的 Worker 不會被分配新任務，直到其他 Worker 的負載也趕上來為止，這展現了極佳的動態平衡能力。
