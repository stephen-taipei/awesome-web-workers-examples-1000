# Full Text Index (全文索引)

Web Worker Example #436

## 簡介

本範例展示如何使用 Web Worker 建立和查詢倒排索引 (Inverted Index)，這是搜尋引擎的核心技術。

## 功能

*   **倒排索引構建**: 解析文檔內容，建立 單詞 -> 文檔ID 的映射。
*   **布林搜尋 (AND)**: 支援多關鍵字搜尋，返回包含所有關鍵字的文檔。
*   **即時搜尋**: 在 Worker 中進行搜尋，確保主執行緒流暢。

## 使用方式

1.  在 "Documents" 區域輸入 JSON 格式的文檔陣列。
2.  點擊 "Build Inverted Index" 建立索引。
3.  在搜尋框輸入關鍵字（例如 "fox dog"），點擊 "Search"。
