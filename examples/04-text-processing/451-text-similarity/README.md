# 相似度計算 (Text Similarity)

本範例展示如何使用 Web Worker 計算兩段文本之間的相似度。

## 功能簡介

- **Jaccard 相似度**：基於詞彙集合的重疊程度。計算公式：$ J(A, B) = \frac{|A \cap B|}{|A \cup B|} $。
- **餘弦相似度 (Cosine Similarity)**：基於詞頻向量的夾角餘弦值。計算公式：$ \text{cosine}(\mathbf{A}, \mathbf{B}) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|} $。

## 技術重點

1.  **分詞 (Tokenization)**：
    -   將文本轉換為小寫，移除標點符號，並按空白切分為單詞數組。

2.  **向量化 (Vectorization)**：
    -   對於餘弦相似度，需要構建詞彙表並將每段文本轉換為詞頻向量。

3.  **Web Worker**：
    -   雖然對於短文本計算很快，但對於長文檔或大量比較，這些 $O(N)$ 或 $O(N \times M)$ 的操作應在後台進行。

## 使用方式

1.  在兩個文本框中分別輸入文本。
2.  點擊「計算相似度」按鈕。
3.  查看兩種算法計算出的相似度百分比。
