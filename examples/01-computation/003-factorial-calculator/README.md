# #003 階乘計算器 (Factorial Calculator)

> 使用 Web Worker 計算大數階乘，支援記憶化快取與雙階乘

[![Difficulty: Beginner](https://img.shields.io/badge/難度-初級-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 計算大數階乘，並利用記憶化技術加速重複計算。

### 主要功能

- 計算單一階乘 N! (支援 N 最大到 100,000)
- 計算範圍內的連續階乘 (1! 到 N!)
- 計算雙階乘 N!!
- 記憶化快取加速重複計算
- 顯示末尾零個數與數字位數
- 即時進度回報與中斷功能

---

## 階乘介紹

### 定義

階乘是一個基本的數學運算，定義如下：

```
0! = 1 (約定)
N! = N × (N-1) × (N-2) × ... × 2 × 1, N >= 1
```

### 範例

```
0! = 1
1! = 1
5! = 5 × 4 × 3 × 2 × 1 = 120
10! = 3,628,800
20! = 2,432,902,008,176,640,000
```

### 增長速度

階乘增長極快，這是指數級增長的典型例子：

| N | N! | 位數 |
|---|-----|------|
| 10 | 3,628,800 | 7 |
| 20 | 2.43 × 10^18 | 19 |
| 100 | 9.33 × 10^157 | 158 |
| 1,000 | 4.02 × 10^2567 | 2,568 |
| 10,000 | 2.85 × 10^35659 | 35,660 |

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **大數處理** | BigInt |
| **優化技術** | 記憶化快取 |
| **時間複雜度** | O(n) |
| **難度等級** | 初級 |

---

## 檔案結構

```
003-factorial-calculator/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 使用方式

### 本地運行

```bash
# 使用 Node.js
npx serve .

# 或使用 Python
python -m http.server 8000
```

訪問：`http://localhost:8000/examples/01-computation/003-factorial-calculator/`

### 操作說明

1. **計算單一階乘**：輸入 N 值，點擊「計算 N!」
2. **計算範圍階乘**：輸入起始和結束值，點擊「計算範圍階乘」
3. **計算雙階乘**：輸入 N 值，點擊「計算雙階乘」

---

## 演算法說明

### 迭代法

最直接的方法，從 1 乘到 N：

```javascript
function factorial(n) {
    if (n === 0 || n === 1) return 1n;

    let result = 1n;
    for (let i = 2; i <= n; i++) {
        result *= BigInt(i);
    }
    return result;
}
```

### 記憶化優化

儲存中間結果，加速後續計算：

```javascript
const cache = new Map();

function factorialWithCache(n) {
    if (cache.has(n)) return cache.get(n);

    // 找到最近的已快取值
    let startN = 0, startValue = 1n;
    for (let i = n - 1; i >= 0; i--) {
        if (cache.has(i)) {
            startN = i;
            startValue = cache.get(i);
            break;
        }
    }

    // 從已快取值繼續計算
    let result = startValue;
    for (let i = startN + 1; i <= n; i++) {
        result *= BigInt(i);
        if (i % 100 === 0) cache.set(i, result);
    }

    return result;
}
```

### 雙階乘

雙階乘只乘以相同奇偶性的數：

```javascript
function doubleFactorial(n) {
    let result = 1n;
    for (let i = n; i > 0; i -= 2) {
        result *= BigInt(i);
    }
    return result;
}
```

---

## Worker 通訊模式

### 訊息格式

```javascript
{
    type: string,    // 訊息類型
    payload: any     // 訊息內容
}
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `START` | 計算單一階乘 | `{ n: number, useCache: boolean }` |
| `CALCULATE_RANGE` | 計算範圍階乘 | `{ start: number, end: number }` |
| `CALCULATE_DOUBLE` | 計算雙階乘 | `{ n: number }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent, message }` |
| `RESULT` | 單一階乘結果 | `{ n, value, digits, trailingZeros, duration, cached }` |
| `RANGE_RESULT` | 範圍結果 | `{ results[], count, duration }` |
| `DOUBLE_FACTORIAL_RESULT` | 雙階乘結果 | `{ n, value, digits, duration }` |
| `ERROR` | 錯誤訊息 | `{ message }` |

---

## 末尾零計算

N! 的末尾零個數由因子 10 的個數決定，而 10 = 2 × 5。由於因子 2 總是比因子 5 多，所以只需計算因子 5 的個數。

### 公式

```
末尾零個數 = ⌊N/5⌋ + ⌊N/25⌋ + ⌊N/125⌋ + ⌊N/625⌋ + ...
```

### 範例

```
10! 的末尾零 = ⌊10/5⌋ = 2
100! 的末尾零 = ⌊100/5⌋ + ⌊100/25⌋ = 20 + 4 = 24
1000! 的末尾零 = 200 + 40 + 8 + 1 = 249
```

---

## 效能數據

### 計算時間 (參考值)

| N | 位數 | 末尾零 | 首次計算 | 快取後 |
|---|------|--------|----------|--------|
| 100 | 158 | 24 | ~1ms | <1ms |
| 1,000 | 2,568 | 249 | ~5ms | <1ms |
| 10,000 | 35,660 | 2,499 | ~150ms | ~10ms |
| 50,000 | 213,237 | 12,499 | ~2s | ~500ms |
| 100,000 | 456,574 | 24,999 | ~8s | ~2s |

### 記憶化優勢

- **首次計算**：完整執行 O(n) 迭代
- **快取命中**：直接返回，O(1)
- **部分命中**：從最近快取值繼續計算

---

## 數學趣味

### 斯特靈公式

估計 N! 的近似值：

```
N! ≈ √(2πN) × (N/e)^N
```

位數估計：

```
log10(N!) ≈ N × log10(N/e) + 0.5 × log10(2πN)
```

### 階乘的應用

1. **排列組合**：N! 表示 N 個不同物品的排列方式數
2. **機率論**：計算各種機率分布
3. **泰勒展開**：e^x = Σ(x^n / n!)
4. **組合數學**：C(n,k) = n! / (k! × (n-k)!)

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [MDN - BigInt](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [階乘 - 維基百科](https://zh.wikipedia.org/wiki/階乘)
- [斯特靈公式 - 維基百科](https://zh.wikipedia.org/wiki/斯特靈公式)

---

## 下一個範例

**#004 最大公因數 (GCD Calculator)** - 使用 Web Worker 批量計算最大公因數，展示歐幾里得算法。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #003 - 階乘計算器
</p>
