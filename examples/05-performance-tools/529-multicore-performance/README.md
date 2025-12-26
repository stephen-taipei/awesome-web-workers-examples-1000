# 多核效能測試 (Multi-core Performance)

這個範例展示了並行運算對效能的影響。通過將計算任務（尋找質數）分配給不同數量的 Web Workers，我們可以觀察到加速比 (Speedup) 的變化。

## 觀察重點

1.  **加速比 (Speedup)**：理想情況下，使用 N 個 Worker 應該比 1 個 Worker 快 N 倍。但由於任務分配開銷、通訊延遲以及硬體資源爭用，實際加速比通常小於 N。
2.  **硬體限制**：當 Worker 數量超過 CPU 的邏輯核心數 (`navigator.hardwareConcurrency`) 時，效能提升通常會停滯甚至下降，因為過多的 Context Switching 會消耗資源。
3.  **瀏覽器限制**：瀏覽器通常對並行 Worker 的資源分配有自己的調度策略。

## 技術說明

*   **Task Partitioning**: 將大的數值範圍分割成多個區塊，每個 Worker 負責一個區塊。
*   **Sequential Execution**: 為了準確測量每個配置的耗時，我們依序執行 1 Worker, 2 Workers 等測試案例。
