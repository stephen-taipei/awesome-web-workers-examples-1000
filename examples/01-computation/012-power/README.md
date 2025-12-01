# #012 冪運算 (Power/Exponentiation)

> 使用 Web Worker 與快速冪算法計算大數冪運算

[![Difficulty: Beginner](https://img.shields.io/badge/難度-入門-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現大數冪運算，使用快速冪算法達到 O(log n) 的時間複雜度。

### 主要功能

- 計算任意整數的冪次（aⁿ）
- 2 的冪次專用計算與分析
- 批量冪運算
- 冪塔計算（a↑↑n）
- 比較快速冪與樸素算法的效能

---

## 快速冪算法

### 原理

傳統的冪運算需要 n 次乘法，時間複雜度為 O(n)。快速冪算法利用以下性質：

```
a^n = (a^(n/2))^2       當 n 為偶數
a^n = a * (a^(n/2))^2   當 n 為奇數
```

### 二進位指數法

將指數 n 表示為二進位，例如 n = 13 = 1101₂：

```
a^13 = a^(8+4+1) = a^8 * a^4 * a^1
```

只需要計算 a¹, a², a⁴, a⁸ 並相乘。

### 實作

```javascript
function fastPower(base, exp) {
    if (exp === 0n) return 1n;

    let result = 1n;
    let currentBase = base;

    while (exp > 0n) {
        // 如果當前位是 1，乘以當前底數
        if (exp & 1n) {
            result = result * currentBase;
        }
        // 底數平方
        currentBase = currentBase * currentBase;
        // 指數右移一位
        exp = exp >> 1n;
    }

    return result;
}
```

### 時間複雜度比較

| 方法 | 時間複雜度 | 計算 2¹⁰⁰⁰⁰ |
|------|------------|-------------|
| 樸素迭代 | O(n) | ~1000ms |
| 快速冪 | O(log n) | ~10ms |

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 快速冪（二進位指數） |
| **大數處理** | BigInt |
| **難度等級** | 入門 |

---

## 檔案結構

```
012-power/
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

訪問：`http://localhost:8000/examples/01-computation/012-power/`

### 操作說明

1. **基本計算**：輸入底數和指數，計算冪次
2. **2 的冪次**：專門計算並分析 2ⁿ
3. **批量計算**：每行一個 a^n 格式
4. **冪塔**：計算 a^a^a^...^a
5. **方法比較**：比較不同算法效能

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `CALCULATE` | 計算冪次 | `{ base, exponent }` |
| `POWER_OF_TWO` | 2 的冪次 | `{ exponent, showDigits }` |
| `CALCULATE_BATCH` | 批量計算 | `{ calculations }` |
| `TOWER` | 冪塔計算 | `{ base, height, maxDigits }` |
| `COMPARE_METHODS` | 比較方法 | `{ base, exponent }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `CALCULATE_RESULT` | 計算結果 |
| `POWER_OF_TWO_RESULT` | 2的冪次結果 |
| `BATCH_RESULT` | 批量結果 |
| `TOWER_RESULT` | 冪塔結果 |
| `COMPARE_RESULT` | 比較結果 |
| `ERROR` | 錯誤訊息 |

---

## 特殊功能

### 2 的冪次分析

計算 2ⁿ 時，提供額外分析：

- 二進位位數
- 十六進位位數
- 首位和末位數字
- 常見用途（如 2¹⁰ = 1KB）

### 冪塔計算

冪塔（Tetration）是重複的冪運算：

```
a↑↑1 = a
a↑↑2 = a^a
a↑↑3 = a^(a^a)
a↑↑4 = a^(a^(a^a))
```

例如：
```
2↑↑4 = 2^(2^(2^2)) = 2^(2^4) = 2^16 = 65536
3↑↑3 = 3^(3^3) = 3^27 = 7625597484987
```

---

## 效能數據

### 快速冪計算時間

| 計算 | 結果位數 | 時間 |
|------|----------|------|
| 2¹⁰⁰⁰ | 302 | <5ms |
| 2¹⁰⁰⁰⁰ | 3011 | ~20ms |
| 2¹⁰⁰⁰⁰⁰ | 30103 | ~500ms |
| 10¹⁰⁰⁰ | 1001 | ~10ms |

### 2 的冪次常見用途

| 指數 | 值 | 用途 |
|------|-----|------|
| 2⁸ | 256 | 1 Byte |
| 2¹⁰ | 1024 | 1 KB |
| 2¹⁶ | 65536 | 16位元上限 |
| 2²⁰ | ~100萬 | 1 MB |
| 2³⁰ | ~10億 | 1 GB |
| 2³² | ~43億 | 32位元定址 |
| 2⁶⁴ | ~1.8×10¹⁹ | 64位元定址 |

---

## 數學知識

### 冪運算規則

```
a^m × a^n = a^(m+n)
(a^m)^n = a^(m×n)
a^0 = 1 (a ≠ 0)
a^(-n) = 1/a^n
```

### 大數增長

冪運算是增長最快的基本運算之一：

```
加法：n + n = 2n
乘法：n × n = n²
冪運算：n^n
冪塔：n↑↑n
```

---

## 應用場景

1. **密碼學**：RSA 加密中的模冪運算
2. **電腦科學**：位元運算、記憶體定址
3. **數學計算**：大數運算
4. **金融**：複利計算
5. **物理學**：指數增長模型

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |
| ** 運算符 | 52+ | 52+ | 10.1+ | 14+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Exponentiation by squaring](https://en.wikipedia.org/wiki/Exponentiation_by_squaring)
- [BigInt - MDN](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [Tetration](https://en.wikipedia.org/wiki/Tetration)

---

## 相關範例

- **#009 平方根計算** - 高精度平方根
- **#010 立方根計算** - 高精度立方根
- **#011 N次方根** - 任意次方根
- **#013 模冪運算** - 密碼學應用

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #012 - 冪運算
</p>
