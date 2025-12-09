# #010 立方根計算 (Cube Root Calculator)

> 使用 Web Worker 與牛頓迭代法計算高精度立方根

[![Difficulty: Beginner](https://img.shields.io/badge/難度-入門-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現高精度立方根計算，支援正數和負數。

### 主要功能

- 計算任意數字的立方根（包含負數）
- 支援自定義精度（最高 10000 位小數）
- 批量計算多個數字的立方根
- 驗證計算結果的準確性
- 比較牛頓法、哈雷法、二分法的效能

---

## 立方根的特性

### 與平方根的差異

- **平方根**：負數沒有實數平方根（√-1 = i，虛數）
- **立方根**：負數有實數立方根（∛-8 = -2）

### 數學定義

```
∛x = x^(1/3)

對於任意實數 x：
- 若 x > 0，則 ∛x > 0
- 若 x = 0，則 ∛x = 0
- 若 x < 0，則 ∛x < 0
```

---

## 計算方法

### 1. 牛頓迭代法（二次收斂）

```
x_{n+1} = (2 * x_n + S / x_n²) / 3
```

這個公式來自求解 f(x) = x³ - S = 0 的牛頓法：

```
x_{n+1} = x_n - f(x_n) / f'(x_n)
        = x_n - (x_n³ - S) / (3 * x_n²)
        = (2 * x_n + S / x_n²) / 3
```

### 2. 哈雷法（三次收斂）

```
x_{n+1} = x_n * (x_n³ + 2S) / (2 * x_n³ + S)
```

- 每次迭代的計算量更大
- 但收斂更快，需要的迭代次數更少
- 適合高精度計算

### 3. 二分搜尋法（線性收斂）

```javascript
function binaryCbrt(S) {
    let low = 0, high = Math.max(1, S);
    while (high - low > epsilon) {
        let mid = (low + high) / 2;
        if (mid * mid * mid < S) low = mid;
        else high = mid;
    }
    return (low + high) / 2;
}
```

---

## 範例：計算 ∛2

```
初始猜測：x₀ = 1

牛頓法迭代：
x₁ = (2*1 + 2/1²) / 3 = 4/3 = 1.333...
x₂ = (2*1.333 + 2/1.333²) / 3 = 1.264...
x₃ = 1.25992...
x₄ = 1.2599210498948732...

∛2 ≈ 1.2599210498948731647672106072782283505702514647015...
```

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 牛頓迭代法、哈雷法 |
| **大數處理** | BigInt |
| **負數支援** | 是 |
| **難度等級** | 入門 |

---

## 檔案結構

```
010-cube-root/
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

訪問：`http://localhost:8000/examples/01-computation/010-cube-root/`

### 操作說明

1. **單一計算**：輸入數字和精度，點擊「計算立方根」
2. **驗證結果**：將結果立方後與原數比較
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

### 處理負數

```javascript
function calculateCubeRoot(numberStr, precision) {
    const num = parseNumber(numberStr);
    const isNegative = num.isNegative;

    // 取絕對值計算
    const absValue = isNegative ? num.value.slice(1) : num.value;
    const result = newtonCbrt(absValue, precision);

    // 負數的立方根是負的
    return isNegative ? '-' + result.value : result.value;
}
```

### 牛頓法迭代

```javascript
// x = (2*x + S/x²) / 3
const xSquared = (x * x) / scale;
const quotient = (S * scale) / xSquared;
const newX = (2n * x + quotient) / 3n;
```

---

## 效能數據

### 迭代次數比較（1000位精度）

| 方法 | 迭代次數 | 時間 | 收斂階數 |
|------|----------|------|----------|
| 牛頓法 | ~15 | ~100ms | 二次 |
| 哈雷法 | ~10 | ~80ms | 三次 |
| 二分法 | ~3300 | ~600ms | 線性 |

### 牛頓法計算耗時

| 精度（位） | 迭代次數 | 計算時間 |
|------------|----------|----------|
| 100 | ~10 | <10ms |
| 500 | ~12 | <50ms |
| 1000 | ~15 | ~100ms |
| 5000 | ~18 | ~1s |

---

## 完美立方數

| 數字 | 立方根 |
|------|--------|
| 8 | 2 |
| 27 | 3 |
| 64 | 4 |
| 125 | 5 |
| 216 | 6 |
| 343 | 7 |
| 512 | 8 |
| 729 | 9 |
| 1000 | 10 |

---

## 著名的立方根

| 數字 | 立方根（前50位） |
|------|------------------|
| ∛2 | 1.25992104989487316476721060727822835057025146470150 |
| ∛3 | 1.44224957030740838232163831078010958839186925349935 |
| ∛5 | 1.70997594667669698935310887254386010986805511054305 |
| ∛10 | 2.15443469003188372175929356651935049525934494219210 |

---

## 應用場景

1. **數學計算**：高精度數值運算
2. **3D 圖形**：體積計算的逆運算
3. **物理學**：密度與體積關係
4. **工程計算**：管道流量計算
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
- [Newton's Method](https://en.wikipedia.org/wiki/Newton%27s_method)
- [Halley's Method](https://en.wikipedia.org/wiki/Halley%27s_method)
- [Cube Root - Wikipedia](https://en.wikipedia.org/wiki/Cube_root)

---

## 相關範例

- **#009 平方根計算** - 高精度平方根
- **#011 N次方根** - 任意次方根計算
- **#012 冪運算** - 大數冪運算

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #010 - 立方根計算
</p>
