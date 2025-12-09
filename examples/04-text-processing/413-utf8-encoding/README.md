# UTF-8 編解碼 (UTF-8 Encoding)

這個範例展示了如何使用 `TextEncoder` 和 `TextDecoder` 在 Web Worker 中進行 UTF-8 編碼與解碼。

## 功能

*   **編碼 (Encode)**：將任意 Unicode 文本轉換為 UTF-8 位元組序列，並以十六進制 (Hex) 格式顯示。
*   **解碼 (Decode)**：將十六進制格式的 UTF-8 位元組序列還原為文本。

## 技術說明

使用瀏覽器原生的 `TextEncoder` (總是使用 UTF-8) 和 `TextDecoder` API。這些 API 在 Web Worker 環境中完全支援。
