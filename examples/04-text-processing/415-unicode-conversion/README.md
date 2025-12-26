# Unicode 轉換 (Unicode Converter)

這個範例展示了如何分析文本中每個字元的 Unicode 資訊。

## 資訊內容

*   **Char**: 字元本身 (支援 Emoji 等 Surrogate Pairs)。
*   **Code Point**: Unicode 碼點 (例如 U+1F44B)。
*   **UTF-16 (Hex)**: JavaScript 內部使用的 UTF-16 編碼單元 (例如 `\uD83D\uDC4B`)。
*   **HTML Entity**: 用於 HTML 的十進制實體編碼 (例如 `&#128075;`)。
*   **JS Escape**: JavaScript 字串轉義序列 (例如 `\u{1F44B}`)。

## 技術說明

使用 ES6 的 `for...of` 循環和 `codePointAt()` 方法來正確處理包含代理對 (Surrogate Pairs) 的 Unicode 字元。這些操作在 Web Worker 中執行，雖然對於短文本很快，但對於分析大量文本非常有用。
