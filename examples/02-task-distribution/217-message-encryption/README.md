# #217 訊息加密 Message Encryption

## 概述

此範例展示如何使用 **Web Crypto API** 在 Web Worker 中實現訊息加密傳輸，確保數據傳輸的安全性和機密性。

## 功能特點

- **金鑰管理**：支援金鑰生成、匯出、匯入
- **多種演算法**：支援 AES-GCM、AES-CBC、AES-CTR
- **金鑰長度**：支援 128、192、256 位元
- **安全設計**：金鑰僅存在於 Worker 中，不暴露給主執行緒
- **隨機 IV**：每次加密使用不同的隨機初始化向量

## 技術重點

### Web Crypto API

```javascript
// 產生金鑰
const cryptoKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,  // 可匯出
    ['encrypt', 'decrypt']
);

// 加密
const cipherData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv, tagLength: 128 },
    cryptoKey,
    plainData
);

// 解密
const plainData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv, tagLength: 128 },
    cryptoKey,
    cipherData
);
```

### 支援的加密演算法

| 演算法 | 說明 | IV 長度 | 特點 |
|--------|------|---------|------|
| `AES-GCM` | 推薦使用 | 12 bytes | 提供認證加密，防止篡改 |
| `AES-CBC` | 傳統模式 | 16 bytes | 需要配合 HMAC 使用 |
| `AES-CTR` | 計數器模式 | 16 bytes | 可並行加密 |

## 使用方式

1. **產生金鑰**：選擇演算法和金鑰長度，點擊「產生新金鑰」
2. **輸入訊息**：在明文區域輸入要加密的內容
3. **加密**：點擊「加密」按鈕進行加密
4. **查看結果**：密文以 Base64 格式顯示
5. **解密**：點擊「解密」還原原始訊息
6. **金鑰管理**：可匯出/匯入金鑰以便重複使用

## 檔案結構

```
217-message-encryption/
├── index.html      # 主頁面
├── main.js         # 主執行緒腳本
├── worker.js       # Web Worker 腳本
├── style.css       # 樣式表
└── README.md       # 說明文件
```

## Worker 通訊協議

### 主執行緒 → Worker

```javascript
// 產生金鑰
{ type: 'GENERATE_KEY', payload: { algorithm, keyLength } }

// 匯出金鑰
{ type: 'EXPORT_KEY' }

// 匯入金鑰
{ type: 'IMPORT_KEY', payload: { key, algorithm, keyLength } }

// 加密
{ type: 'ENCRYPT', payload: { plainText } }

// 解密
{ type: 'DECRYPT', payload: { cipherText } }
```

### Worker → 主執行緒

```javascript
// 金鑰已產生
{ type: 'KEY_GENERATED', payload: { algorithm, keyLength, extractable } }

// 金鑰已匯出
{ type: 'KEY_EXPORTED', payload: { key, algorithm, keyLength } }

// 加密結果
{ type: 'ENCRYPTED', payload: { cipherText, iv, ivLength, plainSize, cipherSize, duration, algorithm, keyLength } }

// 解密結果
{ type: 'DECRYPTED', payload: { plainText, duration } }
```

## 安全性考量

### 優點

- ✅ 使用標準化的 Web Crypto API
- ✅ 金鑰在 Worker 中隔離
- ✅ 每次加密使用隨機 IV
- ✅ AES-GCM 提供認證加密

### 注意事項

- ⚠️ 金鑰僅存在於記憶體中，頁面重載後需重新產生
- ⚠️ 匯出的金鑰應妥善保管
- ⚠️ 此範例僅用於教學演示

## 瀏覽器支援

Web Crypto API 需要以下瀏覽器版本：

- Chrome 37+
- Edge 12+
- Firefox 34+
- Safari 11+

**注意**：Web Crypto API 只能在安全環境 (HTTPS 或 localhost) 中使用。

## 應用場景

1. **敏感數據傳輸**：在 Worker 與主執行緒間安全傳輸敏感資訊
2. **離線加密**：在瀏覽器中加密數據後儲存
3. **端對端加密**：實現客戶端加密功能
4. **安全通訊**：與後端進行加密通訊

## 相關資源

- [Web Crypto API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [SubtleCrypto - MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [AES-GCM - Wikipedia](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
