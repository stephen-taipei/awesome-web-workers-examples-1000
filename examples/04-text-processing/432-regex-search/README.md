# Regex Search (正則表達式搜尋)

Web Worker Example #432

## 簡介

本範例展示如何使用 Web Worker 進行正則表達式搜尋。在處理大量文本或複雜的正則表達式時，在主執行緒中執行可能會導致 UI 卡頓。將搜尋任務移至 Worker 可以確保應用的流暢性。

## 功能

*   **正則表達式支援**: 支援所有 JavaScript 標準 RegExp 語法。
*   **Flag 配置**: 支援 Global (g), Ignore Case (i), Multiline (m) 等標誌。
*   **結果列表**: 顯示匹配的文本及其在原文中的索引位置。

## 使用方式

1.  在 "Content to Search" 輸入框中輸入或貼上要搜尋的文本。
2.  在 "Regex Pattern" 輸入框中輸入正則表達式（無需前後斜線）。
3.  勾選所需的標誌（如 Global）。
4.  點擊 "Search" 按鈕。
