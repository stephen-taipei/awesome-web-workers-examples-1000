# #015 質因數分解 (Prime Factorization)

> 使用 Web Worker 實現質因數分解，展示 RSA 安全基礎

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現質因數分解，這是破解 RSA 加密的理論基礎。

### 主要功能

- 基本質因數分解
- 試除法 (Trial Division)
- Pollard's Rho 算法
- Fermat 分解法
- RSA 攻擊演示
- 數字性質分析
- 演算法效能比較

---

## 算術基本定理

任何大於 1 的正整數 n 都可以唯一地分解為質數的乘積：

```
n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ
```

例如：
```
360 = 2³ × 3² × 5¹
1000 = 2³ × 5³
123456789 = 3² × 3607 × 3803
```

---

## 演算法

### 1. 試除法 (Trial Division)

最簡單直觀的方法，嘗試從 2 到 √n 的所有數。

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

- **時間複雜度**: O(√n)
- **空間複雜度**: O(log n)
- **適用場景**: 小數字或有小因子的數

### 2. Pollard's Rho 算法

使用循環檢測的隨機算法。

```javascript
function pollardRho(n) {
    let x = 2n, y = 2n, d = 1n;
    const f = (x) => (x * x + 1n) % n;

    while (d === 1n) {
        x = f(x);
        y = f(f(y));
        d = gcd(abs(x - y), n);
    }

    return d === n ? null : d;
}
```

- **時間複雜度**: O(n^(1/4)) 期望值
- **空間複雜度**: O(1)
- **適用場景**: 大數分解

### 3. Fermat 分解法

利用 n = a² - b² = (a+b)(a-b) 的性質。

```javascript
function fermat(n) {
    let a = isqrt(n);
    if (a * a < n) a++;

    while (true) {
        const b2 = a * a - n;
        if (isPerfectSquare(b2)) {
            const b = isqrt(b2);
            return [a + b, a - b];
        }
        a++;
    }
}
```

- **時間複雜度**: O(|p-q|) 其中 n = p × q
- **適用場景**: 兩個因子接近的數（RSA 弱金鑰）

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 試除法、Pollard's Rho、Fermat |
| **大數處理** | BigInt |
| **質數判定** | Miller-Rabin |
| **難度等級** | 中級 |

---

## 檔案結構

```
015-prime-factorization/
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

訪問：`http://localhost:8000/examples/01-computation/015-prime-factorization/`

### 操作說明

1. **基本分解**：輸入數字，選擇方法進行分解
2. **RSA 攻擊**：輸入 N 和 e，嘗試分解 N 並計算私鑰
3. **數字分析**：分析數字的各種性質
4. **批量分解**：每行一個數字，批量處理
5. **方法比較**：比較不同演算法的效能

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `FACTORIZE` | 分解數字 | `{ number, method }` |
| `TRIAL_DIVISION` | 試除法 | `{ number }` |
| `POLLARD_RHO` | Pollard's Rho | `{ number }` |
| `FERMAT` | Fermat 分解 | `{ number, maxIterations }` |
| `RSA_ATTACK` | RSA 攻擊 | `{ n, e, ciphertext }` |
| `ANALYZE_NUMBER` | 數字分析 | `{ number }` |
| `FACTORIZE_BATCH` | 批量分解 | `{ numbers }` |
| `COMPARE_METHODS` | 比較方法 | `{ number }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `FACTORIZE_RESULT` | 分解結果 |
| `RSA_ATTACK_RESULT` | RSA 攻擊結果 |
| `ANALYZE_RESULT` | 分析結果 |
| `BATCH_RESULT` | 批量結果 |
| `COMPARE_RESULT` | 比較結果 |
| `ERROR` | 錯誤訊息 |

---

## RSA 攻擊演示

### 攻擊流程

1. **獲取公鑰**: (N, e)
2. **分解 N**: 找出 N = p × q
3. **計算 φ(N)**: φ(N) = (p-1)(q-1)
4. **計算私鑰**: d = e⁻¹ mod φ(N)
5. **解密**: M = C^d mod N

### 範例

```
公鑰: N = 3233, e = 17
分解: 3233 = 61 × 53
φ(N) = 60 × 52 = 3120
私鑰: d = 17⁻¹ mod 3120 = 2753

密文: C = 2790
明文: M = 2790^2753 mod 3233 = 65 (ASCII 'A')
```

### 為什麼實際 RSA 是安全的？

| 金鑰大小 | 分解難度 | 預估時間 |
|----------|----------|----------|
| 512 位 | 可分解 | 數小時 |
| 1024 位 | 困難 | 數年 |
| 2048 位 | 極難 | 數百萬年 |
| 4096 位 | 不可能 | 宇宙年齡 |

---

## 數字性質分析

### 可分析的性質

| 性質 | 說明 |
|------|------|
| **位數** | 十進位/二進位位數 |
| **質數** | 是否為質數 |
| **完全平方數** | 是否可開根號 |
| **2 的冪** | 是否為 2^k |
| **半質數** | 是否為兩質數乘積 |
| **因子數 τ(n)** | 所有因子的數量 |
| **歐拉函數 φ(n)** | 小於 n 且與 n 互質的數的數量 |

### 公式

因子數：
```
τ(n) = (a₁+1)(a₂+1)...(aₖ+1)
```

歐拉函數：
```
φ(n) = n × ∏(1 - 1/pᵢ)
```

---

## 效能數據

### 分解時間比較

| 數字類型 | 試除法 | Pollard's Rho | Fermat |
|----------|--------|---------------|--------|
| 10^8 (小因子) | ~1ms | ~1ms | ~100ms |
| 10^12 (隨機) | ~100ms | ~10ms | ~1s |
| 10^12 (兩因子接近) | ~100ms | ~10ms | ~1ms |
| 10^18 | 超時 | ~100ms | 不定 |

### 特殊情況

- **質數**: Miller-Rabin 快速判定
- **2 的冪**: O(log n) 位元運算
- **小因子多**: 試除法效率高
- **兩因子接近**: Fermat 極快

---

## 數學知識

### Miller-Rabin 質數測試

概率性質數測試，錯誤率極低：

```
如果 n 是質數，對所有 2 ≤ a < n：
a^(n-1) ≡ 1 (mod n)
```

### 歐拉定理

```
a^φ(n) ≡ 1 (mod n)  當 gcd(a,n) = 1
```

### RSA 正確性

```
M^(ed) ≡ M (mod N)
因為 ed ≡ 1 (mod φ(N))
```

---

## 與密碼學的關係

| 問題 | 密碼學應用 | 安全性基礎 |
|------|-----------|-----------|
| 質因數分解 | RSA | 大數分解困難 |
| 離散對數 | DH, DSA | DLP 困難 |
| 橢圓曲線 | ECDSA, ECDH | ECDLP 困難 |

---

## 安全注意事項

⚠️ **重要提醒**

本範例為**教學演示用途**：

1. 使用的數字遠小於實際密碼學應用
2. 實際 RSA 應使用 2048+ 位金鑰
3. 選擇的質數 p, q 應差距足夠大
4. 生產環境應使用經過驗證的密碼學庫
5. 切勿在實際系統中使用本範例代碼

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Integer factorization](https://en.wikipedia.org/wiki/Integer_factorization)
- [Pollard's rho algorithm](https://en.wikipedia.org/wiki/Pollard%27s_rho_algorithm)
- [Fermat's factorization](https://en.wikipedia.org/wiki/Fermat%27s_factorization_method)
- [RSA cryptosystem](https://en.wikipedia.org/wiki/RSA_(cryptosystem))

---

## 相關範例

- **#008 梅森質數** - 質數搜尋
- **#013 模冪運算** - RSA 加密基礎
- **#014 離散對數** - DH 安全性基礎

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #015 - 質因數分解
</p>
