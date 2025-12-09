# #218 訊息驗證 Message Verification

## 概述

此範例展示如何使用 **HMAC (Hash-based Message Authentication Code)** 在 Web Worker 中實現訊息完整性校驗，防止訊息在傳輸過程中被篡改。

## 功能特點

- **HMAC 簽名**：對訊息產生認證碼
- **簽名驗證**：驗證訊息是否被篡改
- **多種雜湊演算法**：支援 SHA-256、SHA-384、SHA-512
- **篡改測試**：展示 HMAC 如何偵測訊息篡改
- **金鑰管理**：支援金鑰產生與匯出

## 技術重點

### HMAC 簽名

```javascript
// 產生 HMAC 金鑰
const hmacKey = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    true,
    ['sign', 'verify']
);

// 簽名訊息
const signature = await crypto.subtle.sign(
    'HMAC',
    hmacKey,
    messageData
);

// 驗證簽名
const isValid = await crypto.subtle.verify(
    'HMAC',
    hmacKey,
    signatureData,
    messageData
);
```

### 支援的雜湊演算法

| 演算法 | 輸出長度 | 安全性 |
|--------|----------|--------|
| `SHA-256` | 32 bytes | 推薦使用 |
| `SHA-384` | 48 bytes | 高安全性 |
| `SHA-512` | 64 bytes | 最高安全性 |

## 使用方式

1. **產生金鑰**：選擇雜湊演算法，點擊「產生 HMAC 金鑰」
2. **輸入訊息**：在文字區域輸入要簽名的訊息
3. **簽名**：點擊「簽名訊息」產生 HMAC 簽名
4. **驗證**：輸入訊息和簽名，點擊「驗證簽名」
5. **篡改測試**：點擊「模擬篡改測試」查看 HMAC 如何偵測篡改

## 檔案結構

```
218-message-verification/
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
{ type: 'GENERATE_KEY', payload: { algorithm } }

// 匯出金鑰
{ type: 'EXPORT_KEY' }

// 簽名
{ type: 'SIGN', payload: { message } }

// 驗證
{ type: 'VERIFY', payload: { message, signature } }

// 篡改測試
{ type: 'TAMPER_TEST', payload: { message, signature } }
```

### Worker → 主執行緒

```javascript
// 金鑰已產生
{ type: 'KEY_GENERATED', payload: { algorithm } }

// 簽名結果
{ type: 'SIGNED', payload: { signature, signatureLength, messageSize, duration, algorithm } }

// 驗證結果
{ type: 'VERIFIED', payload: { isValid, duration } }

// 篡改測試結果
{ type: 'TAMPER_TEST_RESULT', payload: { originalValid, tamperedResults } }
```

## HMAC vs 加密

| 特性 | HMAC | 加密 |
|------|------|------|
| 目的 | 完整性驗證 | 機密性保護 |
| 輸出 | 固定長度簽名 | 與輸入等長密文 |
| 金鑰 | 雙方共享 | 可為對稱或非對稱 |
| 可逆性 | 不可逆 | 可逆 |

## 應用場景

1. **API 請求驗證**：確保 API 請求未被篡改
2. **資料完整性**：驗證儲存資料的完整性
3. **訊息認證**：確認訊息來源的真實性
4. **Session 驗證**：驗證 Session Token 的有效性

## 篡改偵測原理

HMAC 的安全性基於：

1. **金鑰保密性**：只有擁有金鑰的雙方才能產生/驗證簽名
2. **雜湊特性**：訊息的任何微小變化都會導致完全不同的簽名
3. **單向性**：無法從簽名反推原始訊息或金鑰

## 瀏覽器支援

- Chrome 37+
- Edge 12+
- Firefox 34+
- Safari 11+

## 安全注意事項

- ⚠️ HMAC 只提供完整性驗證，不提供機密性保護
- ⚠️ 金鑰需要安全地分享給通訊雙方
- ⚠️ 不應在前端存儲長期使用的金鑰
- ✅ 適合驗證 API 請求的完整性
- ✅ 可與加密結合使用 (如 AES-GCM 已內建認證)

## 相關資源

- [HMAC - MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign#hmac)
- [Web Crypto API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [HMAC - Wikipedia](https://en.wikipedia.org/wiki/HMAC)
