# #279 膚色優化 (Skin Tone Optimization)

> 使用 Web Worker 進行膚色檢測與優化增強

[![Difficulty: Advanced](https://img.shields.io/badge/難度-高級-red.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Image Processing](https://img.shields.io/badge/分類-圖像處理-purple.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 在背景執行緒中執行膚色檢測與優化，提升人像照片的膚色表現。

### 主要功能

- 多重色彩空間膚色檢測 (YCbCr + RGB + HSV)
- 三種優化模式選擇
- 可調整優化強度
- 即時進度回報
- 提供 Worker 與主執行緒效能比較
- 支援結果下載

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage with Transferable Objects |
| **核心演算法** | 多空間膚色檢測 + 選擇性增強 |
| **時間複雜度** | O(n) |
| **空間複雜度** | O(n) |
| **效能目標** | 1080p < 300ms |
| **難度等級** | 高級 |

---

## 檔案結構

```
279-skin-tone-optimization/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 演算法說明

### 膚色檢測

使用三種色彩空間進行膚色檢測，提高準確率：

#### 1. YCbCr 色彩空間

將 RGB 轉換為亮度 (Y) 和色度 (Cb, Cr)：

```
Y  = 0.299R + 0.587G + 0.114B
Cb = 128 - 0.168736R - 0.331264G + 0.5B
Cr = 128 + 0.5R - 0.418688G - 0.081312B
```

膚色條件：`77 ≤ Cb ≤ 127` 且 `133 ≤ Cr ≤ 173`

#### 2. RGB 規則

基於經驗的 RGB 規則：
- R > 95, G > 40, B > 20
- max(R,G,B) - min(R,G,B) > 15
- |R - G| > 15
- R > G 且 R > B

#### 3. HSV 色彩空間

膚色條件：
- 色相 H: 0° - 50°
- 飽和度 S: 0.2 - 0.68
- 明度 V: ≥ 0.35

### 綜合判斷

至少需要兩種方法判定為膚色才認定該像素為膚色區域。

### 優化模式

| 模式 | 說明 | 效果 |
|------|------|------|
| 自然增強 | 輕微提亮，均勻膚色 | 提升亮度 10%，減少綠色偏移 |
| 溫暖光澤 | 增添健康紅潤感 | 增加紅色，減少藍色 |
| 柔膚美顏 | 柔化膚色過渡 | 混合平均色，柔化對比 |

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

1. 點擊上傳區域或拖放人像照片
2. 選擇優化模式（自然/溫暖/柔膚）
3. 調整優化強度（0-100%）
4. 點擊「使用 Worker 處理」開始處理
5. 觀察處理進度與膚色檢測統計
6. 處理完成後可下載結果

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
| `START` | 開始處理 | `{ imageData, mode, strength }` |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent, message }` |
| `RESULT` | 處理結果 | `{ imageData, stats, duration }` |
| `ERROR` | 錯誤訊息 | `{ message }` |

---

## 程式碼範例

### 膚色檢測函數

```javascript
function detectSkinPixel(r, g, b) {
    // YCbCr 檢測
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const ycbcrSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);

    // RGB 規則檢測
    const rgbSkin = (r > 95) && (g > 40) && (b > 20) &&
                    (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
                    (Math.abs(r - g) > 15) && (r > g) && (r > b);

    // HSV 檢測
    // ... (計算 H, S, V)
    const hsvSkin = (h >= 0 && h <= 50) && (s >= 0.2 && s <= 0.68) && (v >= 0.35);

    // 至少兩種方法判定為膚色
    return [ycbcrSkin, rgbSkin, hsvSkin].filter(m => m).length >= 2;
}
```

---

## 效能數據

| 圖片尺寸 | Worker 耗時 | 主執行緒耗時 |
|----------|-------------|--------------|
| 640×480 | ~50ms | ~50ms (UI 凍結) |
| 1280×720 | ~120ms | ~120ms (UI 凍結) |
| 1920×1080 | ~250ms | ~250ms (UI 凍結) |
| 3840×2160 | ~900ms | ~900ms (UI 凍結) |

### Worker 優勢

1. **UI 保持流暢**：複雜的膚色檢測在背景執行
2. **進度回報**：可即時更新處理進度
3. **使用者體驗**：頁面保持可互動狀態

---

## 注意事項

- 膚色檢測結果受光線、曝光等因素影響
- 不同膚色人種的檢測效果可能有差異
- 建議在正常光線下拍攝的照片效果最佳

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
- [Skin Color Detection - Wikipedia](https://en.wikipedia.org/wiki/Skin_color)
- [YCbCr Color Space](https://en.wikipedia.org/wiki/YCbCr)

---

## 下一個範例

**#280 批次濾鏡處理** - 使用 Web Worker 進行批次圖片濾鏡處理。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #279 - 膚色優化
</p>
