# 加權輪詢負載均衡 (Weighted Round Robin)

此示例演示如何使用加權輪詢算法 (Weighted Round Robin, WRR) 在多個 Web Worker 之間分配任務。

## 功能

1.  **加權分配**：可以為每個 Worker 配置不同的權重。
2.  **平滑輪詢**：實現了 Nginx 的平滑加權輪詢算法 (Smooth Weighted Round-Robin)，確保任務在短時間內也能均勻分佈，避免連續分配給高權重節點。
3.  **視覺化監控**：即時顯示每個 Worker 的狀態、已處理任務數和當前動態權重。
4.  **自動任務生成**：模擬持續的任務流。

## 算法說明 (Smooth Weighted Round-Robin)

對於每個 Worker $i$：
- `weight`: 配置的固定權重
- `current_weight`: 當前動態權重，初始化為 0
- `effective_weight`: 有效權重，通常等於 `weight`

每次選擇 Worker 時：
1. 更新所有 Worker 的 `current_weight`：`current_weight += effective_weight`
2. 累加所有 `effective_weight` 為 `total_weight`
3. 選擇 `current_weight` 最大的 Worker
4. 將選中的 Worker 的 `current_weight` 減去 `total_weight`：`current_weight -= total_weight`

這種算法可以保證：
- 每個 Worker 被選中的次數與其權重成正比。
- 任務分佈比較平滑，不會出現高權重 Worker 連續執行的情況。

## 使用方式

1.  在 "Worker 配置" 區域調整每個 Worker 的權重，然後點擊 "更新權重"。
2.  點擊 "提交新任務" 手動分配任務。
3.  點擊 "自動產生任務" 開啟/關閉自動任務流。
4.  觀察 Worker 卡片上的 "當前動態權重" 變化，理解算法運作。
