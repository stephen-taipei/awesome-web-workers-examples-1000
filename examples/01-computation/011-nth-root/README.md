# #011 N 次方根計算 (Nth Root Calculator)

> 使用 Web Worker 計算任意次方根，支援高精度運算

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-進階-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現任意次方根計算，是平方根和立方根的通用化版本。

### 主要功能

- 計算任意正整數次方根（2次、3次、4次...n次）
- 支援負數的奇數次方根
- 批量計算多個數字的同一次方根
- 產生同一數字的方根表格
- 比較牛頓法與二分法的效能

---

## 數學原理

### N 次方根定義

```
ⁿ√x = x^(1/n)

對於 x ≥ 0 和正整數 n：
求 y 使得 y^n = x
```

### 牛頓迭代法

對於求解 f(y) = yⁿ - x = 0：

```
y_{k+1} = y_k - f(y_k) / f'(y_k)
        = y_k - (y_k^n - x) / (n * y_k^(n-1))
        = ((n-1) * y_k + x / y_k^(n-1)) / n
```

### 特殊情況

| 次數 | 符號 | 說明 |
|------|------|------|
| n=2 | √x | 平方根 |
| n=3 | ∛x | 立方根 |
| n=4 | ∜x | 四次方根 |
| n≥5 | ⁿ√x | N 次方根 |

---

## 負數處理

| 次數 | 負數支援 | 原因 |
|------|----------|------|
| 偶數 | ❌ | y² = -x 無實數解 |
| 奇數 | ✓ | y³ = -x 有實數解 -∛x |

```javascript
// 奇數次方根可以處理負數
∛(-8) = -2   // 因為 (-2)³ = -8
⁵√(-32) = -2 // 因為 (-2)⁵ = -32

// 偶數次方根無法處理負數
√(-4) = undefined  // 在實數範圍
⁴√(-16) = undefined
```

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 牛頓迭代法、二分搜尋 |
| **大數處理** | BigInt |
| **負數支援** | 僅奇數次方根 |
| **難度等級** | 進階 |

---

## 檔案結構

```
011-nth-root/
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

訪問：`http://localhost:8000/examples/01-computation/011-nth-root/`

### 操作說明

1. **單一計算**：輸入數字、次數和精度，計算方根
2. **批量計算**：計算多個數字的同一次方根
3. **方根表格**：產生同一數字的 2~n 次方根表
4. **方法比較**：比較牛頓法與二分法效能

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `CALCULATE` | 計算單一 | `{ number, n, precision }` |
| `CALCULATE_BATCH` | 批量計算 | `{ numbers, n, precision }` |
| `VERIFY` | 驗證結果 | `{ number, n, precision }` |
| `COMPARE_METHODS` | 比較方法 | `{ number, n, precision }` |
| `CALCULATE_TABLE` | 方根表格 | `{ number, maxN, precision }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `CALCULATE_RESULT` | 計算結果 |
| `BATCH_RESULT` | 批量結果 |
| `VERIFY_RESULT` | 驗證結果 |
| `COMPARE_RESULT` | 比較結果 |
| `TABLE_RESULT` | 表格結果 |
| `ERROR` | 錯誤訊息 |

---

## 實作重點

### 通用牛頓迭代

```javascript
// x_{k+1} = ((n-1) * x_k + S / x_k^(n-1)) / n
function newtonNthRoot(S, n, precision) {
    let x = initialGuess(S, n);
    const nBig = BigInt(n);
    const nMinus1 = nBig - 1n;

    while (!converged) {
        // 計算 x^(n-1)
        let xPowNMinus1 = x;
        for (let i = 1n; i < nMinus1; i++) {
            xPowNMinus1 = (xPowNMinus1 * x) / scale;
        }

        // 牛頓更新
        const quotient = (S * scale) / xPowNMinus1;
        x = (nMinus1 * x + quotient) / nBig;
    }

    return x;
}
```

### 負數處理

```javascript
function calculateNthRoot(number, n) {
    const isNegative = number < 0;

    // 檢查是否為奇數次方根
    if (isNegative && n % 2 === 0) {
        throw new Error('負數的偶數次方根未定義');
    }

    // 計算絕對值的方根
    const result = newtonNthRoot(Math.abs(number), n);

    // 負數的奇數次方根是負的
    return isNegative ? -result : result;
}
```

---

## 效能數據

### 不同次數的迭代次數（1000位精度）

| 次數 n | 牛頓法迭代 | 二分法迭代 |
|--------|------------|------------|
| 2 | ~11 | ~3300 |
| 3 | ~12 | ~3300 |
| 5 | ~14 | ~3300 |
| 10 | ~16 | ~3300 |
| 20 | ~18 | ~3300 |

### 計算時間（100位精度）

| 次數 n | 時間 |
|--------|------|
| 2 | ~5ms |
| 5 | ~8ms |
| 10 | ~12ms |
| 20 | ~18ms |

---

## 常見 N 次方根

### ⁵√2（五次方根）

```
⁵√2 ≈ 1.14869835499703500679862694677792758944385088909780...
```

### ¹⁰√10（十次方根）

```
¹⁰√10 ≈ 1.25892541179416721042395410639580060609361740946693...
```

### ¹²√2（十二次方根）

```
¹²√2 ≈ 1.05946309435929526456182529494634170077920431749419...
```

這個值在音樂中很重要：平均律中相鄰半音的頻率比！

---

## 應用場景

1. **數學計算**：任意精度數值運算
2. **音樂理論**：計算音階頻率比（¹²√2）
3. **幾何計算**：N 維立方體的邊長
4. **金融計算**：複利率逆運算
5. **物理學**：維度分析
6. **統計學**：幾何平均數

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Nth root - Wikipedia](https://en.wikipedia.org/wiki/Nth_root)
- [Newton's Method](https://en.wikipedia.org/wiki/Newton%27s_method)

---

## 相關範例

- **#009 平方根計算** - 高精度平方根
- **#010 立方根計算** - 高精度立方根
- **#012 冪運算** - 大數冪運算

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #011 - N 次方根計算
</p>
