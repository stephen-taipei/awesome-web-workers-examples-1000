# 日誌解析器 (Log Parser)

這個範例展示了如何在 Web Worker 中使用正則表達式解析伺服器訪問日誌（如 Apache 或 Nginx 的 Common/Combined Log Format）。

## 支援格式

*   **Common Log Format (CLF)**: `host ident authuser [date] "request" status bytes`
*   **Combined Log Format**: 包含 Referer 和 User-Agent。

## 使用場景

分析大型日誌文件時（例如統計訪問量、狀態碼分佈），在客戶端進行初步解析可以減輕伺服器負擔，並提供即時反饋。
