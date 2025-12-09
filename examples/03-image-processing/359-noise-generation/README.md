# 噪點生成 (Noise Generation)

本範例展示如何使用 Web Worker 生成程序化噪聲（Procedural Noise），包括 Perlin Noise 和 Value Noise。

## 功能簡介

- **噪聲生成**：
    -   **Perlin Noise**：經典的梯度噪聲，具有平滑、自然的特徵，常用於生成地形、雲層等紋理。
    -   **Value Noise**：基於晶格點的隨機值進行插值，計算量較小但塊狀感較強。
- **參數調整**：
    -   可調整圖像的寬高。
    -   可調整噪聲的縮放比例（Scale），控制噪聲的頻率。

## 技術重點

1.  **程序化生成 (Procedural Generation)**：
    -   不依賴外部圖片，完全通過算法生成紋理。
    -   Perlin Noise 實現：包含排列表（Permutation Table）、梯度計算（Gradient）、緩動函數（Fade function）和線性插值（Lerp）。
    -   Value Noise 實現：網格隨機值生成與平滑插值（Smoothstep）。

2.  **Web Worker 運算**：
    -   生成 $2048 \times 2048$ 的噪聲圖涉及數百萬次浮點運算，在主執行緒執行會導致 UI 凍結。
    -   Web Worker 在後台並行計算，並能定期回報進度。

## 使用方式

1.  開啟網頁。
2.  調整「寬度」和「高度」設定生成圖片的尺寸。
3.  調整「縮放」控制噪聲的粗細。
4.  選擇「噪聲類型」。
5.  點擊「生成噪聲」按鈕。
6.  生成完成後可下載圖片。
