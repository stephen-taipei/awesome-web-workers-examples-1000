# Language Detection

此示例展示了如何使用 Web Worker 進行語言檢測。

## 技術原理

本示例使用混合方法來識別語言：

1.  **Unicode 範圍檢測**：
    *   對於非拉丁語系（如中文、日文、韓文、俄文、阿拉伯文），檢測其特有的 Unicode 字元範圍。
    *   例如，日文平假名/片假名 (U+3040-30FF) 的出現是日語的強烈信號。

2.  **N-gram (Trigram) 統計**：
    *   對於拉丁語系（如英文、法文、西班牙文等），使用字符三元組 (Trigram) 頻率分析。
    *   例如，英文中常見 "the", "and", "ing"；德文中常見 "der", "und", "sch"。
    *   計算輸入文本的高頻 Trigram 與預定義語言配置檔 (Profiles) 的重疊程度。

## 適用場景

*   自動翻譯
*   內容分類
*   拼寫檢查前的語言設定

## 支援語言

*   English (en)
*   French (fr)
*   German (de)
*   Spanish (es)
*   Italian (it)
*   Dutch (nl)
*   Portuguese (pt)
*   Russian (ru)
*   Chinese (zh)
*   Japanese (ja)
*   Korean (ko)
*   Arabic (ar)
