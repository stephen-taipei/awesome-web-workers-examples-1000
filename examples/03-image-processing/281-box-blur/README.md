# #281 均值模糊 (Box Blur)

> 使用 Web Worker 實現盒式模糊濾鏡，學習基礎卷積運算

[![Difficulty: Beginner](https://img.shields.io/badge/難度-初級-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Image Processing](https://img.shields.io/badge/分類-影像處理-purple.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 實現均值模糊（盒式模糊）濾鏡，這是最基礎的圖片模糊演算法之一。

### 主要功能

- 可調整模糊半徑（1-20 像素）
- 即時進度回報
- 支援圖片上傳與拖放
- 處理結果下載
- 顯示詳細處理統計

---

## 均值模糊原理

### 基本概念

均值模糊是一種空間濾波器，透過將每個像素替換為其鄰域像素的平均值來實現模糊效果。

### 數學公式

對於像素 P(x, y)，其模糊後的值為：

```
P'(x, y) = (1/n) × Σ P(x+i, y+j)

其中：
- i, j ∈ [-radius, radius]
- n = (2 × radius + 1)²
```

### 卷積核心

以 3×3 (radius=1) 為例：

```
    [ 1/9  1/9  1/9 ]
K = [ 1/9  1/9  1/9 ]
    [ 1/9  1/9  1/9 ]
```

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage with Transferable Objects |
| **資料傳遞** | ImageData (零拷貝傳輸) |
| **時間複雜度** | O(n × m × r²) |
| **空間複雜度** | O(n × m) |
| **難度等級** | 初級 |

---

## 檔案結構

```
281-box-blur/
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

訪問：`http://localhost:8000/examples/03-image-processing/281-box-blur/`

### 操作說明

1. **上傳圖片**：點擊上傳區域或拖放圖片
2. **調整半徑**：使用滑桿或快速設定按鈕
3. **套用模糊**：點擊「套用模糊」按鈕
4. **下載結果**：處理完成後可下載圖片

---

## 演算法實作

### 核心程式碼

```javascript
function applyBoxBlur(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;
    const dstData = new Uint8ClampedArray(srcData.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0, sumG = 0, sumB = 0;
            let count = 0;

            // 遍歷鄰域
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;

                    // 邊界檢查
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        sumR += srcData[idx];
                        sumG += srcData[idx + 1];
                        sumB += srcData[idx + 2];
                        count++;
                    }
                }
            }

            // 計算平均值
            const dstIdx = (y * width + x) * 4;
            dstData[dstIdx] = Math.round(sumR / count);
            dstData[dstIdx + 1] = Math.round(sumG / count);
            dstData[dstIdx + 2] = Math.round(sumB / count);
            dstData[dstIdx + 3] = srcData[dstIdx + 3];
        }
    }

    return new ImageData(dstData, width, height);
}
```

### 邊界處理策略

本範例使用「忽略邊界外像素」策略：

- 邊緣像素只計算有效範圍內的鄰居
- 使用 `count` 變數動態計算實際參與計算的像素數量
- 結果：邊緣區域的模糊效果略弱

其他常見策略：
- **邊緣延伸**：使用最近的邊緣像素值
- **映射**：鏡像反射邊緣像素
- **環繞**：將圖片視為環形（適用於紋理）

---

## 效能數據

### 不同半徑的處理時間 (1920×1080 圖片)

| 半徑 | 核心大小 | 每像素運算 | 處理時間 |
|------|----------|------------|----------|
| 1 | 3×3 | 9 | ~50ms |
| 3 | 7×7 | 49 | ~200ms |
| 5 | 11×11 | 121 | ~450ms |
| 10 | 21×21 | 441 | ~1.5s |
| 15 | 31×31 | 961 | ~3s |

### 效能瓶頸

- **時間複雜度**：O(n × m × r²)，與半徑平方成正比
- **記憶體存取**：每個像素需要讀取 (2r+1)² 個鄰居

### 優化建議

1. **可分離濾波**：將 2D 卷積拆分為兩次 1D 卷積，時間複雜度降為 O(n × m × r)
2. **積分圖 (Summed Area Table)**：預計算積分圖，實現 O(1) 區域和查詢
3. **WebGL/GPU 加速**：使用 GPU 進行並行計算

---

## 與其他模糊的比較

| 特性 | 均值模糊 | 高斯模糊 |
|------|----------|----------|
| 核心權重 | 相等 | 高斯分布 |
| 計算複雜度 | 較低 | 較高 |
| 效果自然度 | 一般 | 更自然 |
| 可分離性 | 可 | 可 |
| 邊緣假影 | 較明顯 | 較少 |

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
| `APPLY_BLUR` | 套用模糊 | `{ imageData: ImageData, radius: number }` |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent: number, message: string }` |
| `RESULT` | 處理結果 | `{ imageData, radius, kernelSize, duration }` |
| `ERROR` | 錯誤訊息 | `{ message: string }` |

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [維基百科 - 盒式模糊](https://en.wikipedia.org/wiki/Box_blur)
- [數位影像處理基礎](https://en.wikipedia.org/wiki/Digital_image_processing)
- [積分圖演算法](https://en.wikipedia.org/wiki/Summed-area_table)

---

## 下一個範例

**#282 高斯模糊** - 使用高斯核心實現更自然的模糊效果，學習高斯分布在影像處理中的應用。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #281 - 均值模糊
</p>
