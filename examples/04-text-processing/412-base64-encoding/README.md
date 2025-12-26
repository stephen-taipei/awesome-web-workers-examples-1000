# Base64 編解碼 (Base64 Encoding)

這個範例展示了如何在 Web Worker 中進行 Base64 編碼與解碼。

## 特點

*   **Unicode 支援**：標準的 `btoa` 和 `atob` 函數僅支援 ASCII (Latin1) 字元。此範例實作了 UTF-8 封裝，使得可以正確編碼和解碼包含中文、Emoji 等 Unicode 字元的文本。
*   **Web Worker**：將轉換過程放在 Worker 中，避免大文本轉換時阻塞 UI。

## 技術細節

*   **編碼**：先使用 `encodeURIComponent` 將 Unicode 字元轉換為 UTF-8 轉義序列，然後轉換為二進制字串，最後使用 `btoa`。
*   **解碼**：先使用 `atob` 還原為二進制字串，然後轉換為 UTF-8 轉義序列，最後使用 `decodeURIComponent`。
