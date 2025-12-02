# #009 平方根計算 (Square Root Calculator)

> 使用 Web Worker 與牛頓迭代法計算高精度平方根

[![Difficulty: Beginner](https://img.shields.io/badge/難度-入門-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現高精度平方根計算，使用牛頓迭代法（巴比倫法）進行計算。

### 主要功能

- 計算任意正數的平方根
- 支援自定義精度（最高 10000 位小數）
- 批量計算多個數字的平方根
- 驗證計算結果的準確性
- 比較不同演算法的效能
- 顯示迭代過程細節

---

## 牛頓迭代法

### 原理

牛頓迭代法（Newton's Method）又稱巴比倫法（Babylonian Method），是一種用於求解方程式近似解的數值方法。

對於平方根計算，我們要找到 x 使得 x² = S，即求解 f(x) = x² - S = 0。

### 迭代公式

```
x_{n+1} = (x_n + S/x_n) / 2
```

這個公式可以理解為：**取當前猜測值與商的平均值**。

### 收斂性

牛頓法具有**二次收斂**特性，意味著：
- 每次迭代後，正確的有效位數大約加倍
- 計算 1000 位精度只需約 10 次迭代

### 範例：計算 √2

```
初始猜測：x₀ = 1

x₁ = (1 + 2/1) / 2 = 1.5
x₂ = (1.5 + 2/1.5) / 2 = 1.416666...
x₃ = (1.416666 + 2/1.416666) / 2 = 1.414215...
x₄ = 1.41421356237...

√2 ≈ 1.41421356237309504880168872420969807856967187537694...
```

---

## 其他演算法

### 二分搜尋法

```javascript
function binarySqrt(S) {
    let low = 0, high = Math.max(1, S);
    while (high - low > epsilon) {
        let mid = (low + high) / 2;
        if (mid * mid < S) low = mid;
        else high = mid;
    }
    return (low + high) / 2;
}
```

- **優點**：簡單、穩定
- **缺點**：收斂較慢（線性）

### 數位逐位法

逐位確定結果的每一位數字，類似長除法。

- **優點**：直觀、精確控制位數
- **缺點**：效率較低

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 牛頓迭代法 |
| **大數處理** | BigInt |
| **收斂速度** | 二次收斂 |
| **難度等級** | 入門 |

---

## 檔案結構

```
009-square-root/
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

訪問：`http://localhost:8000/examples/01-computation/009-square-root/`

### 操作說明

1. **單一計算**：輸入數字和精度，點擊「計算平方根」
2. **驗證結果**：將結果平方後與原數比較
3. **批量計算**：輸入多個數字（逗號分隔），一次計算
4. **方法比較**：比較三種演算法的效能差異

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `CALCULATE` | 計算單一數字 | `{ number, precision }` |
| `CALCULATE_BATCH` | 批量計算 | `{ numbers, precision }` |
| `VERIFY` | 驗證結果 | `{ number, precision }` |
| `COMPARE_METHODS` | 比較方法 | `{ number, precision }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `CALCULATE_RESULT` | 計算結果 |
| `BATCH_RESULT` | 批量結果 |
| `VERIFY_RESULT` | 驗證結果 |
| `COMPARE_RESULT` | 比較結果 |
| `ERROR` | 錯誤訊息 |

---

## 實作重點

### BigInt 高精度計算

```javascript
// 使用 BigInt 進行定點數運算
const scale = BigInt(10) ** BigInt(precision);
const S = stringToBigInt(numStr, precision);

// 牛頓迭代
let x = initialGuess;
while (!converged) {
    x = (x + (S * scale) / x) / 2n;
}
```

### 收斂判定

```javascript
// 當連續兩次迭代結果相同時停止
if (newX === prevX || newX === x) {
    break;
}
```

---

## 效能數據

### 牛頓法計算耗時

| 精度（位） | 迭代次數 | 計算時間 |
|------------|----------|----------|
| 100 | ~8 | <10ms |
| 500 | ~10 | <50ms |
| 1000 | ~11 | ~100ms |
| 5000 | ~14 | ~1s |
| 10000 | ~15 | ~5s |

### 方法比較（1000位精度）

| 方法 | 迭代次數 | 時間 |
|------|----------|------|
| 牛頓法 | ~11 | ~100ms |
| 二分法 | ~3300 | ~500ms |
| 逐位法 | ~1000 | ~800ms |

---

## 著名的平方根

| 數字 | 平方根（前50位） |
|------|------------------|
| √2 | 1.41421356237309504880168872420969807856967187537694 |
| √3 | 1.73205080756887729352744634150587236694280525381038 |
| √5 | 2.23606797749978969640917366873127623544061835961152 |
| √10 | 3.16227766016837933199889354443271853371955513932521 |

### 黃金比例

```
φ = (1 + √5) / 2 ≈ 1.618033988749894848204586834365638117720309179805762862135...
```

---

## 應用場景

1. **數學計算**：高精度數值運算
2. **密碼學**：大數開方運算
3. **科學計算**：物理模擬、統計分析
4. **金融計算**：風險評估、波動率計算
5. **教育目的**：演示數值方法

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Newton's Method - Wikipedia](https://en.wikipedia.org/wiki/Newton%27s_method)
- [Methods of computing square roots](https://en.wikipedia.org/wiki/Methods_of_computing_square_roots)
- [BigInt - MDN](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/BigInt)

---

## 相關範例

- **#010 立方根計算** - 高精度立方根
- **#011 N次方根** - 任意次方根計算
- **#012 冪運算** - 大數冪運算

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #009 - 平方根計算
</p>
