# Worker 通訊效能測試 (Worker Communication Performance)

本範例用於基準測試主執行緒與 Web Worker 之間的訊息傳遞效能。

## 功能簡介

- **RTT 測量**：測量訊息發送至 Worker 並接收回應的往返時間 (Round-Trip Time)。
- **吞吐量計算**：根據訊息大小和傳輸時間計算資料吞吐量 (MB/s)。

## 技術重點

- **postMessage**：測試標準結構化克隆 (Structured Clone) 的開銷。當傳遞大型 ArrayBuffer 時，如果不使用 Transferable Objects，瀏覽器需要複製數據，這會產生顯著的開銷。

## 使用方式

1.  選擇「訊息大小」。
2.  選擇「迭代次數」。
3.  點擊「開始測試」。
4.  查看結果數據。
