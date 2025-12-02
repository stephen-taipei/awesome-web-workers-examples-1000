# #004 最大公因數計算器 (GCD Calculator)

> 使用 Web Worker 與歐幾里得算法計算最大公因數，支援批量計算與互質機率驗證

[![Difficulty: Beginner](https://img.shields.io/badge/難度-初級-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 計算最大公因數 (GCD)，並驗證數論中的互質機率定理。

### 主要功能

- 計算兩數的 GCD
- 顯示輾轉相除法的詳細步驟
- 計算多個數字的 GCD
- 批量計算多對數字的 GCD
- 隨機數測試與互質機率驗證
- 支援 BigInt 大數運算

---

## GCD 介紹

### 定義

最大公因數 (Greatest Common Divisor, GCD) 是能同時整除兩個或多個整數的最大正整數。

```
GCD(12, 18) = 6
因為 6 是能同時整除 12 和 18 的最大正整數
```

### 性質

- GCD(a, 0) = a
- GCD(a, b) = GCD(b, a mod b)
- GCD(a, b) = GCD(b, a)
- 若 GCD(a, b) = 1，則 a 和 b 互質

---

## 歐幾里得算法

### 原理

歐幾里得算法 (輾轉相除法) 是計算 GCD 最經典的方法，基於以下定理：

```
GCD(a, b) = GCD(b, a mod b)
```

當餘數為 0 時，除數即為 GCD。

### 範例：GCD(48, 18)

```
步驟 1: 48 = 18 × 2 + 12   →   GCD(48, 18) = GCD(18, 12)
步驟 2: 18 = 12 × 1 + 6    →   GCD(18, 12) = GCD(12, 6)
步驟 3: 12 = 6 × 2 + 0     →   GCD(12, 6) = 6

結果: GCD(48, 18) = 6
```

### 實作

```javascript
function gcd(a, b) {
    while (b !== 0n) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
```

### 複雜度

- **時間複雜度**：O(log(min(a, b)))
- **空間複雜度**：O(1)

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 歐幾里得算法 |
| **大數處理** | BigInt |
| **時間複雜度** | O(log n) |
| **難度等級** | 初級 |

---

## 檔案結構

```
004-gcd-calculator/
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

訪問：`http://localhost:8000/examples/01-computation/004-gcd-calculator/`

### 操作說明

1. **單對計算**：輸入兩數，點擊「計算 GCD」
2. **顯示步驟**：點擊「顯示計算步驟」查看輾轉相除過程
3. **多數計算**：輸入多個數字，計算它們的共同 GCD
4. **批量計算**：輸入多對數字，一次計算所有 GCD
5. **隨機測試**：驗證互質機率定理

---

## Worker 通訊模式

### 訊息格式

```javascript
{ type: string, payload: any }
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `CALCULATE_SINGLE` | 計算單對 GCD | `{ a, b }` |
| `CALCULATE_WITH_STEPS` | 顯示計算步驟 | `{ a, b }` |
| `CALCULATE_MULTIPLE` | 多數 GCD | `{ numbers: [] }` |
| `CALCULATE_BATCH` | 批量計算 | `{ pairs: [{a, b}, ...] }` |
| `GENERATE_RANDOM` | 隨機測試 | `{ count, maxValue }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 |
|------|------|
| `PROGRESS` | 進度更新 |
| `SINGLE_RESULT` | 單對結果 |
| `STEPS_RESULT` | 步驟結果 |
| `MULTIPLE_RESULT` | 多數結果 |
| `BATCH_RESULT` | 批量結果 |
| `RANDOM_RESULT` | 隨機測試結果 |
| `ERROR` | 錯誤訊息 |

---

## 效能數據

### 批量計算效能

| 數對數量 | 數字範圍 | 耗時 | 平均每對 |
|----------|----------|------|----------|
| 1,000 | 1-1,000,000 | ~10ms | 0.01ms |
| 10,000 | 1-1,000,000 | ~80ms | 0.008ms |
| 100,000 | 1-1,000,000 | ~700ms | 0.007ms |

### 大數計算

| 位數 | 耗時 |
|------|------|
| 10 位 | <0.1ms |
| 20 位 | <0.1ms |
| 50 位 | ~0.2ms |
| 100 位 | ~0.5ms |

---

## 互質機率定理

### 定理

兩個隨機選取的正整數互質 (GCD = 1) 的機率為：

```
P = 6/π² ≈ 0.6079 ≈ 60.79%
```

### 驗證

本範例提供隨機測試功能，可生成大量隨機數對並統計互質比例，驗證此數論定理。

### 測試結果範例

```
測試 10,000 對隨機數 (範圍 1-1,000,000)：
- 互質數對：6,082 對
- 互質比例：60.82%
- 理論值：60.79%
- 誤差：0.05%
```

---

## 相關數學

### 貝祖等式

若 GCD(a, b) = d，則存在整數 x, y 使得：

```
ax + by = d
```

### 最小公倍數 (LCM)

```
LCM(a, b) = |a × b| / GCD(a, b)
```

### 擴展歐幾里得算法

可同時求出 GCD 和貝祖係數 x, y。

---

## 瀏覽器支援

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [歐幾里得算法 - 維基百科](https://zh.wikipedia.org/wiki/輾轉相除法)
- [互質 - 維基百科](https://zh.wikipedia.org/wiki/互質)

---

## 下一個範例

**#005 最小公倍數 (LCM Calculator)** - 使用 Web Worker 批量計算最小公倍數，展示 GCD 與 LCM 的關係。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #004 - 最大公因數計算器
</p>
