# 圖片品質評估 (Image Quality Assessment)

這個範例展示了如何使用 Web Worker 進行圖片品質評估。我們計算幾個關鍵指標來估算圖片的感知品質：

1.  **銳利度 (Sharpness)**：使用拉普拉斯運算子的變異數 (Variance of Laplacian) 來衡量。變異數越高，表示圖片邊緣越清晰。
2.  **對比度 (Contrast)**：使用像素亮度的標準差 (RMS Contrast) 來衡量。
3.  **亮度 (Brightness)**：平均像素亮度。

## 技術重點

*   **Web Worker**：將密集的像素運算（遍歷所有像素計算統計量和卷積）移至背景執行緒，避免阻塞 UI。
*   **Transferable Objects**：使用 `ArrayBuffer` 轉移權限，避免大圖片數據的複製開銷。
*   **像素操作**：直接操作 `Uint8ClampedArray` 進行灰階轉換和卷積運算。

## 評分邏輯

綜合評分是一個啟發式算法，結合了上述三個指標：
*   50% 權重給銳利度
*   30% 權重給對比度
*   20% 權重給亮度適中度

這是一個無參考 (No-Reference) 的品質評估簡化實作。
