# INI 解析器 (INI Parser)

這個範例展示了如何在 Web Worker 中解析 INI 配置檔案格式並將其轉換為 JSON 對象。

## 支援格式

*   區段 (Sections): `[section]`
*   鍵值對 (Key-Value): `key = value`
*   註解 (Comments): `; comment` 或 `# comment`
*   基本類型自動轉換 (數字, 布林值)

## 技術說明

使用正則表達式和字串處理函數逐行解析 INI 文本。
