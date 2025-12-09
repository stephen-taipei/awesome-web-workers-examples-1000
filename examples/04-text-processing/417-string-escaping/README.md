# 字串轉義 (String Escaping)

本示例展示了如何使用 Web Workers 處理字串的轉義 (Escape) 與反轉義 (Unescape)。

## 功能特點

1.  **轉義 (Escape)**:
    - 將換行符 `\n`、製表符 `\t`、引號 `"` 等特殊字符轉換為轉義序列（如 `\n`, `\t`, `\"`）。
    - 方便將多行文本複製到 JSON 或程式碼字串中。
    - 使用 `JSON.stringify` 實現標準轉義。

2.  **反轉義 (Unescape)**:
    - 將包含轉義序列的字串還原為原始文本。
    - 支援標準 JSON 轉義序列。
    - 包含回退機制處理簡單的非標準轉義。

## 技術實現

- **JSON API**: 利用 `JSON.stringify` 和 `JSON.parse` 進行可靠的轉義處理。
- **正則回退**: 當 `JSON.parse` 失敗時（例如輸入格式不嚴格符合 JSON 字串規範），使用正則表達式進行手動替換。
