# #277 白平衡校正 (White Balance Correction)

> 使用 Web Worker 和灰度世界演算法自動校正圖片白平衡

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Image Processing](https://img.shields.io/badge/分類-圖像處理-purple.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 在背景執行緒中執行白平衡校正，消除圖片中的色偏問題。

### 主要功能

- 自動分析圖片色彩分布
- 提供三種白平衡演算法選擇
- 一鍵自動校正
- 即時進度回報
- 提供 Worker 與主執行緒效能比較
- 支援結果下載

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage with Transferable Objects |
| **核心演算法** | 灰度世界 / 白塊法 / 混合模式 |
| **時間複雜度** | O(n) |
| **空間複雜度** | O(n) |
| **效能目標** | 1080p < 200ms |
| **難度等級** | 中級 |

---

## 檔案結構

```
277-white-balance-correction/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 演算法說明

### 1. 灰度世界演算法 (Gray World Algorithm)

**假設**：在一個正常照片中，所有顏色的平均值應該是中性灰色。

**步驟**：
1. 計算 R、G、B 三個通道的平均值
2. 計算整體灰度平均值
3. 計算每個通道的增益係數
4. 應用增益校正每個像素

**公式**：
```
avgGray = (avgR + avgG + avgB) / 3
gainR = avgGray / avgR
gainG = avgGray / avgG
gainB = avgGray / avgB
```

### 2. 白塊法 (White Patch Algorithm)

**假設**：圖片中最亮的區域應該是白色。

**步驟**：
1. 找到每個通道的最大值
2. 計算使最亮點變成白色的增益
3. 應用增益校正

### 3. 混合模式 (Combined)

結合灰度世界和白塊法的優點，取兩者增益的平均值。

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
2. 選擇白平衡演算法
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
| `START` | 開始處理 | `{ imageData, algorithm }` |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent, message }` |
| `RESULT` | 處理結果 | `{ imageData, stats, duration }` |
| `ERROR` | 錯誤訊息 | `{ message }` |

---

## 程式碼範例

### 灰度世界演算法實作

```javascript
function grayWorldCorrection(imageData) {
    const data = imageData.data;
    const pixelCount = data.length / 4;

    // 計算平均值
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < data.length; i += 4) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
    }

    const avgR = sumR / pixelCount;
    const avgG = sumG / pixelCount;
    const avgB = sumB / pixelCount;
    const avgGray = (avgR + avgG + avgB) / 3;

    // 計算增益
    const gainR = avgGray / avgR;
    const gainG = avgGray / avgG;
    const gainB = avgGray / avgB;

    // 應用校正
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * gainR);
        data[i + 1] = Math.min(255, data[i + 1] * gainG);
        data[i + 2] = Math.min(255, data[i + 2] * gainB);
    }

    return imageData;
}
```

---

## 效能數據

| 圖片尺寸 | Worker 耗時 | 主執行緒耗時 |
|----------|-------------|--------------|
| 640×480 | ~20ms | ~20ms (UI 凍結) |
| 1280×720 | ~50ms | ~50ms (UI 凍結) |
| 1920×1080 | ~120ms | ~120ms (UI 凍結) |
| 3840×2160 | ~450ms | ~450ms (UI 凍結) |

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
- [Gray World Assumption](https://en.wikipedia.org/wiki/Color_normalization)
- [White Balance - Wikipedia](https://en.wikipedia.org/wiki/Color_balance)

---

## 下一個範例

**#278 色彩校正** - 使用色彩矩陣進行圖片色偏校正。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #277 - 白平衡校正
</p>
