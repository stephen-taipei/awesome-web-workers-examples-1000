# 查詢字串解析器 (Query String Parser)

這個範例展示了如何在 Web Worker 中解析 URL 查詢字串。

## 功能

*   標準解析：`key=value` -> `{key: "value"}`
*   陣列支援：`key=a&key=b` -> `{key: ["a", "b"]}`
*   巢狀支援：`user[name]=John` -> `{user: {name: "John"}}` (類似 PHP/Rails 的約定)
*   多行輸入：自動將換行視為 `&` 連接符，方便從不同來源複製參數。

## 技術說明

使用 `URLSearchParams` 進行基礎解析，然後透過自定義邏輯處理陣列和巢狀結構。
