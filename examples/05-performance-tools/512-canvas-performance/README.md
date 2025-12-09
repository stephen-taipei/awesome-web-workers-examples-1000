# Canvas 效能測試 (Canvas Performance)

本範例展示使用 Web Worker (OffscreenCanvas) 與主執行緒 (Main Thread) 進行 Canvas 2D 渲染的效能差異。

## 功能簡介

- **大量物件繪製**：在 Canvas 上繪製數千個移動的矩形。
- **FPS 監控**：即時顯示每秒幀數。
- **OffscreenCanvas**：將 Canvas 的控制權轉移給 Web Worker，在後台線程進行渲染，避免阻塞主線程（UI）。

## 技術重點

1.  **OffscreenCanvas**：
    -   使用 `canvas.transferControlToOffscreen()` 獲取 OffscreenCanvas 對象。
    -   通過 `postMessage` 的第二個參數（Transferable Objects）將其傳遞給 Worker。
    -   Worker 中使用標準 Canvas API (`getContext('2d')`) 進行繪圖。

2.  **效能對比**：
    -   當物件數量極大時，主執行緒的渲染會導致 UI 卡頓（按鈕無響應等）。
    -   Worker 渲染則保持 UI 流暢，且在多核 CPU 上可能獲得更穩定的幀率。

## 使用方式

1.  設定「物件數量」。
2.  點擊「主執行緒渲染」觀察效能及 UI 響應性。
3.  **刷新頁面**（因為 Canvas 控制權轉移後無法收回）。
4.  點擊「Worker 渲染」觀察效能及 UI 響應性。
