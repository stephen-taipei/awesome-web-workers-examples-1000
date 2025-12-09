# 抄襲檢測 (Plagiarism Detection)

本範例展示如何使用 Web Worker 檢測兩段文本之間的抄襲可能性（相似度）。

## 功能簡介

- **N-gram Shingling**：將文本分割為連續的 N 個單詞的序列（Shingles）。這種方法能夠捕捉到文本的局部結構和語序，比單詞頻率（Bag of Words）更能抵抗簡單的單詞替換或重排。
- **Jaccard 相似度**：計算兩個 Shingle 集合的交集與並集的比率。

## 技術重點

1.  **Shingling 算法**：
    -   例如句子 "A B C D"，N=2 的 shingles 為 {"A B", "B C", "C D"}。
    -   如果另一句子為 "A B X D"，shingles 為 {"A B", "B X", "X D"}。
    -   相似度 = 1/5 = 0.2。

2.  **Web Worker**：
    -   對於長文檔，生成大量的 Shingles 並計算集合交集是計算密集型操作，適合在 Worker 中執行。

## 使用方式

1.  在兩個文本框中輸入需要比較的文本（例如原創文章和可疑文章）。
2.  調整 N-gram 大小（N 值越大，對連續匹配的要求越嚴格，相似度通常越低）。
3.  點擊「開始檢測」按鈕，查看抄襲可能性百分比。
