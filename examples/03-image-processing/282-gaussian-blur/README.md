# #282 高斯模糊 (Gaussian Blur)

> 使用 Web Worker 實現高斯模糊濾鏡，學習高斯核心與卷積運算

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-進階-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Image Processing](https://img.shields.io/badge/分類-影像處理-purple.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現高斯模糊濾鏡，這是最常用且效果最自然的圖片模糊演算法。

### 主要功能

- 可調整模糊半徑（1-15 像素）
- 可調整 Sigma 值（0.5-10）
- 高斯核心即時視覺化
- 高斯曲線動態預覽
- 即時進度回報
- 支援圖片上傳與拖放

---

## 高斯模糊原理

### 高斯函數

二維高斯函數定義：

```
G(x, y) = (1 / 2πσ²) × e^(-(x² + y²) / 2σ²)
```

其中：
- `σ (sigma)`：標準差，控制模糊強度
- `(x, y)`：相對於中心點的位置

### 高斯核心特性

1. **中心權重最高**：中心像素對結果影響最大
2. **對稱性**：核心沿 x 和 y 軸對稱
3. **權重和為 1**：保持圖片整體亮度
4. **可分離性**：2D 高斯可分解為兩個 1D 高斯

### 與均值模糊的比較

| 特性 | 高斯模糊 | 均值模糊 |
|------|----------|----------|
| 權重分布 | 高斯（中心高） | 均勻 |
| 邊緣效果 | 自然柔和 | 可能有假影 |
| 計算量 | 較高 | 較低 |
| 適用場景 | 自然模糊、降噪 | 簡單模糊 |

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage with Transferable Objects |
| **資料傳遞** | ImageData (零拷貝傳輸) |
| **時間複雜度** | O(n × m × r²) |
| **空間複雜度** | O(n × m + r²) |
| **難度等級** | 進階 |

---

## 檔案結構

```
282-gaussian-blur/
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

訪問：`http://localhost:8000/examples/03-image-processing/282-gaussian-blur/`

### 操作說明

1. **上傳圖片**：點擊上傳區域或拖放圖片
2. **調整參數**：
   - 使用滑桿調整半徑和 Sigma
   - 或使用快速設定按鈕
3. **觀察核心**：查看高斯核心預覽
4. **套用模糊**：點擊「套用高斯模糊」按鈕
5. **下載結果**：處理完成後可下載圖片

---

## 演算法實作

### 高斯核心產生

```javascript
function generateGaussianKernel(radius, sigma) {
    const size = 2 * radius + 1;
    const kernel = new Float64Array(size * size);
    const sigma2 = 2 * sigma * sigma;
    let sum = 0;

    // 計算高斯值
    for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
            const exponent = -(x * x + y * y) / sigma2;
            const value = Math.exp(exponent);
            const idx = (y + radius) * size + (x + radius);
            kernel[idx] = value;
            sum += value;
        }
    }

    // 正規化（確保權重和為 1）
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }

    return kernel;
}
```

### 二維卷積

```javascript
function applyGaussianBlur(imageData, radius, sigma) {
    const kernel = generateGaussianKernel(radius, sigma);
    const kernelSize = 2 * radius + 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0, sumG = 0, sumB = 0;
            let weightSum = 0;

            // 遍歷核心
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        const kernelIdx = (ky + radius) * kernelSize + (kx + radius);
                        const weight = kernel[kernelIdx];

                        sumR += srcData[idx] * weight;
                        sumG += srcData[idx + 1] * weight;
                        sumB += srcData[idx + 2] * weight;
                        weightSum += weight;
                    }
                }
            }

            // 正規化並寫入結果
            const dstIdx = (y * width + x) * 4;
            dstData[dstIdx] = sumR / weightSum;
            dstData[dstIdx + 1] = sumG / weightSum;
            dstData[dstIdx + 2] = sumB / weightSum;
        }
    }
}
```

---

## 參數說明

### 半徑 (Radius)

- **定義**：核心從中心延伸的像素數
- **核心大小**：(2 × radius + 1)²
- **影響**：半徑越大，模糊範圍越廣

### Sigma (σ)

- **定義**：高斯分布的標準差
- **影響**：σ 越大，權重分布越平坦，模糊越強
- **建議**：通常設定為 radius / 2 ~ radius / 3

### 兩者關係

| radius | 建議 σ | 說明 |
|--------|--------|------|
| 1 | 0.5 | 輕微模糊 |
| 3 | 1.5 | 標準模糊 |
| 5 | 2.5 | 中等模糊 |
| 10 | 5.0 | 強烈模糊 |

---

## 效能數據

### 不同參數的處理時間 (1920×1080 圖片)

| 半徑 | Sigma | 核心大小 | 處理時間 |
|------|-------|----------|----------|
| 1 | 0.5 | 3×3 | ~80ms |
| 3 | 1.5 | 7×7 | ~350ms |
| 5 | 2.5 | 11×11 | ~900ms |
| 10 | 5.0 | 21×21 | ~3.5s |

### 優化方向

1. **可分離濾波**：參見 #283 可分離高斯模糊
2. **WebGL 加速**：使用 GPU 並行計算
3. **積分圖**：預計算加速（不適用於高斯權重）

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
| `APPLY_BLUR` | 套用模糊 | `{ imageData, radius, sigma }` |
| `GENERATE_KERNEL` | 產生核心 | `{ radius, sigma }` |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent, message }` |
| `RESULT` | 處理結果 | `{ imageData, radius, sigma, kernelSize, duration }` |
| `KERNEL` | 核心數據 | `{ kernel, kernelSize, radius, sigma }` |
| `ERROR` | 錯誤訊息 | `{ message }` |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [維基百科 - 高斯模糊](https://en.wikipedia.org/wiki/Gaussian_blur)
- [高斯函數](https://en.wikipedia.org/wiki/Gaussian_function)
- [卷積運算](https://en.wikipedia.org/wiki/Convolution)

---

## 下一個範例

**#283 可分離高斯模糊** - 使用可分離濾波器優化高斯模糊，將時間複雜度從 O(r²) 降低到 O(r)。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #282 - 高斯模糊
</p>
