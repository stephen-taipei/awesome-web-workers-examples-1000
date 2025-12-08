# 輪詢分配 (Round-robin) 負載均衡

本範例展示如何實作最基礎的負載均衡演算法：輪詢 (Round-robin)。

## 原理

輪詢演算法按照順序將任務依次分配給每個 Worker。
例如，如果有 3 個 Worker (A, B, C)，任務分配順序將是：
Task 1 -> A
Task 2 -> B
Task 3 -> C
Task 4 -> A
...以此類推。

## 特點

*   **優點**：實作簡單，確保任務分發數量的絕對公平。
*   **缺點**：不考慮 Worker 的實際負載或任務的執行時間差異。如果某些任務特別耗時，可能會導致某些 Worker 積壓大量工作，而其他 Worker 卻很閒。

## 實作細節

*   維護一個 `currentIndex` 指針。
*   每次分配任務時，選擇 `workers[currentIndex]`。
*   分配後更新指針：`currentIndex = (currentIndex + 1) % workers.length`。
