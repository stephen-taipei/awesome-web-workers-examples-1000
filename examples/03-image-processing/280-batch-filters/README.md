# #280 批量濾鏡 (Batch Filters)

> 使用 Web Worker 實現多濾鏡組合應用，支援濾鏡鏈處理

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-進階-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Image Processing](https://img.shields.io/badge/分類-影像處理-purple.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 將多個圖片濾鏡組合成處理鏈，在背景執行緒中依序套用，實現複雜的影像處理效果。

### 主要功能

- 支援多種基礎濾鏡：灰階、反色、亮度、對比度、飽和度等
- 濾鏡鏈管理：可自由組合濾鏡順序
- 即時進度回報
- 支援圖片上傳與拖放
- 處理結果下載

---

## 支援的濾鏡

| 濾鏡 | 說明 | 演算法 |
|------|------|--------|
| 灰階 | 轉換為黑白圖片 | RGB 加權平均 (0.299R + 0.587G + 0.114B) |
| 反色 | 顏色反轉 | 255 - value |
| 亮度+ | 增加亮度 20% | RGB × 1.2 |
| 亮度- | 降低亮度 20% | RGB × 0.8 |
| 對比度 | 增加對比度 20% | 線性映射 |
| 飽和度 | 增加飽和度 50% | HSL 空間調整 |
| 懷舊 | Sepia 效果 | 固定色彩矩陣 |
| 暖色調 | 增加暖色感 | R+30, G+10, B-20 |
| 冷色調 | 增加冷色感 | R-20, G+5, B+30 |
| 二值化 | 黑白二值 | 閾值 128 |
| 色調分離 | Posterize | 4 級量化 |
| Gamma | Gamma 校正 | γ = 1.5 |

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage with Transferable Objects |
| **資料傳遞** | ImageData (零拷貝傳輸) |
| **難度等級** | 進階 |

---

## 檔案結構

```
280-batch-filters/
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

訪問：`http://localhost:8000/examples/03-image-processing/280-batch-filters/`

### 操作說明

1. **上傳圖片**：點擊上傳區域或拖放圖片
2. **建立濾鏡鏈**：點擊左側濾鏡按鈕加入處理鏈
3. **調整順序**：可點擊 × 移除不需要的濾鏡
4. **套用處理**：點擊「套用濾鏡鏈」開始處理
5. **下載結果**：處理完成後可下載圖片

---

## 濾鏡鏈概念

### 什麼是濾鏡鏈？

濾鏡鏈是一種將多個影像處理操作串聯起來的設計模式。每個濾鏡的輸出作為下一個濾鏡的輸入：

```
原圖 → 濾鏡1 → 濾鏡2 → 濾鏡3 → 結果
```

### 順序重要性

濾鏡的套用順序會影響最終結果：

```javascript
// 範例：灰階 → 反色 vs 反色 → 灰階
// 兩者結果不同！

// 灰階後反色：彩色 → 灰階 → 黑白反轉
// 反色後灰階：彩色 → 彩色反轉 → 灰階
```

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
| `APPLY_FILTERS` | 套用濾鏡鏈 | `{ imageData: ImageData, filters: string[] }` |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent: number, message: string }` |
| `RESULT` | 處理結果 | `{ imageData: ImageData, filters: string[], duration: number }` |
| `ERROR` | 錯誤訊息 | `{ message: string }` |

---

## Transferable Objects

本範例使用 Transferable Objects 進行零拷貝資料傳輸：

```javascript
// 發送 ImageData 到 Worker
worker.postMessage({
    type: 'APPLY_FILTERS',
    payload: { imageData, filters }
}, [imageData.data.buffer]);  // 轉移 ArrayBuffer 所有權
```

### 優點

- 避免大型資料的複製開銷
- 顯著提升傳輸效能
- 特別適合圖片處理場景

### 注意事項

- 轉移後原始資料將不可用
- 需要確保不再需要原始資料才能轉移

---

## 效能數據

### 不同濾鏡數量的處理時間 (1920×1080 圖片)

| 濾鏡數量 | 處理時間 |
|----------|----------|
| 1 | ~30ms |
| 3 | ~80ms |
| 5 | ~130ms |
| 10 | ~250ms |

### 優化建議

1. 對於大圖片，考慮先縮放再處理
2. 合併相似操作（如多次亮度調整）
3. 使用 Web Worker 避免阻塞 UI

---

## 相關連結

- [MDN - Web Workers](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API)
- [MDN - Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [MDN - ImageData](https://developer.mozilla.org/zh-TW/docs/Web/API/ImageData)
- [Canvas 影像處理教學](https://developer.mozilla.org/zh-TW/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)

---

## 下一個範例

**#281 均值模糊** - 使用 Web Worker 實現盒式模糊濾鏡，學習基礎卷積運算。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #280 - 批量濾鏡
</p>
