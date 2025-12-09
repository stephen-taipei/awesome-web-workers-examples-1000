# 預熱機制 (Warm-up Mechanism)

此範例比較了 Web Worker 在「冷啟動 (Cold Start)」與「預熱 (Warm-up)」模式下的效能差異。

## 功能

- **冷啟動測試**: 建立 Worker 並立即發送任務。Worker 需先執行耗時的初始化（模擬載入資源或模型）才能處理任務，導致高延遲。
- **預熱測試**: 提前建立 Worker 並發送初始化指令。待 Worker 準備就緒後，再發送任務，此時能立即回應。

## 使用方式

1. **Cold Start**: 點擊 "Test Cold Start"。觀察 Latency，通常包含約 1000ms 的初始化時間。
2. **Warm Up**:
   - 點擊 "Warm Up Worker"。Worker 開始初始化（模擬耗時操作）。
   - 待 Status 變為 "Ready"（綠色）。
   - 點擊 "Test Warm Start"。觀察 Latency，應顯著低於 Cold Start（接近 0ms + 傳輸時間）。

## 技術重點

- **預先初始化**: 在實際任務需求到達前，先行載入 Worker 並執行初始化邏輯。
- **狀態通知**: Worker 完成初始化後發送 `ready` 訊息通知主執行緒。
- **延遲優化**: 透過預熱消除使用者等待時間，提升應用程式回應速度。
