# #278 色彩校正 (Color Correction)

> 使用 Web Worker 和色彩矩陣進行圖片色偏校正

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Image Processing](https://img.shields.io/badge/分類-圖像處理-purple.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 在背景執行緒中執行色彩校正，消除圖片中的色偏問題。

### 主要功能

- 自動偵測或手動設定參考白點
- 使用色彩矩陣進行校正
- 支援多種標準光源預設
- 可調整校正強度
- 即時進度回報
- 提供 Worker 與主執行緒效能比較
- 支援結果下載

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage with Transferable Objects |
| **核心演算法** | 色彩矩陣變換 (Color Matrix Transformation) |
| **時間複雜度** | O(n) |
| **空間複雜度** | O(n) |
| **效能目標** | 1080p < 100ms |
| **難度等級** | 中級 |

---

## 檔案結構

```
278-color-correction/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 演算法說明

### 色彩矩陣變換

色彩校正的核心是使用對角矩陣將原始色彩空間映射到目標色彩空間。

#### 步驟

1. **偵測來源白點**：
   - 自動模式：找出圖片中最亮的像素區域
   - 預設模式：使用標準光源的色溫值

2. **計算校正矩陣**：
   ```
   matrix.r = target.r / source.r
   matrix.g = target.g / source.g
   matrix.b = target.b / source.b
   ```

3. **應用強度調整**：
   ```
   finalMatrix = 1 + (matrix - 1) × intensity
   ```

4. **像素轉換**：
   ```
   newR = oldR × matrix.r
   newG = oldG × matrix.g
   newB = oldB × matrix.b
   ```

### 標準白點參考

| 光源 | 色溫 | R | G | B |
|------|------|---|---|---|
| D65 日光 | 6500K | 0.9505 | 1.0000 | 1.0890 |
| D50 水平日光 | 5000K | 0.9642 | 1.0000 | 0.8251 |
| 鎢絲燈 | 2856K | 1.0985 | 1.0000 | 0.3558 |

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
2. 選擇白點模式（自動偵測或預設光源）
3. 調整校正強度（0-100%）
4. 點擊「使用 Worker 處理」開始處理
5. 觀察處理進度
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
| `START` | 開始處理 | `{ imageData, whitePoint, intensity }` |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent, message }` |
| `RESULT` | 處理結果 | `{ imageData, stats, duration }` |
| `ERROR` | 錯誤訊息 | `{ message }` |

---

## 程式碼範例

### 色彩矩陣校正

```javascript
function applyColorMatrix(imageData, matrix) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // 應用色彩矩陣
        data[i] = clamp(data[i] * matrix.r);
        data[i + 1] = clamp(data[i + 1] * matrix.g);
        data[i + 2] = clamp(data[i + 2] * matrix.b);
        // alpha 通道保持不變
    }

    return imageData;
}

function clamp(value) {
    return Math.min(255, Math.max(0, Math.round(value)));
}
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
- [Color Matrix - Wikipedia](https://en.wikipedia.org/wiki/Color_matrix)
- [Standard Illuminant](https://en.wikipedia.org/wiki/Standard_illuminant)

---

## 下一個範例

**#279 膚色優化** - 使用膚色檢測與增強技術優化人像照片。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #278 - 色彩校正
</p>
