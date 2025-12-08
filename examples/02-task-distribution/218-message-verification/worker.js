/**
 * 訊息驗證 Web Worker
 *
 * 功能：使用 HMAC 進行訊息簽名與驗證
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 負責處理 HMAC 簽名與驗證操作，
 * 確保訊息完整性並防止篡改。
 */

// ===== 狀態變數 =====

let hmacKey = null;
let currentAlgorithm = 'SHA-256';

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

        case 'SIGN':
            await handleSign(payload);
            break;

        case 'VERIFY':
            await handleVerify(payload);
            break;

        case 'TAMPER_TEST':
            await handleTamperTest(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 金鑰管理 =====

/**
 * 產生 HMAC 金鑰
 */
async function handleGenerateKey(payload) {
    const { algorithm } = payload;
    currentAlgorithm = algorithm;

    try {
        sendLog('info', `正在產生 HMAC-${algorithm} 金鑰...`);

        hmacKey = await crypto.subtle.generateKey(
            {
                name: 'HMAC',
                hash: { name: algorithm }
            },
            true,  // 可匯出
            ['sign', 'verify']
        );

        sendLog('success', 'HMAC 金鑰產生成功！');

        sendResult('KEY_GENERATED', {
            algorithm
        });

    } catch (error) {
        sendError(`金鑰產生失敗: ${error.message}`);
    }
}

/**
 * 匯出金鑰
 */
async function handleExportKey() {
    if (!hmacKey) {
        sendError('尚未產生金鑰');
        return;
    }

    try {
        sendLog('info', '正在匯出金鑰...');

        const exportedKey = await crypto.subtle.exportKey('raw', hmacKey);
        const keyHex = arrayBufferToHex(exportedKey);

        sendLog('success', '金鑰匯出成功！');

        sendResult('KEY_EXPORTED', {
            key: keyHex,
            algorithm: currentAlgorithm
        });

    } catch (error) {
        sendError(`金鑰匯出失敗: ${error.message}`);
    }
}

// ===== 簽名操作 =====

/**
 * 簽名訊息
 */
async function handleSign(payload) {
    const { message } = payload;

    if (!hmacKey) {
        sendError('請先產生 HMAC 金鑰');
        return;
    }

    const startTime = performance.now();

    try {
        sendLog('info', `正在使用 HMAC-${currentAlgorithm} 簽名訊息...`);

        // 編碼訊息
        const encoder = new TextEncoder();
        const messageData = encoder.encode(message);
        const messageSize = messageData.length;

        // 產生簽名
        const signature = await crypto.subtle.sign(
            'HMAC',
            hmacKey,
            messageData
        );

        const signatureHex = arrayBufferToHex(signature);
        const signatureLength = signature.byteLength;

        const endTime = performance.now();
        const duration = endTime - startTime;

        sendLog('success', `簽名完成！耗時 ${duration.toFixed(2)} ms`);

        sendResult('SIGNED', {
            signature: signatureHex,
            signatureLength,
            messageSize,
            duration,
            algorithm: currentAlgorithm
        });

    } catch (error) {
        sendError(`簽名失敗: ${error.message}`);
    }
}

/**
 * 驗證簽名
 */
async function handleVerify(payload) {
    const { message, signature } = payload;

    if (!hmacKey) {
        sendError('請先產生 HMAC 金鑰');
        return;
    }

    const startTime = performance.now();

    try {
        sendLog('info', '正在驗證簽名...');

        // 編碼訊息
        const encoder = new TextEncoder();
        const messageData = encoder.encode(message);

        // 解碼簽名
        const signatureData = hexToArrayBuffer(signature);

        // 驗證簽名
        const isValid = await crypto.subtle.verify(
            'HMAC',
            hmacKey,
            signatureData,
            messageData
        );

        const endTime = performance.now();
        const duration = endTime - startTime;

        if (isValid) {
            sendLog('success', '簽名驗證成功！訊息完整性確認。');
        } else {
            sendLog('warning', '簽名驗證失敗！訊息可能已被篡改。');
        }

        sendResult('VERIFIED', {
            isValid,
            duration
        });

    } catch (error) {
        sendError(`驗證失敗: ${error.message}`);
    }
}

/**
 * 篡改測試
 */
async function handleTamperTest(payload) {
    const { message, signature } = payload;

    if (!hmacKey) {
        sendError('請先產生 HMAC 金鑰');
        return;
    }

    try {
        sendLog('info', '開始篡改測試...');

        const encoder = new TextEncoder();
        const signatureData = hexToArrayBuffer(signature);

        // 測試原始訊息
        const originalData = encoder.encode(message);
        const originalValid = await crypto.subtle.verify(
            'HMAC',
            hmacKey,
            signatureData,
            originalData
        );

        sendLog('info', `原始訊息驗證: ${originalValid ? '✓ 通過' : '✗ 失敗'}`);

        // 測試篡改後的訊息 (添加字元)
        const tamperedMessage1 = message + '!';
        const tamperedData1 = encoder.encode(tamperedMessage1);
        const tampered1Valid = await crypto.subtle.verify(
            'HMAC',
            hmacKey,
            signatureData,
            tamperedData1
        );

        sendLog('info', `篡改測試 1 (添加字元): ${tampered1Valid ? '✓ 通過' : '✗ 失敗'}`);

        // 測試篡改後的訊息 (修改字元)
        const tamperedMessage2 = message.slice(0, -1) + 'X';
        const tamperedData2 = encoder.encode(tamperedMessage2);
        const tampered2Valid = await crypto.subtle.verify(
            'HMAC',
            hmacKey,
            signatureData,
            tamperedData2
        );

        sendLog('info', `篡改測試 2 (修改字元): ${tampered2Valid ? '✓ 通過' : '✗ 失敗'}`);

        // 測試篡改後的訊息 (大小寫變更)
        const tamperedMessage3 = message.toUpperCase();
        const tamperedData3 = encoder.encode(tamperedMessage3);
        const tampered3Valid = await crypto.subtle.verify(
            'HMAC',
            hmacKey,
            signatureData,
            tamperedData3
        );

        sendLog('info', `篡改測試 3 (大小寫變更): ${tampered3Valid ? '✓ 通過' : '✗ 失敗'}`);

        sendLog('success', '篡改測試完成！');

        sendResult('TAMPER_TEST_RESULT', {
            originalValid,
            tamperedResults: [
                { description: '添加字元', valid: tampered1Valid },
                { description: '修改字元', valid: tampered2Valid },
                { description: '大小寫變更', valid: tampered3Valid }
            ]
        });

    } catch (error) {
        sendError(`篡改測試失敗: ${error.message}`);
    }
}

// ===== 工具函數 =====

/**
 * ArrayBuffer 轉 Hex 字串
 */
function arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Hex 字串轉 ArrayBuffer
 */
function hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes.buffer;
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
