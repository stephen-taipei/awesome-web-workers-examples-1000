# 排序效能測試 (Sorting Performance)

本範例展示在 Web Worker 中執行不同排序算法的效能，並體現時間複雜度的差異。

## 功能簡介

- **原生 Sort**：使用 JavaScript 引擎高度優化的 `Array.prototype.sort()` (通常是 Timsort 或 Merge Sort)。
- **快速排序 (Quick Sort)**：典型的 $O(n \log n)$ 算法。
- **泡沫排序 (Bubble Sort)**：典型的 $O(n^2)$ 算法，用於展示低效算法在大數據下的表現。

## 技術重點

- **Web Worker**：排序是 CPU 密集型操作。在主執行緒對百萬級陣列進行排序會導致 UI 完全凍結。Worker 確保了操作的流暢性。
- **TypedArray**：使用 `Float32Array` 以獲得比普通 JS 陣列更好的記憶體效能。

## 使用方式

1.  選擇「陣列大小」。
2.  點擊對應的排序按鈕。
3.  **注意**：對於大於 100,000 的陣列，泡沫排序會非常慢（可能需要數分鐘），請謹慎使用。
