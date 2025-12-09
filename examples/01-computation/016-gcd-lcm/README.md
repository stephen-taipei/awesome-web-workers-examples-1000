# #016 GCD/LCM 計算器 (Greatest Common Divisor / Least Common Multiple)

> 使用 Web Worker 計算最大公因數與最小公倍數

[![Difficulty: Beginner](https://img.shields.io/badge/難度-初級-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 計算最大公因數（GCD）與最小公倍數（LCM），這是數論的基礎運算。

### 主要功能

- 歐幾里得算法計算 GCD
- 擴展歐幾里得算法（Bézout 係數）
- 二進位 GCD (Stein's Algorithm)
- LCM 計算
- 多數 GCD/LCM
- 互質判定
- 計算步驟視覺化
- 演算法效能比較

---

## 基本概念

### 最大公因數 (GCD)

能同時整除兩數的最大正整數。

```
gcd(48, 18) = 6
因為 6 是能同時整除 48 和 18 的最大數
```

### 最小公倍數 (LCM)

能被兩數同時整除的最小正整數。

```
lcm(12, 18) = 36
因為 36 是能被 12 和 18 同時整除的最小數
```

### 基本恆等式

```
gcd(a, b) × lcm(a, b) = |a × b|
```

---

## 演算法

### 1. 歐幾里得算法

西元前 300 年由歐幾里得提出，是最古老的非平凡演算法之一。

```javascript
function gcd(a, b) {
    while (b !== 0n) {
        [a, b] = [b, a % b];
    }
    return a;
}
```

**原理**：gcd(a, b) = gcd(b, a mod b)

**範例**：gcd(48, 18)
```
48 = 2 × 18 + 12  →  gcd(48, 18) = gcd(18, 12)
18 = 1 × 12 + 6   →  gcd(18, 12) = gcd(12, 6)
12 = 2 × 6 + 0    →  gcd(12, 6) = 6
```

- **時間複雜度**: O(log min(a, b))
- **空間複雜度**: O(1)

### 2. 擴展歐幾里得算法

計算 Bézout 係數 x, y 使得：

```
ax + by = gcd(a, b)
```

```javascript
function extendedGCD(a, b) {
    let [old_r, r] = [a, b];
    let [old_s, s] = [1n, 0n];
    let [old_t, t] = [0n, 1n];

    while (r !== 0n) {
        const q = old_r / r;
        [old_r, r] = [r, old_r - q * r];
        [old_s, s] = [s, old_s - q * s];
        [old_t, t] = [t, old_t - q * t];
    }

    return { gcd: old_r, x: old_s, y: old_t };
}
```

**應用**：
- 計算模反元素：a⁻¹ mod m
- RSA 私鑰計算
- 中國剩餘定理

### 3. Stein's Algorithm (二進位 GCD)

只使用減法和位移運算，避免除法。

```javascript
function binaryGCD(a, b) {
    if (a === 0n) return b;
    if (b === 0n) return a;

    // 找出共同的 2 因子
    let shift = 0n;
    while (((a | b) & 1n) === 0n) {
        a >>= 1n;
        b >>= 1n;
        shift++;
    }

    // 移除 a 的 2 因子
    while ((a & 1n) === 0n) a >>= 1n;

    while (b !== 0n) {
        while ((b & 1n) === 0n) b >>= 1n;
        if (a > b) [a, b] = [b, a];
        b = b - a;
    }

    return a << shift;
}
```

- **時間複雜度**: O(log(max(a, b))²)
- **優點**: 在某些架構上比除法更快

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 歐幾里得、擴展歐幾里得、Stein |
| **大數處理** | BigInt |
| **難度等級** | 初級 |

---

## 檔案結構

```
016-gcd-lcm/
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

訪問：`http://localhost:8000/examples/01-computation/016-gcd-lcm/`

### 操作說明

1. **GCD 計算**：輸入兩數，選擇是否顯示步驟
2. **LCM 計算**：輸入兩數計算最小公倍數
3. **擴展 GCD**：計算 Bézout 係數
4. **多數計算**：輸入多個數字計算共同 GCD/LCM
5. **互質判定**：檢查數字是否兩兩互質
6. **方法比較**：比較歐幾里得與 Stein 算法

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `CALCULATE_GCD` | 計算 GCD | `{ a, b, showSteps }` |
| `CALCULATE_LCM` | 計算 LCM | `{ a, b }` |
| `EXTENDED_GCD` | 擴展 GCD | `{ a, b }` |
| `BINARY_GCD` | 二進位 GCD | `{ a, b, showSteps }` |
| `MULTIPLE_GCD` | 多數 GCD | `{ numbers }` |
| `MULTIPLE_LCM` | 多數 LCM | `{ numbers }` |
| `CHECK_COPRIME` | 互質判定 | `{ numbers }` |
| `COMPARE_METHODS` | 比較方法 | `{ a, b, iterations }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `GCD_RESULT` | GCD 結果 |
| `LCM_RESULT` | LCM 結果 |
| `EXTENDED_GCD_RESULT` | 擴展 GCD 結果 |
| `MULTIPLE_GCD_RESULT` | 多數 GCD 結果 |
| `MULTIPLE_LCM_RESULT` | 多數 LCM 結果 |
| `COPRIME_RESULT` | 互質判定結果 |
| `COMPARE_RESULT` | 比較結果 |
| `ERROR` | 錯誤訊息 |

---

## Bézout 恆等式

### 定義

對於任意整數 a, b（不全為 0），存在整數 x, y 使得：

```
ax + by = gcd(a, b)
```

### 範例

```
240 × (-9) + 46 × 47 = 2
-2160 + 2162 = 2
gcd(240, 46) = 2
```

### 應用於模反元素

若 gcd(a, m) = 1，則 ax + my = 1

因此 ax ≡ 1 (mod m)，x 就是 a 的模反元素。

---

## 互質性質

### 定義

兩數 a, b 互質當且僅當 gcd(a, b) = 1。

### 重要性質

1. a, b 互質 ⟺ 存在 x, y 使得 ax + by = 1
2. 若 a | bc 且 gcd(a, b) = 1，則 a | c
3. 質數 p 與任何不被 p 整除的數互質

### 在密碼學的應用

- RSA：e 與 φ(N) 互質
- Diffie-Hellman：生成元的選擇
- 模反元素的存在條件

---

## 效能數據

### 演算法比較

| 數字大小 | 歐幾里得 | Stein's |
|----------|----------|---------|
| 32 位 | ~0.001ms | ~0.001ms |
| 64 位 | ~0.002ms | ~0.003ms |
| 100 位 | ~0.01ms | ~0.02ms |
| 1000 位 | ~1ms | ~5ms |

### 步驟數分析

歐幾里得算法的最壞情況是連續 Fibonacci 數：

```
gcd(F_n, F_{n-1}) 需要 n-2 次迭代
```

例如 gcd(89, 55) 需要 9 次迭代。

---

## 數學知識

### Lamé 定理

歐幾里得算法的步驟數不超過較小數的十進位位數的 5 倍。

### 質因數分解與 GCD

若 a = p₁^a₁ × p₂^a₂ × ... 且 b = p₁^b₁ × p₂^b₂ × ...

則 gcd(a, b) = p₁^min(a₁,b₁) × p₂^min(a₂,b₂) × ...

### 多數 GCD/LCM

```
gcd(a, b, c) = gcd(gcd(a, b), c)
lcm(a, b, c) = lcm(lcm(a, b), c)
```

---

## 應用場景

1. **分數約簡**：將分數化為最簡形式
2. **密碼學**：RSA 金鑰生成、模反元素
3. **音樂理論**：節拍計算
4. **齒輪比**：機械設計
5. **排程問題**：週期性事件同步
6. **競程比賽**：數論題目的基礎

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Euclidean algorithm](https://en.wikipedia.org/wiki/Euclidean_algorithm)
- [Extended Euclidean algorithm](https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm)
- [Binary GCD algorithm](https://en.wikipedia.org/wiki/Binary_GCD_algorithm)
- [Bézout's identity](https://en.wikipedia.org/wiki/B%C3%A9zout%27s_identity)

---

## 相關範例

- **#013 模冪運算** - 使用擴展 GCD 計算模反元素
- **#015 質因數分解** - 另一種計算 GCD 的方法
- **#017 分數運算** - GCD 用於約分

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #016 - GCD/LCM 計算器
</p>
