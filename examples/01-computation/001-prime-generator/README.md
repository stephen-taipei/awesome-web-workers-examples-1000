# #001 質數產生器 (Prime Generator)

> 使用 Web Worker 和埃拉托斯特尼篩法計算指定範圍內的所有質數

[![Difficulty: Beginner](https://img.shields.io/badge/難度-初級-green.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Computation](https://img.shields.io/badge/分類-計算密集型-orange.svg)](#)

---

## 功能說明

本範例展示如何使用 Web Worker 在背景執行緒中執行計算密集型任務，避免阻塞主執行緒 UI。

### 主要功能

- 計算指定範圍內的所有質數
- 使用高效的埃拉托斯特尼篩法 (Sieve of Eratosthenes)
- 即時進度回報
- 支援中斷計算
- 提供 Worker 與主執行緒效能比較

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | postMessage |
| **核心演算法** | 埃拉托斯特尼篩法 |
| **時間複雜度** | O(n log log n) |
| **空間複雜度** | O(n) |
| **難度等級** | 初級 |

---

## 檔案結構

```
001-prime-generator/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 使用方式

### 本地運行

1. 使用 HTTP 伺服器啟動專案 (Web Worker 需要 HTTP 協定)：

```bash
# 使用 Node.js
npx serve .

# 或使用 Python
python -m http.server 8000
```

2. 開啟瀏覽器訪問：`http://localhost:8000/examples/01-computation/001-prime-generator/`

### 操作說明

1. 輸入起始數字和結束數字 (或使用快速設定按鈕)
2. 點擊「使用 Worker 計算」開始計算
3. 觀察進度條更新
4. 計算完成後查看結果

### 效能比較

點擊「使用主執行緒計算」可在主執行緒執行相同計算，用於比較 Worker 的效能優勢。

> ⚠️ 注意：大範圍計算在主執行緒會導致頁面暫時無回應

---

## Worker 通訊模式

### 訊息格式

所有訊息採用統一格式：

```javascript
{
    type: string,    // 訊息類型
    payload: any     // 訊息內容
}
```

### 主執行緒 → Worker

| 類型 | 說明 | Payload |
|------|------|---------|
| `START` | 開始計算 | `{ start: number, end: number }` |
| `STOP` | 停止計算 | - |

### Worker → 主執行緒

| 類型 | 說明 | Payload |
|------|------|---------|
| `PROGRESS` | 進度更新 | `{ percent: number, message: string }` |
| `RESULT` | 計算結果 | `{ primes: number[], count: number, duration: number }` |
| `ERROR` | 錯誤訊息 | `{ message: string }` |

---

## 程式碼範例

### 建立 Worker

```javascript
// 建立 Worker 實例
const worker = new Worker('worker.js');

// 設定訊息處理器
worker.onmessage = (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            console.log(`進度: ${payload.percent}%`);
            break;
        case 'RESULT':
            console.log(`找到 ${payload.count} 個質數`);
            break;
    }
};

// 開始計算
worker.postMessage({
    type: 'START',
    payload: { start: 2, end: 1000000 }
});
```

### Worker 內部處理

```javascript
self.onmessage = (event) => {
    const { type, payload } = event.data;

    if (type === 'START') {
        // 執行計算並回報進度
        const primes = calculatePrimes(payload.start, payload.end);

        // 發送結果
        self.postMessage({
            type: 'RESULT',
            payload: { primes, count: primes.length }
        });
    }
};
```

---

## 效能數據

以下為不同範圍的預期效能 (實際效能因硬體而異)：

| 範圍 | 質數數量 | Worker 耗時 | 主執行緒耗時 |
|------|----------|-------------|--------------|
| 1 - 10,000 | 1,229 | ~5ms | ~5ms |
| 1 - 100,000 | 9,592 | ~15ms | ~15ms |
| 1 - 1,000,000 | 78,498 | ~100ms | ~100ms (UI 凍結) |
| 1 - 10,000,000 | 664,579 | ~800ms | ~800ms (UI 凍結) |
| 1 - 100,000,000 | 5,761,455 | ~10s | ~10s (UI 凍結) |

### Worker 優勢

雖然計算時間相近，但使用 Worker 的主要優勢是：

1. **UI 保持流暢**：計算在背景執行，不阻塞主執行緒
2. **可中斷計算**：支援隨時取消長時間運行的計算
3. **進度回報**：可即時更新計算進度
4. **使用者體驗**：頁面保持可互動狀態

---

## 演算法說明

### 埃拉托斯特尼篩法

這是一個古老但高效的質數篩選演算法，由古希臘數學家埃拉托斯特尼提出。

#### 步驟

1. 建立 2 到 n 的數字列表
2. 從最小的質數 2 開始
3. 將該質數的所有倍數標記為非質數
4. 找到下一個未被標記的數字，重複步驟 3
5. 當檢查到 √n 時停止

#### 視覺化範例 (找出 1-30 的質數)

```
初始: 2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30

標記 2 的倍數:
      2  3  ✗  5  ✗  7  ✗  9  ✗  11 ✗  13 ✗  15 ✗  17 ✗  19 ✗  21 ✗  23 ✗  25 ✗  27 ✗  29 ✗

標記 3 的倍數:
      2  3  ✗  5  ✗  7  ✗  ✗  ✗  11 ✗  13 ✗  ✗  ✗  17 ✗  19 ✗  ✗  ✗  23 ✗  25 ✗  ✗  ✗  29 ✗

標記 5 的倍數:
      2  3  ✗  5  ✗  7  ✗  ✗  ✗  11 ✗  13 ✗  ✗  ✗  17 ✗  19 ✗  ✗  ✗  23 ✗  ✗  ✗  ✗  ✗  29 ✗

結果: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29
```

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
- [埃拉托斯特尼篩法 - 維基百科](https://zh.wikipedia.org/wiki/埃拉托斯特尼筛法)

---

## 下一個範例

**#002 費波那契數列** - 使用 Web Worker 計算費波那契數列，展示 BigInt 在 Worker 中的應用。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #001 - 質數產生器
</p>
