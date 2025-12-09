# 資源感知負載均衡 (Resource Aware Load Balancing)

此示例演示如何實現基於資源感知 (Resource Aware) 的負載均衡策略。這在異構環境或任務資源需求差異巨大的場景中非常重要。

## 功能

1.  **多維資源模擬**：模擬了 CPU 和 Memory 兩種資源維度。
2.  **異構 Worker**：不同的 Worker 擁有不同的資源容量（如：強算力/大內存 vs 弱算力/小內存）。
3.  **多樣化任務**：可以提交不同規格的任務（小型、中型、大型、巨型），每種任務消耗的資源不同。
4.  **資源感知調度**：
    - 在分配任務前，會檢查 Worker 是否有足夠的剩餘資源。
    - 如果所有 Worker 資源不足，任務將被拒絕（模擬背壓或丟包）。
    - 優先選擇資源餘裕度（Balance）最好的 Worker，避免單一維度資源耗盡。

## 算法說明

調度器維護每個 Worker 的狀態：
- $Capacity_{cpu}, Capacity_{mem}$：總容量
- $Used_{cpu}, Used_{mem}$：已使用量

當新任務到達，需求為 $Req_{cpu}, Req_{mem}$：

1. **過濾階段**：找出滿足條件的 Worker 集合 $S$：
   $S = \{ w \in Workers \mid (Capacity_{cpu} - Used_{cpu} \ge Req_{cpu}) \land (Capacity_{mem} - Used_{mem} \ge Req_{mem}) \}$

2. **評分階段**：對 $S$ 中的每個 Worker 計算分數，選擇分數最高的。
   這裡使用「最小資源剩餘率最大化」策略：
   $Ratio_{cpu} = \frac{Capacity_{cpu} - Used_{cpu}}{Capacity_{cpu}}$
   $Ratio_{mem} = \frac{Capacity_{mem} - Used_{mem}}{Capacity_{mem}}$
   $Score = \min(Ratio_{cpu}, Ratio_{mem})$

   這個分數代表了該節點最瓶頸資源的剩餘比例。選擇分數最高的節點可以確保資源使用最均衡，延後瓶頸出現的時間。

## 使用方式

1.  觀察 Worker 卡片，注意它們的總容量（Total）是不同的。
2.  選擇 "任務消耗資源" 的類型（例如：Medium, Large）。
3.  點擊 "提交任務"，觀察資源條的增長。
4.  嘗試提交 "巨型 (Huge)" 任務，這可能需要大容量的 Worker 才能處理。
5.  開啟 "自動產生任務"，觀察系統如何填滿各個 Worker，以及當資源耗盡時出現的 "拒絕任務" 警告。
