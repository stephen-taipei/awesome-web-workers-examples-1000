# URL 解析器 (URL Parser)

這個範例展示了如何在 Web Worker 中批量解析 URL。

## 技術說明

使用瀏覽器原生的 `URL` API 進行解析。這比使用正則表達式更準確且更強健，能夠處理各種 URL 格式和邊緣情況（如 IPv6 地址、預設端口、相對路徑等）。

## 輸出資訊

*   Protocol (協議)
*   Host (主機，含端口)
*   Hostname (主機名)
*   Port (端口)
*   Pathname (路徑)
*   Search (查詢字串)
*   Hash (錨點)
*   Params (解析後的查詢參數物件)
