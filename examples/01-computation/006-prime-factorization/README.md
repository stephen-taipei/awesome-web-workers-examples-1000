# #006 質因數分解器 (Prime Factorization)

> 使用 Web Worker 與 Pollard's rho 算法進行質因數分解，支援大數運算

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-進階-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 進行質因數分解，結合試除法和 Pollard's rho 算法處理各種大小的數字。

### 主要功能

- 單數質因數分解
- 批量質因數分解
- 範圍內所有數字分解
- 列出所有因數
- 質數檢測 (Miller-Rabin)
- 支援 BigInt 大數運算

---

## 質因數分解介紹

### 算術基本定理

每個大於 1 的自然數，都可以唯一地表示為質數的乘積（不考慮順序）。

```
84 = 2² × 3 × 7
360 = 2³ × 3² × 5
1001 = 7 × 11 × 13
```

### 標準形式

```
n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ
```

其中 p₁ < p₂ < ... < pₖ 是質數，a₁, a₂, ..., aₖ 是正整數。

---

## 演算法說明

### 1. 試除法 (Trial Division)

最簡單直觀的方法，適用於較小的數字。

```javascript
function trialDivision(n) {
    const factors = [];
    let d = 2n;
    while (d * d <= n) {
        while (n % d === 0n) {
            factors.push(d);
            n /= d;
        }
        d++;
    }
    if (n > 1n) factors.push(n);
    return factors;
}
```

**複雜度**：O(√n)

### 2. Pollard's rho 算法

適用於大數分解的隨機算法，期望複雜度更優。

**原理**：利用生日悖論，透過偽隨機序列找到 n 的因數。

```javascript
function pollardRho(n) {
    let x = 2n, y = 2n, d = 1n;
    const f = (x) => (x * x + 1n) % n;

    while (d === 1n) {
        x = f(x);           // 慢指針
        y = f(f(y));        // 快指針
        d = gcd(abs(x - y), n);
    }
    return d;
}
```

**期望複雜度**：O(n^1/4)

### 3. Miller-Rabin 質數測試

用於判斷分解出的因數是否為質數。

```javascript
function millerRabin(n, witnesses) {
    // 將 n-1 分解為 2^r × d
    let r = 0n, d = n - 1n;
    while (d % 2n === 0n) { r++; d /= 2n; }

    for (const a of witnesses) {
        let x = modPow(a, d, n);
        if (x === 1n || x === n - 1n) continue;
        // 進行 r-1 次平方測試
        // ...
    }
    return true; // 可能是質數
}
```

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 試除法、Pollard's rho、Miller-Rabin |
| **大數處理** | BigInt |
| **時間複雜度** | O(n^1/4) 期望 |
| **難度等級** | 進階 |

---

## 檔案結構

```
006-prime-factorization/
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

訪問：`http://localhost:8000/examples/01-computation/006-prime-factorization/`

### 操作說明

1. **單數分解**：輸入數字，點擊「分解質因數」
2. **列出因數**：點擊「列出所有因數」查看完整因數列表
3. **質數檢測**：點擊「檢測是否質數」判斷數字是否為質數
4. **批量分解**：輸入多個數字，一次分解所有
5. **範圍分解**：指定範圍，分解範圍內所有數字

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `FACTORIZE_SINGLE` | 單數分解 | `{ number }` |
| `FACTORIZE_BATCH` | 批量分解 | `{ numbers: [] }` |
| `FACTORIZE_RANGE` | 範圍分解 | `{ start, end }` |
| `FIND_DIVISORS` | 列出因數 | `{ number }` |
| `CHECK_PRIME` | 質數檢測 | `{ number }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `SINGLE_RESULT` | 單數結果 |
| `BATCH_RESULT` | 批量結果 |
| `RANGE_RESULT` | 範圍結果 |
| `DIVISORS_RESULT` | 因數列表 |
| `PRIME_RESULT` | 質數檢測結果 |
| `ERROR` | 錯誤訊息 |

---

## 效能數據

### 單數分解

| 數字大小 | 演算法 | 耗時 |
|----------|--------|------|
| 10^6 | 試除法 | <1ms |
| 10^9 | 試除法 | ~5ms |
| 10^12 | Pollard's rho | ~50ms |
| 10^15 | Pollard's rho | ~200ms |

### 批量分解

| 數量 | 數字範圍 | 耗時 |
|------|----------|------|
| 100 | 1-10^6 | ~20ms |
| 1000 | 1-10^6 | ~150ms |

---

## 因數相關計算

### 因數個數

若 n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ，則因數個數為：

```
τ(n) = (a₁ + 1)(a₂ + 1)...(aₖ + 1)
```

### 因數和

```
σ(n) = (p₁^(a₁+1) - 1)/(p₁ - 1) × ... × (pₖ^(aₖ+1) - 1)/(pₖ - 1)
```

### 完美數

若 σ(n) = 2n，則 n 為完美數。例如：6, 28, 496, 8128。

---

## 應用場景

### 1. 密碼學

RSA 加密基於大數分解的困難性。

### 2. 數學計算

- 計算 GCD、LCM
- 簡化分數
- 判斷互質

### 3. 程式競賽

許多數論問題需要質因數分解。

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Pollard's rho - Wikipedia](https://en.wikipedia.org/wiki/Pollard%27s_rho_algorithm)
- [Miller-Rabin - Wikipedia](https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test)

---

## 相關範例

- **#001 質數產生器** - 使用篩法產生質數
- **#004 最大公因數 (GCD)** - GCD 計算
- **#005 最小公倍數 (LCM)** - LCM 計算

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #006 - 質因數分解器
</p>
