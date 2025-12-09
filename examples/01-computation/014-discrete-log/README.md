# #014 離散對數 (Discrete Logarithm)

> 使用 Web Worker 計算離散對數，展示密碼學安全基礎

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 計算離散對數問題（DLP），這是現代密碼學安全性的基礎。

### 主要功能

- 基本離散對數計算
- 暴力搜尋法
- Baby-step Giant-step (BSGS) 算法
- Pollard's Rho 算法
- Diffie-Hellman 攻擊演示
- 元素階計算
- 演算法效能比較

---

## 離散對數問題

### 定義

給定一個質數 p、生成元 g 和目標值 h，找出整數 x 使得：

```
g^x ≡ h (mod p)
```

這個 x 稱為 h 以 g 為底的離散對數，記作 x = log_g(h)。

### 為什麼重要？

離散對數問題是以下密碼學協議安全性的基礎：

- **Diffie-Hellman** 金鑰交換
- **ElGamal** 加密系統
- **DSA** 數位簽章算法
- **橢圓曲線密碼學** (ECDLP)

---

## 演算法

### 1. 暴力搜尋

最簡單的方法，逐一嘗試 x = 0, 1, 2, ...

```javascript
function bruteForceDLog(g, h, p) {
    let current = 1n;
    for (let x = 0n; x < p; x++) {
        if (current === h) return x;
        current = (current * g) % p;
    }
    return null;
}
```

- **時間複雜度**: O(p)
- **空間複雜度**: O(1)
- **適用場景**: 小模數 (p < 10^5)

### 2. Baby-step Giant-step (BSGS)

利用時空折衷的經典算法。

```javascript
function bsgs(g, h, p) {
    const m = BigInt(Math.ceil(Math.sqrt(Number(p))));

    // Baby step: 建表 g^j for j = 0..m-1
    const table = new Map();
    let gj = 1n;
    for (let j = 0n; j < m; j++) {
        table.set(gj.toString(), j);
        gj = (gj * g) % p;
    }

    // Giant step: 計算 h * (g^-m)^i
    const gmInv = modInverse(modPow(g, m, p), p);
    let gamma = h;
    for (let i = 0n; i < m; i++) {
        if (table.has(gamma.toString())) {
            return i * m + table.get(gamma.toString());
        }
        gamma = (gamma * gmInv) % p;
    }
    return null;
}
```

- **時間複雜度**: O(√p)
- **空間複雜度**: O(√p)
- **適用場景**: 中等模數 (p < 10^12)

### 3. Pollard's Rho

使用循環檢測的概率性算法。

- **時間複雜度**: O(√p) 期望值
- **空間複雜度**: O(1)
- **適用場景**: 大模數，記憶體有限

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 暴力法、BSGS、Pollard's Rho |
| **大數處理** | BigInt |
| **難度等級** | 中級 |

---

## 檔案結構

```
014-discrete-log/
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

訪問：`http://localhost:8000/examples/01-computation/014-discrete-log/`

### 操作說明

1. **基本計算**：輸入 g, h, p 計算 log_g(h) mod p
2. **DH 攻擊**：輸入公開參數和公鑰，嘗試破解私鑰
3. **元素階**：計算元素在乘法群中的階
4. **批量計算**：多個離散對數問題同時處理
5. **方法比較**：比較不同算法的效能

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `CALCULATE` | 計算離散對數 | `{ generator, target, modulus, method }` |
| `BSGS` | BSGS 專用 | `{ generator, target, modulus, order }` |
| `POLLARD_RHO` | Pollard's Rho | `{ generator, target, modulus, order }` |
| `DH_ATTACK` | DH 攻擊 | `{ prime, generator, alicePublic, bobPublic }` |
| `FIND_ORDER` | 計算元素階 | `{ element, modulus }` |
| `CALCULATE_BATCH` | 批量計算 | `{ calculations }` |
| `COMPARE_METHODS` | 比較方法 | `{ generator, target, modulus }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `CALCULATE_RESULT` | 計算結果 |
| `DH_ATTACK_RESULT` | DH 攻擊結果 |
| `ORDER_RESULT` | 元素階結果 |
| `BATCH_RESULT` | 批量結果 |
| `COMPARE_RESULT` | 比較結果 |
| `ERROR` | 錯誤訊息 |

---

## DH 攻擊演示

### 攻擊流程

1. **攔截公開參數**：質數 p 和生成元 g
2. **攔截公鑰**：Alice 的 A = g^a，Bob 的 B = g^b
3. **計算離散對數**：a = log_g(A)，b = log_g(B)
4. **計算共享密鑰**：K = B^a = A^b = g^(ab)

### 為什麼實際 DH 是安全的？

實際應用中使用的質數長度通常為 2048 位以上：

| 參數大小 | BSGS 複雜度 | 預估時間 |
|----------|-------------|----------|
| 64 位 | 2^32 | 數秒 |
| 128 位 | 2^64 | 數百年 |
| 2048 位 | 2^1024 | 不可能 |

---

## 元素階與原根

### 定義

元素 a 在模 p 下的**階** (order) 是使 a^k ≡ 1 (mod p) 成立的最小正整數 k。

### 原根

如果 a 的階等於 φ(p) = p-1，則 a 稱為模 p 的**原根** (primitive root)。

原根的重要性：
- 原根可以生成整個乘法群 Z_p*
- 離散對數問題需要使用原根作為底

### 範例

對於 p = 23：
- ord_23(2) = 11（不是原根）
- ord_23(5) = 22 = φ(23)（是原根）

---

## 效能數據

### 演算法比較

| 方法 | p = 10^4 | p = 10^6 | p = 10^9 |
|------|----------|----------|----------|
| 暴力法 | ~1ms | ~100ms | 超時 |
| BSGS | ~1ms | ~10ms | ~500ms |
| Pollard's Rho | ~1ms | ~5ms | ~200ms |

### BSGS 記憶體使用

| 模數大小 | 表格大小 | 記憶體 |
|----------|----------|--------|
| 10^6 | 1000 項 | ~100KB |
| 10^9 | 31623 項 | ~3MB |
| 10^12 | 10^6 項 | ~100MB |

---

## 數學知識

### 費馬小定理

對於質數 p 和 gcd(a, p) = 1：
```
a^(p-1) ≡ 1 (mod p)
```

### 拉格朗日定理

元素的階必定整除 φ(p)。

### 離散對數的性質

```
log_g(1) = 0
log_g(g) = 1
log_g(ab) = log_g(a) + log_g(b) (mod p-1)
log_g(a^k) = k · log_g(a) (mod p-1)
```

---

## 與 #013 的關係

| #013 模冪運算 | #014 離散對數 |
|--------------|--------------|
| 正向計算：g^x mod p | 逆向計算：log_g(h) mod p |
| O(log n) | O(√n) 最佳 |
| 容易 | 困難 |
| 用於加密 | 用於破解 |

這種正向容易、逆向困難的特性稱為**單向函數**，是密碼學的基礎。

---

## 安全注意事項

⚠️ **重要提醒**

本範例為**教學演示用途**：

1. 使用的參數遠小於實際密碼學應用
2. 實際 DH 應使用 2048+ 位質數
3. 現代應用更推薦橢圓曲線（ECDH）
4. 生產環境應使用經過驗證的密碼學庫

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |
| Map | 38+ | 13+ | 8+ | 12+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [Discrete logarithm](https://en.wikipedia.org/wiki/Discrete_logarithm)
- [Baby-step giant-step](https://en.wikipedia.org/wiki/Baby-step_giant-step)
- [Pollard's rho algorithm](https://en.wikipedia.org/wiki/Pollard%27s_rho_algorithm_for_logarithms)
- [Diffie-Hellman key exchange](https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange)

---

## 相關範例

- **#013 模冪運算** - 離散對數的逆運算
- **#015 質因數分解** - RSA 安全性基礎
- **#008 梅森質數** - 大質數搜尋

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #014 - 離散對數
</p>
