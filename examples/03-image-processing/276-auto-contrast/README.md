# #276 自動對比 (Auto Contrast)

> 使用 Web Worker 和百分位數映射演算法自動調整圖片對比度

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Image Processing](https://img.shields.io/badge/分類-圖像處理-purple.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 在背景執行緒中執行圖像處理任務，自動調整圖片對比度。

### 主要功能

- 自動分析圖片直方圖
- 使用百分位數映射拉伸對比度
- 支援自訂低端/高端裁剪百分比
- 即時進度回報
- 提供 Worker 與主執行緒效能比較
- 支援結果下載

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage with Transferable Objects |
| **核心演算法** | 百分位數映射 (Percentile Mapping) |
| **時間複雜度** | O(n) |
| **空間複雜度** | O(n) |
| **效能目標** | 1080p < 100ms |
| **難度等級** | 中級 |

---

## 檔案結構

```
276-auto-contrast/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 演算法說明

### 百分位數映射 (Percentile Mapping)

自動對比調整的核心是將圖片的像素值範圍拉伸到完整的 0-255 範圍。

#### 步驟

1. **計算直方圖**：統計每個灰度值 (0-255) 的像素數量
2. **計算累積直方圖**：計算每個灰度值的累積像素數
3. **找到裁剪邊界**：
   - 低端：找到累積像素數超過總像素 × 低百分比的灰度值
   - 高端：找到累積像素數超過總像素 × (100 - 高百分比) 的灰度值
4. **建立查找表 (LUT)**：將 [low, high] 線性映射到 [0, 255]
5. **應用映射**：使用 LUT 轉換每個像素

#### 公式

```
新像素值 = (原像素值 - low) × 255 / (high - low)
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

### 操作說明

1. 點擊上傳區域或拖放圖片
2. 調整低端/高端裁剪百分比 (預設 1%)
3. 點擊「使用 Worker 處理」開始處理
4. 觀察處理進度
5. 處理完成後可下載結果

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
| `START` | 開始處理 | `{ imageData, lowPercentile, highPercentile }` |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent, message }` |
| `RESULT` | 處理結果 | `{ imageData, stats, duration }` |
| `ERROR` | 錯誤訊息 | `{ message }` |

---

## 程式碼範例

### 建立 Worker 並傳送圖片

```javascript
const worker = new Worker('worker.js');

// 使用 Transferable Objects 提升效能
const imageDataCopy = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
);

worker.postMessage({
    type: 'START',
    payload: {
        imageData: imageDataCopy,
        lowPercentile: 1,
        highPercentile: 1
    }
}, [imageDataCopy.data.buffer]);
```

### Worker 處理

```javascript
self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'START') {
        // 計算直方圖
        const hist = calculateHistogram(payload.imageData);

        // 找到裁剪邊界
        const bounds = findPercentileBounds(hist, payload.lowPercentile, payload.highPercentile);

        // 應用映射
        const result = applyMapping(payload.imageData, bounds);

        self.postMessage({ type: 'RESULT', payload: result });
    }
};
```

---

## 效能數據

| 圖片尺寸 | Worker 耗時 | 主執行緒耗時 |
|----------|-------------|--------------|
| 640×480 | ~15ms | ~15ms (UI 凍結) |
| 1280×720 | ~40ms | ~40ms (UI 凍結) |
| 1920×1080 | ~80ms | ~80ms (UI 凍結) |
| 3840×2160 | ~320ms | ~320ms (UI 凍結) |

### Worker 優勢

1. **UI 保持流暢**：處理在背景執行，不阻塞主執行緒
2. **進度回報**：可即時更新處理進度
3. **使用者體驗**：頁面保持可互動狀態

---

## 瀏覽器支援

| 瀏覽器 | 版本 |
|--------|------|
| Chrome | 4+ |
| Firefox | 3.5+ |
| Safari | 4+ |
| Edge | 12+ |

---

## 相關連結

- [MDN Web Workers API](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [MDN ImageData](https://developer.mozilla.org/zh-TW/docs/Web/API/ImageData)
- [Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)

---

## 下一個範例

**#277 白平衡校正** - 使用灰度世界演算法自動校正圖片白平衡。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #276 - 自動對比
</p>
