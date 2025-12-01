# #013 模冪運算 (Modular Exponentiation)

> 使用 Web Worker 實現模冪運算，展示密碼學核心應用

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現模冪運算（Modular Exponentiation），這是現代密碼學的核心運算。

### 主要功能

- 基本模冪計算 (a^b mod m)
- RSA 加密/解密演示
- Diffie-Hellman 金鑰交換
- Fermat 質數測試
- 批量模冪計算
- 演算法效能比較

---

## 模冪運算原理

### 基本概念

模冪運算計算 a^b mod m，即 a 的 b 次方除以 m 的餘數。

直接計算 a^b 會產生極大的數字，而模冪運算利用模運算性質避免這個問題：

```
(a × b) mod m = ((a mod m) × (b mod m)) mod m
```

### 快速模冪算法（平方乘法）

```javascript
function modPow(base, exp, mod) {
    if (mod === 1n) return 0n;

    let result = 1n;
    base = base % mod;

    while (exp > 0n) {
        // 如果當前位是 1
        if (exp & 1n) {
            result = (result * base) % mod;
        }
        // 指數右移，底數平方
        exp = exp >> 1n;
        base = (base * base) % mod;
    }

    return result;
}
```

### 時間複雜度

| 方法 | 時間複雜度 | 計算 2^1000000 mod m |
|------|------------|----------------------|
| 樸素迭代 | O(n) | 數秒至數分鐘 |
| 快速模冪 | O(log n) | <10ms |

---

## 密碼學應用

### RSA 加密系統

RSA 是最廣泛使用的公鑰加密算法，基於大數因數分解的困難性。

#### 金鑰生成

1. 選擇兩個大質數 p 和 q
2. 計算 n = p × q
3. 計算 φ(n) = (p-1)(q-1)
4. 選擇 e，使 gcd(e, φ(n)) = 1
5. 計算 d，使 e × d ≡ 1 (mod φ(n))

#### 加密與解密

```
公鑰：(n, e)
私鑰：(n, d)

加密：C = M^e mod n
解密：M = C^d mod n
```

### Diffie-Hellman 金鑰交換

允許雙方在不安全的通道上建立共享密鑰。

#### 流程

1. Alice 和 Bob 公開協議質數 p 和生成元 g
2. Alice 選擇私鑰 a，計算 A = g^a mod p，發送 A
3. Bob 選擇私鑰 b，計算 B = g^b mod p，發送 B
4. Alice 計算共享密鑰：K = B^a mod p
5. Bob 計算共享密鑰：K = A^b mod p
6. K = g^(ab) mod p，雙方獲得相同的密鑰

### Fermat 質數測試

基於費馬小定理：如果 p 是質數，則對任意 a：

```
a^(p-1) ≡ 1 (mod p)
```

測試方法：
1. 選擇隨機的 a (2 ≤ a ≤ n-2)
2. 計算 a^(n-1) mod n
3. 如果結果不是 1，n 一定是合數
4. 如果結果是 1，n 可能是質數

**注意**：Carmichael 數（如 561）會欺騙 Fermat 測試。

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 快速模冪（平方乘法） |
| **大數處理** | BigInt |
| **難度等級** | 中級 |

---

## 檔案結構

```
013-modular-power/
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

訪問：`http://localhost:8000/examples/01-computation/013-modular-power/`

### 操作說明

1. **基本計算**：輸入底數、指數、模數進行模冪計算
2. **RSA 演示**：設定質數和訊息，觀察加密解密過程
3. **金鑰交換**：設定參數，模擬 Diffie-Hellman 協議
4. **質數測試**：輸入數字進行 Fermat 測試
5. **批量計算**：每行一個 `a^b mod m` 格式
6. **方法比較**：比較快速模冪與樸素方法

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `CALCULATE` | 計算模冪 | `{ base, exponent, modulus }` |
| `RSA_DEMO` | RSA 演示 | `{ p, q, e, message }` |
| `DH_DEMO` | DH 演示 | `{ prime, generator, alicePrivate, bobPrivate }` |
| `FERMAT_TEST` | 質數測試 | `{ number, iterations }` |
| `CALCULATE_BATCH` | 批量計算 | `{ calculations }` |
| `COMPARE_METHODS` | 比較方法 | `{ base, exponent, modulus }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `CALCULATE_RESULT` | 計算結果 |
| `RSA_RESULT` | RSA 演示結果 |
| `DH_RESULT` | DH 演示結果 |
| `FERMAT_RESULT` | 質數測試結果 |
| `BATCH_RESULT` | 批量結果 |
| `COMPARE_RESULT` | 比較結果 |
| `ERROR` | 錯誤訊息 |

---

## 模反元素計算

### 擴展歐幾里得算法

計算 d，使 e × d ≡ 1 (mod φ(n))：

```javascript
function modInverse(a, m) {
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }

    if (old_r !== 1n) return null; // 無反元素
    return ((old_s % m) + m) % m;
}
```

---

## 效能數據

### 快速模冪計算時間

| 計算 | 時間 |
|------|------|
| 2^1000 mod 10^9+7 | <1ms |
| 2^1000000 mod 10^9+7 | ~5ms |
| 2^10000000 mod 10^9+7 | ~20ms |
| RSA 演示 (小質數) | <5ms |
| DH 演示 | <1ms |

### 常用質數模數

| 質數 | 用途 |
|------|------|
| 65537 | RSA 公鑰指數 (2^16+1) |
| 10^9+7 | 競程常用質數 |
| 998244353 | NTT 質數 |

---

## 安全注意事項

⚠️ **重要提醒**

本範例為**教學演示用途**，使用的數字規模遠小於實際密碼學應用：

| 項目 | 本範例 | 實際應用 |
|------|--------|----------|
| RSA 金鑰長度 | ~10 位 | 2048-4096 位 |
| DH 質數大小 | ~3 位 | 2048+ 位 |
| 質數測試 | Fermat | Miller-Rabin |

**切勿將本範例代碼用於實際加密應用！**

---

## 數學知識

### 費馬小定理

若 p 是質數，a 不被 p 整除，則：
```
a^(p-1) ≡ 1 (mod p)
```

### 歐拉定理

若 gcd(a, n) = 1，則：
```
a^φ(n) ≡ 1 (mod n)
```

### Carmichael 數

滿足費馬小定理但不是質數的合數，例如：
- 561 = 3 × 11 × 17
- 1105 = 5 × 13 × 17
- 1729 = 7 × 13 × 19

---

## 應用場景

1. **公鑰加密**：RSA、ElGamal
2. **數位簽章**：DSA、ECDSA
3. **金鑰交換**：Diffie-Hellman、ECDH
4. **質數測試**：Miller-Rabin 測試
5. **競程比賽**：組合數學、快速冪
6. **區塊鏈**：橢圓曲線密碼學

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
- [Modular exponentiation](https://en.wikipedia.org/wiki/Modular_exponentiation)
- [RSA cryptosystem](https://en.wikipedia.org/wiki/RSA_(cryptosystem))
- [Diffie-Hellman](https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange)
- [Fermat primality test](https://en.wikipedia.org/wiki/Fermat_primality_test)

---

## 相關範例

- **#008 梅森質數** - 質數搜尋
- **#012 冪運算** - 快速冪算法
- **#014 離散對數** - DH 的逆運算
- **#015 質因數分解** - RSA 的破解基礎

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #013 - 模冪運算
</p>
