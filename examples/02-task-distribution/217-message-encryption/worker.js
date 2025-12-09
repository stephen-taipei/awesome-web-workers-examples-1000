/**
 * 訊息加密 Web Worker
 *
 * 功能：使用 Web Crypto API 進行訊息加密與解密
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 負責處理所有加密相關操作，包括金鑰生成、
 * 加密、解密等，確保金鑰不離開 Worker 環境。
 */

// ===== 狀態變數 =====

let cryptoKey = null;
let currentAlgorithm = 'AES-GCM';
let currentKeyLength = 256;

// ===== 訊息處理 =====

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'GENERATE_KEY':
            await handleGenerateKey(payload);
            break;

        case 'EXPORT_KEY':
            await handleExportKey();
            break;

        case 'IMPORT_KEY':
            await handleImportKey(payload);
            break;

        case 'ENCRYPT':
            await handleEncrypt(payload);
            break;

        case 'DECRYPT':
            await handleDecrypt(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 金鑰管理 =====

/**
 * 產生新的加密金鑰
 */
async function handleGenerateKey(payload) {
    const { algorithm, keyLength } = payload;
    currentAlgorithm = algorithm;
    currentKeyLength = keyLength;

    try {
        sendLog('info', `正在產生 ${algorithm} ${keyLength} 位元金鑰...`);

        const keyGenParams = {
            name: algorithm,
            length: keyLength
        };

        cryptoKey = await crypto.subtle.generateKey(
            keyGenParams,
            true, // 可匯出
            ['encrypt', 'decrypt']
        );

        sendLog('success', '金鑰產生成功！');

        sendResult('KEY_GENERATED', {
            algorithm,
            keyLength,
            extractable: true
        });

    } catch (error) {
        sendError(`金鑰產生失敗: ${error.message}`);
    }
}

/**
 * 匯出金鑰
 */
async function handleExportKey() {
    if (!cryptoKey) {
        sendError('尚未產生金鑰');
        return;
    }

    try {
        sendLog('info', '正在匯出金鑰...');

        const exportedKey = await crypto.subtle.exportKey('raw', cryptoKey);
        const keyArray = new Uint8Array(exportedKey);
        const keyBase64 = arrayBufferToBase64(keyArray);

        sendLog('success', '金鑰匯出成功！');

        sendResult('KEY_EXPORTED', {
            key: keyBase64,
            algorithm: currentAlgorithm,
            keyLength: currentKeyLength
        });

    } catch (error) {
        sendError(`金鑰匯出失敗: ${error.message}`);
    }
}

/**
 * 匯入金鑰
 */
async function handleImportKey(payload) {
    const { key, algorithm, keyLength } = payload;

    try {
        sendLog('info', '正在匯入金鑰...');

        const keyArray = base64ToArrayBuffer(key);

        cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyArray,
            { name: algorithm, length: keyLength },
            true,
            ['encrypt', 'decrypt']
        );

        currentAlgorithm = algorithm;
        currentKeyLength = keyLength;

        sendLog('success', '金鑰匯入成功！');

        sendResult('KEY_IMPORTED', {
            algorithm,
            keyLength
        });

    } catch (error) {
        sendError(`金鑰匯入失敗: ${error.message}`);
    }
}

// ===== 加密/解密操作 =====

/**
 * 加密訊息
 */
async function handleEncrypt(payload) {
    const { plainText } = payload;

    if (!cryptoKey) {
        sendError('請先產生或匯入金鑰');
        return;
    }

    const startTime = performance.now();

    try {
        sendLog('info', `正在使用 ${currentAlgorithm} 加密訊息...`);

        // 產生隨機 IV
        const iv = generateIV(currentAlgorithm);

        // 編碼明文
        const encoder = new TextEncoder();
        const plainData = encoder.encode(plainText);
        const plainSize = plainData.length;

        // 準備加密參數
        const encryptParams = getEncryptParams(currentAlgorithm, iv);

        // 執行加密
        const cipherData = await crypto.subtle.encrypt(
            encryptParams,
            cryptoKey,
            plainData
        );

        const cipherArray = new Uint8Array(cipherData);
        const cipherSize = cipherArray.length;

        // 合併 IV 和密文
        const combined = new Uint8Array(iv.length + cipherArray.length);
        combined.set(iv);
        combined.set(cipherArray, iv.length);

        // 轉換為 Base64
        const cipherBase64 = arrayBufferToBase64(combined);
        const ivBase64 = arrayBufferToBase64(iv);

        const endTime = performance.now();
        const duration = endTime - startTime;

        sendLog('success', `加密完成！耗時 ${duration.toFixed(2)} ms`);

        sendResult('ENCRYPTED', {
            cipherText: cipherBase64,
            iv: ivBase64,
            ivLength: iv.length,
            plainSize,
            cipherSize: combined.length,
            duration,
            algorithm: currentAlgorithm,
            keyLength: currentKeyLength
        });

    } catch (error) {
        sendError(`加密失敗: ${error.message}`);
    }
}

/**
 * 解密訊息
 */
async function handleDecrypt(payload) {
    const { cipherText } = payload;

    if (!cryptoKey) {
        sendError('請先產生或匯入金鑰');
        return;
    }

    const startTime = performance.now();

    try {
        sendLog('info', `正在使用 ${currentAlgorithm} 解密訊息...`);

        // 解碼 Base64
        const combined = base64ToArrayBuffer(cipherText);

        // 提取 IV 和密文
        const ivLength = getIVLength(currentAlgorithm);
        const iv = combined.slice(0, ivLength);
        const cipherData = combined.slice(ivLength);

        // 準備解密參數
        const decryptParams = getEncryptParams(currentAlgorithm, iv);

        // 執行解密
        const plainData = await crypto.subtle.decrypt(
            decryptParams,
            cryptoKey,
            cipherData
        );

        // 解碼明文
        const decoder = new TextDecoder();
        const plainText = decoder.decode(plainData);

        const endTime = performance.now();
        const duration = endTime - startTime;

        sendLog('success', `解密完成！耗時 ${duration.toFixed(2)} ms`);

        sendResult('DECRYPTED', {
            plainText,
            duration
        });

    } catch (error) {
        sendError(`解密失敗: ${error.message} (可能金鑰不正確)`);
    }
}

// ===== 工具函數 =====

/**
 * 產生隨機 IV
 */
function generateIV(algorithm) {
    const length = getIVLength(algorithm);
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * 取得 IV 長度
 */
function getIVLength(algorithm) {
    switch (algorithm) {
        case 'AES-GCM':
            return 12; // 96 bits for GCM
        case 'AES-CBC':
            return 16; // 128 bits for CBC
        case 'AES-CTR':
            return 16; // 128 bits for CTR
        default:
            return 16;
    }
}

/**
 * 取得加密參數
 */
function getEncryptParams(algorithm, iv) {
    switch (algorithm) {
        case 'AES-GCM':
            return {
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128
            };
        case 'AES-CBC':
            return {
                name: 'AES-CBC',
                iv: iv
            };
        case 'AES-CTR':
            return {
                name: 'AES-CTR',
                counter: iv,
                length: 64
            };
        default:
            throw new Error(`不支援的演算法: ${algorithm}`);
    }
}

/**
 * ArrayBuffer 轉 Base64
 */
function arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Base64 轉 Uint8Array
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// ===== 通訊函數 =====

function sendResult(type, payload) {
    self.postMessage({ type, payload });
}

function sendLog(level, message) {
    self.postMessage({
        type: 'LOG',
        payload: { level, message, timestamp: new Date().toISOString() }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
