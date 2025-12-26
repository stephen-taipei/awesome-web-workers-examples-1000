# WebGL 效能測試 (WebGL Performance)

本範例展示如何將 WebGL 渲染工作移至 Web Worker 中執行（使用 `OffscreenCanvas`），以釋放主執行緒並提升應用程序的響應能力。

## 功能簡介

- **WebGL 渲染**：在 Worker 中創建 WebGL 上下文，繪製大量隨機三角形。
- **效能監控**：計算並回報渲染幀率 (FPS)。

## 技術重點

1.  **OffscreenCanvas 與 WebGL**：
    -   `OffscreenCanvas` 完全支持 WebGL 上下文。
    -   所有 WebGL 初始化（Shader 編譯、Buffer 創建）和繪製命令（`drawArrays`）都在 Worker 線程中執行。

## 使用方式

1.  選擇「三角形數量」。
2.  點擊「啟動 WebGL Worker」。
3.  觀察 FPS 數值。
