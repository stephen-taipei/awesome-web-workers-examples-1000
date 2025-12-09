# 詞性標註 (POS Tagging)

本範例展示如何使用 Web Worker 實現一個基於規則的簡易英文詞性標註器 (Part-of-Speech Tagger)。

## 功能簡介

- **規則標註**：
    -   **字典查詢 (Lexicon Lookup)**：優先查找常見單詞的詞性（如 "the" -> DT, "dog" -> NN）。
    -   **後綴規則 (Suffix Rules)**：根據單詞的結尾推斷詞性（如 "-ing" -> VBG, "-ly" -> RB）。
    -   **啟發式規則 (Heuristics)**：如數字識別為 CD，大寫單詞識別為 NNP。

## 技術重點

1.  **Web Worker**：
    -   NLP 任務通常涉及大量的文本掃描和匹配，將標註邏輯移至 Worker 可以避免長文本處理時阻塞主執行緒。

2.  **標註集 (Tagset)**：
    -   使用簡化的 Penn Treebank 標籤集：
        -   **NN**: Noun (名詞)
        -   **VB/VBD/VBG**: Verb (動詞)
        -   **JJ**: Adjective (形容詞)
        -   **RB**: Adverb (副詞)
        -   **DT**: Determiner (限定詞)
        -   **IN**: Preposition (介系詞)
        -   **PRP**: Pronoun (代名詞)

## 使用方式

1.  在文本框中輸入英文句子。
2.  點擊「開始標註」按鈕。
3.  結果將顯示每個單詞下方的詞性標籤。
