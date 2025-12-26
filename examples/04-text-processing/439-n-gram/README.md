# N-gram Extraction (N-gram 提取)

Web Worker Example #439

## 簡介

本範例展示如何使用 Web Worker 提取文本中的 N-gram 並計算其出現頻率。N-gram 是指文本中連續出現的 N 個項目（可以是字元或單詞），廣泛應用於自然語言處理、語言模型和文本分析中。

## 功能

*   **單詞 N-gram**: 分析連續的 N 個單詞（例如 "to be or" 是 3-gram）。
*   **字元 N-gram**: 分析連續的 N 個字元。
*   **頻率統計**: 計算每個 N-gram 在文本中出現的次數並排序。

## 使用方式

1.  在 "Text to Analyze" 區域輸入或貼上要分析的文本。
2.  調整 "N" (Gram Size) 滑桿，設定 N 的值。
3.  選擇 "Type" (類型) 為單詞或字元。
4.  點擊 "Extract N-grams" 按鈕。
