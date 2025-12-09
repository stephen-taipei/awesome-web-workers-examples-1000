# 傳輸效能測試 (Transferable Objects Performance)

本範例比較在 Web Workers 中使用標準結構化克隆 (Structured Clone) 與可轉移對象 (Transferable Objects) 傳遞大數據時的效能差異。

## 功能簡介

- **結構化克隆 (Clone)**：瀏覽器會完全複製數據。對於大數據（如 100MB ArrayBuffer），這會消耗大量時間和內存。
- **可轉移對象 (Transfer)**：瀏覽器轉移數據的所有權。這是一個零拷貝 (Zero-copy) 操作，速度極快，但主執行緒在轉移後將無法再訪問該數據。

## 技術重點

- **`postMessage(data, [transferables])`**：postMessage 的第二個參數用於指定要轉移的對象數組（如 ArrayBuffer, MessagePort, ImageBitmap）。

## 使用方式

1.  選擇「數據大小」。
2.  點擊「測試複製」查看耗時。
3.  點擊「測試轉移」查看耗時。
