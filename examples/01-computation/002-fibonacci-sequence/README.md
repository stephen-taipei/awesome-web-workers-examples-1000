# #002 費波那契數列 (Fibonacci Sequence)

> 使用 Web Worker 計算費波那契數列，支援多種演算法與效能比較

[![Difficulty: Beginner](https://img.shields.io/badge/難度-初級-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 計算費波那契數列，並比較不同演算法的效能差異。

### 主要功能

- 計算第 N 個費波那契數 (支援 N 最大到 100,000)
- 計算前 N 項費波那契數列
- 三種演算法效能比較：迭代法、矩陣快速冪、記憶化
- 使用 BigInt 支援超大數字計算
- 即時進度回報與中斷功能

---

## 費波那契數列介紹

### 定義

費波那契數列是一個經典的數列，定義如下：

```
F(0) = 0
F(1) = 1
F(n) = F(n-1) + F(n-2), n >= 2
```

### 數列範例

```
n:    0  1  2  3  4  5  6   7   8   9  10  11   12   13 ...
F(n): 0  1  1  2  3  5  8  13  21  34  55  89  144  233 ...
```

### 黃金比例

費波那契數列與黃金比例 (Golden Ratio) 密切相關：

```
φ = (1 + √5) / 2 ≈ 1.6180339887...

lim(n→∞) F(n+1) / F(n) = φ
```

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **大數處理** | BigInt |
| **演算法** | 迭代法 / 矩陣快速冪 / 記憶化 |
| **難度等級** | 初級 |

---

## 檔案結構

```
002-fibonacci-sequence/
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

訪問：`http://localhost:8000/examples/01-computation/002-fibonacci-sequence/`

### 操作說明

1. **計算單一值**：輸入 N 值，選擇演算法，點擊「計算 F(N)」
2. **計算數列**：輸入項數，點擊「計算數列」
3. **效能比較**：輸入 N 值，點擊「演算法效能比較」

---

## 演算法說明

### 1. 迭代法 (Iterative)

最直接的方法，使用兩個變數迭代計算。

```javascript
function fibonacciIterative(n) {
    if (n === 0) return 0n;
    if (n === 1) return 1n;

    let a = 0n, b = 1n;
    for (let i = 2; i <= n; i++) {
        const temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}
```

- **時間複雜度**：O(n)
- **空間複雜度**：O(1)
- **優點**：實作簡單，記憶體使用最少
- **缺點**：大 N 值時較慢

### 2. 矩陣快速冪 (Matrix Exponentiation)

利用矩陣乘法的特性加速計算：

```
[F(n+1)]   [1 1]^n   [1]
[F(n)  ] = [1 0]   × [0]
```

```javascript
function fibonacciMatrix(n) {
    // 使用快速冪計算矩陣的 n 次方
    // 時間複雜度降至 O(log n)
}
```

- **時間複雜度**：O(log n)
- **空間複雜度**：O(log n)
- **優點**：大 N 值時效率最高
- **缺點**：實作較複雜，小 N 值時有額外開銷

### 3. 記憶化 (Memoization)

使用快取儲存已計算的值，避免重複計算。

```javascript
function fibonacciMemoization(n) {
    const memo = new Map();
    memo.set(0, 0n);
    memo.set(1, 1n);

    for (let i = 2; i <= n; i++) {
        memo.set(i, memo.get(i-1) + memo.get(i-2));
        // 清理不需要的快取
        if (i > 2) memo.delete(i - 2);
    }
    return memo.get(n);
}
```

- **時間複雜度**：O(n)
- **空間複雜度**：O(1) (優化後)
- **優點**：避免重複計算
- **缺點**：與迭代法效率相近

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
| `START` | 計算單一值 | `{ n: number, algorithm: string }` |
| `CALCULATE_SEQUENCE` | 計算數列 | `{ count: number }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent: number, message: string }` |
| `RESULT` | 單一值結果 | `{ n, value, digits, algorithm, duration }` |
| `SEQUENCE_RESULT` | 數列結果 | `{ sequence: string[], count, duration }` |
| `ERROR` | 錯誤訊息 | `{ message: string }` |

---

## 效能數據

### 不同 N 值的計算時間 (參考值)

| N | 數字位數 | 迭代法 | 矩陣快速冪 | 記憶化 |
|---|----------|--------|------------|--------|
| 100 | 21 | <1ms | <1ms | <1ms |
| 1,000 | 209 | ~2ms | ~1ms | ~2ms |
| 10,000 | 2,090 | ~30ms | ~5ms | ~30ms |
| 50,000 | 10,450 | ~400ms | ~20ms | ~400ms |
| 100,000 | 20,899 | ~1.5s | ~50ms | ~1.5s |

### 結論

- **N < 1,000**：三種演算法效能相近
- **N > 10,000**：矩陣快速冪明顯更快 (O(log n) vs O(n))
- **記憶體考量**：迭代法和優化後的記憶化使用最少記憶體

---

## BigInt 說明

JavaScript 的 `Number` 類型有精度限制 (最大安全整數為 2^53 - 1)。費波那契數列增長極快，F(79) 就已經超過此限制。

本範例使用 `BigInt` 處理大數：

```javascript
// BigInt 寫法
const a = 0n;           // 字面量加 n
const b = BigInt(1);    // 或使用 BigInt()

// BigInt 運算
const sum = a + b;      // 只能與 BigInt 運算
const str = sum.toString(); // 轉字串
```

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
- [費波那契數列 - 維基百科](https://zh.wikipedia.org/wiki/斐波那契数列)
- [黃金比例 - 維基百科](https://zh.wikipedia.org/wiki/黄金分割率)

---

## 下一個範例

**#003 階乘計算器** - 使用 Web Worker 計算大數階乘，展示 BigInt 的極限與記憶化技術。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #002 - 費波那契數列
</p>
