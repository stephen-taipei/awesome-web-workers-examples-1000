# #008 梅森質數搜尋器 (Mersenne Prime Searcher)

> 使用 Web Worker 與 Lucas-Lehmer 測試搜尋梅森質數

[![Difficulty: Advanced](https://img.shields.io/badge/難度-高級-red.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現 Lucas-Lehmer 測試來驗證梅森質數，這是一個計算密集型的高級範例。

### 主要功能

- 使用 Lucas-Lehmer 測試驗證梅森數
- 搜尋指定範圍內的梅森質數
- 列出已知的梅森質數
- 計算並顯示梅森數
- 尋找梅森數的小因數
- 支援 BigInt 大數運算

---

## 梅森質數介紹

### 定義

**梅森數** (Mersenne Number) 是形如 M_p = 2^p - 1 的數。

**梅森質數** (Mersenne Prime) 是指當 p 為質數且 M_p 也是質數時的梅森數。

```
M₂ = 2² - 1 = 3         ✓ 質數
M₃ = 2³ - 1 = 7         ✓ 質數
M₅ = 2⁵ - 1 = 31        ✓ 質數
M₇ = 2⁷ - 1 = 127       ✓ 質數
M₁₁ = 2¹¹ - 1 = 2047 = 23 × 89  ✗ 合數
M₁₃ = 2¹³ - 1 = 8191    ✓ 質數
```

### 必要條件

若 M_p = 2^p - 1 是質數，則 **p 必須是質數**（但反之不成立）。

證明：若 p = ab（合數），則 2^p - 1 = (2^a)^b - 1 可被 2^a - 1 整除。

---

## Lucas-Lehmer 測試

### 演算法

對於 p > 2，M_p = 2^p - 1 是質數當且僅當：

```
S₀ = 4
Sₙ = (Sₙ₋₁² - 2) mod M_p
```

**M_p 是質數 ⟺ S_{p-2} ≡ 0 (mod M_p)**

### 範例：測試 M₅ = 31

```
p = 5, M₅ = 31

S₀ = 4
S₁ = (4² - 2) mod 31 = 14
S₂ = (14² - 2) mod 31 = 194 mod 31 = 8
S₃ = (8² - 2) mod 31 = 62 mod 31 = 0

S₃ = S_{5-2} = 0 ✓

結論：M₅ = 31 是梅森質數
```

### 實作

```javascript
function lucasLehmerTest(p) {
    if (p === 2) return true;
    if (!isPrime(p)) return false;

    const mp = (1n << BigInt(p)) - 1n;  // M_p = 2^p - 1
    let s = 4n;

    for (let i = 0; i < p - 2; i++) {
        s = ((s * s) - 2n) % mp;
    }

    return s === 0n;
}
```

### 複雜度

- **時間複雜度**：O(p² × log p) 或 O(p³) 取決於乘法實作
- **空間複雜度**：O(p) 儲存 M_p

---

## 已知梅森質數

### 前 15 個梅森質數

| # | 指數 p | M_p 位數 | 發現年份 | 發現者 |
|---|--------|----------|----------|--------|
| 1 | 2 | 1 | 古代 | - |
| 2 | 3 | 1 | 古代 | - |
| 3 | 5 | 2 | 古代 | - |
| 4 | 7 | 3 | 古代 | - |
| 5 | 13 | 4 | 1456 | 匿名 |
| 6 | 17 | 6 | 1588 | Cataldi |
| 7 | 19 | 6 | 1588 | Cataldi |
| 8 | 31 | 10 | 1772 | Euler |
| 9 | 61 | 19 | 1883 | Pervushin |
| 10 | 89 | 27 | 1911 | Powers |
| 11 | 107 | 33 | 1914 | Powers |
| 12 | 127 | 39 | 1876 | Lucas |
| 13 | 521 | 157 | 1952 | Robinson |
| 14 | 607 | 183 | 1952 | Robinson |
| 15 | 1279 | 386 | 1952 | Robinson |

### 目前紀錄

截至 2024 年，已發現 **51 個**梅森質數。

最大的梅森質數是 **M₈₂₅₈₉₉₃₃**，有 **24,862,048** 位數！

---

## 與完美數的關係

### 歐幾里得-歐拉定理

若 M_p = 2^p - 1 是梅森質數，則：

```
2^(p-1) × (2^p - 1)
```

是完美數。反之，每個偶完美數都具有此形式。

### 範例

| 梅森質數 | 對應完美數 |
|----------|------------|
| M₂ = 3 | 2¹ × 3 = 6 |
| M₃ = 7 | 2² × 7 = 28 |
| M₅ = 31 | 2⁴ × 31 = 496 |
| M₇ = 127 | 2⁶ × 127 = 8128 |

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | Lucas-Lehmer 測試 |
| **大數處理** | BigInt |
| **時間複雜度** | O(p² log p) |
| **難度等級** | 高級 |

---

## 檔案結構

```
008-mersenne-prime/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件
```

---

## 使用方式

### 本地運行

```bash
npx serve .
# 或
python -m http.server 8000
```

訪問：`http://localhost:8000/examples/01-computation/008-mersenne-prime/`

### 操作說明

1. **Lucas-Lehmer 測試**：輸入指數 p，測試 M_p 是否為質數
2. **詳細驗證**：顯示完整的測試過程和因數資訊
3. **計算梅森數**：計算並顯示 2^p - 1 的值
4. **範圍搜尋**：搜尋指定範圍內的所有梅森質數
5. **已知列表**：列出歷史上發現的梅森質數

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `TEST_SINGLE` | 測試單一指數 | `{ exponent }` |
| `SEARCH_RANGE` | 範圍搜尋 | `{ start, end }` |
| `LIST_KNOWN` | 列出已知 | `{ limit }` |
| `VERIFY_MERSENNE` | 詳細驗證 | `{ exponent }` |
| `CALCULATE_MERSENNE` | 計算梅森數 | `{ exponent }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `SINGLE_RESULT` | 單一測試結果 |
| `SEARCH_RESULT` | 搜尋結果 |
| `KNOWN_RESULT` | 已知列表 |
| `VERIFY_RESULT` | 驗證結果 |
| `CALCULATE_RESULT` | 計算結果 |
| `ERROR` | 錯誤訊息 |

---

## 效能數據

### Lucas-Lehmer 測試耗時

| 指數 p | M_p 位數 | 測試耗時 |
|--------|----------|----------|
| 31 | 10 | <1ms |
| 127 | 39 | ~5ms |
| 521 | 157 | ~50ms |
| 1279 | 386 | ~500ms |
| 2281 | 687 | ~2s |
| 3217 | 969 | ~5s |

### 注意事項

- 大指數 (>5000) 的測試可能需要較長時間
- 瀏覽器可能對長時間運算有限制
- 建議使用「停止」按鈕中斷過長的計算

---

## GIMPS 專案

**GIMPS** (Great Internet Mersenne Prime Search) 是一個全球分散式運算專案，專門搜尋新的梅森質數。

- 網站：https://www.mersenne.org/
- 使用軟體：Prime95
- 已發現多個世界紀錄的梅森質數
- 任何人都可以參與並有機會發現新的梅森質數！

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [梅森質數 - 維基百科](https://zh.wikipedia.org/wiki/梅森素数)
- [Lucas-Lehmer test - Wikipedia](https://en.wikipedia.org/wiki/Lucas%E2%80%93Lehmer_primality_test)
- [GIMPS 官網](https://www.mersenne.org/)

---

## 相關範例

- **#001 質數產生器** - 基礎質數生成
- **#007 完美數檢測** - 與梅森質數相關
- **#006 質因數分解** - 分解梅森合數

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #008 - 梅森質數搜尋器
</p>
