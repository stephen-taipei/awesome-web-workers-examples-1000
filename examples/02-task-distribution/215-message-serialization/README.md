# #215 訊息序列化 (Message Serialization)

> 探索不同的訊息序列化格式和自訂序列化器

[![Difficulty: Intermediate](https://img.shields.io/badge/難度-中級-yellow.svg)](#)
[![Worker: Dedicated](https://img.shields.io/badge/Worker-Dedicated-blue.svg)](#)
[![Category: Communication](https://img.shields.io/badge/分類-通訊協調-orange.svg)](#)

---

## 功能說明

本範例展示不同的 **訊息序列化格式**，比較它們的效能和適用場景，幫助開發者選擇最適合的序列化方式。

### 主要功能

- 支援多種序列化格式比較
- 即時效能測試和統計
- 支援不同資料類型測試
- 視覺化比較結果
- 自訂序列化器實現

---

## 技術規格

| 項目 | 說明 |
|------|------|
| **Worker 類型** | Dedicated Worker |
| **通訊模式** | 可配置序列化 |
| **支援格式** | JSON, Structured Clone, MessagePack, Custom |
| **效能測試** | 序列化/反序列化時間, 資料大小 |
| **難度等級** | 中級 |

---

## 檔案結構

```
215-message-serialization/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件 (本檔案)
```

---

## 使用方式

### 本地運行

1. 使用 HTTP 伺服器啟動專案：

```bash
# 使用 Node.js
npx serve .

# 或使用 Python
python -m http.server 8000
```

2. 開啟瀏覽器訪問：`http://localhost:8000/examples/02-task-distribution/215-message-serialization/`

### 操作說明

1. **選擇格式**：點選要測試的序列化格式
2. **選擇資料類型**：選擇測試資料類型
3. **執行測試**：點擊「執行測試」或「比較所有格式」
4. **查看結果**：分析效能數據和比較結果

---

## 序列化格式比較

### JSON

```javascript
// 序列化
const serialized = JSON.stringify(data);

// 反序列化
const deserialized = JSON.parse(serialized);
```

**優點**：
- 廣泛支援，易於閱讀和偵錯
- 原生支援，無需額外函式庫

**缺點**：
- 不支援某些資料類型 (Date, Map, Set, ArrayBuffer)
- 文字格式，資料較大

### Structured Clone (瀏覽器原生)

```javascript
// postMessage 自動處理序列化
worker.postMessage(data);

// Worker 中直接使用
self.onmessage = (event) => {
    const data = event.data;  // 已自動反序列化
};
```

**優點**：
- 支援更多資料類型 (Map, Set, Date, RegExp, Blob, File)
- 瀏覽器原生最佳化
- 無需手動序列化

**缺點**：
- 不支援 Function, Symbol
- 無法自訂序列化邏輯

### MessagePack (二進位格式)

```javascript
// 需要 msgpack-lite 或類似函式庫
const encoded = msgpack.encode(data);
const decoded = msgpack.decode(encoded);
```

**優點**：
- 二進位格式，資料更小
- 序列化/反序列化速度快

**缺點**：
- 需要額外函式庫
- 偵錯較困難

### 自訂格式

```javascript
// 針對特定資料結構優化
const serializer = {
    serialize: (data) => {
        // 數值陣列使用 TypedArray
        if (Array.isArray(data) && data.every(n => typeof n === 'number')) {
            return new Float64Array(data).buffer;
        }
        return JSON.stringify(data);
    },
    deserialize: (buffer) => {
        if (buffer instanceof ArrayBuffer) {
            return Array.from(new Float64Array(buffer));
        }
        return JSON.parse(buffer);
    }
};
```

**優點**：
- 針對特定需求優化
- 可達到最佳效能

**缺點**：
- 需要額外開發維護
- 通用性較低

---

## Transferable Objects

對於大型二進位資料，使用 Transferable Objects 可以實現零拷貝傳輸：

```javascript
// 建立 ArrayBuffer
const buffer = new ArrayBuffer(1024 * 1024);

// 使用 Transferable 傳輸 (零拷貝)
worker.postMessage({ buffer }, [buffer]);

// 注意：傳輸後原始 buffer 將無法使用
console.log(buffer.byteLength);  // 0
```

### 支援的 Transferable 類型

- ArrayBuffer
- MessagePort
- ReadableStream
- WritableStream
- TransformStream
- ImageBitmap
- OffscreenCanvas

---

## 效能測試結果範例

| 格式 | 序列化 | 反序列化 | 資料大小 |
|------|--------|----------|----------|
| JSON | 0.5ms | 0.3ms | 2.5KB |
| Structured Clone | 0.2ms | 0.1ms | 2.5KB |
| MessagePack | 0.3ms | 0.2ms | 1.8KB |
| Custom (TypedArray) | 0.1ms | 0.05ms | 0.8KB |

*實際效能會因資料類型和瀏覽器而異*

---

## 程式碼範例

### 可配置的序列化層

```javascript
class SerializationLayer {
    constructor(format = 'json') {
        this.format = format;
        this.serializers = {
            json: {
                serialize: JSON.stringify,
                deserialize: JSON.parse
            },
            // 其他格式...
        };
    }

    send(worker, data) {
        const serializer = this.serializers[this.format];
        const serialized = serializer.serialize(data);

        worker.postMessage({
            format: this.format,
            data: serialized
        });
    }

    receive(event) {
        const { format, data } = event.data;
        const serializer = this.serializers[format];
        return serializer.deserialize(data);
    }
}

// 使用
const layer = new SerializationLayer('json');
layer.send(worker, { message: 'Hello' });
```

### 效能測試函數

```javascript
function benchmark(serializer, data, iterations = 100) {
    const serializeTimes = [];
    const deserializeTimes = [];

    for (let i = 0; i < iterations; i++) {
        // 序列化
        const startSerialize = performance.now();
        const serialized = serializer.serialize(data);
        serializeTimes.push(performance.now() - startSerialize);

        // 反序列化
        const startDeserialize = performance.now();
        serializer.deserialize(serialized);
        deserializeTimes.push(performance.now() - startDeserialize);
    }

    return {
        avgSerialize: average(serializeTimes),
        avgDeserialize: average(deserializeTimes),
        dataSize: getSize(serializer.serialize(data))
    };
}
```

---

## 選擇建議

| 場景 | 建議格式 |
|------|----------|
| 一般用途 | Structured Clone |
| 需要偵錯 | JSON |
| 大量數值資料 | Custom (TypedArray) |
| 減少傳輸大小 | MessagePack |
| 跨平台相容 | JSON |

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

- [MDN Structured Clone Algorithm](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
- [MDN Transferable Objects](https://developer.mozilla.org/zh-TW/docs/Web/API/Web_Workers_API/Transferable_objects)
- [MessagePack](https://msgpack.org/)

---

## 下一個範例

**#216 通道多工** - 在單一 Worker 上實現多通道通訊。

---

<p align="center">
  <b>Awesome Web Workers Examples 1000</b><br>
  範例 #215 - 訊息序列化
</p>
