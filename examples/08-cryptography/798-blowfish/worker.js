/**
 * Blowfish - Web Worker (Simplified Simulation)
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    const startTime = performance.now();

    if (type === 'ENCRYPT') {
        sendProgress(30, 'Initializing P-array...');
        const encrypted = blowfishEncrypt(payload.plaintext, payload.key);
        sendProgress(100, 'Complete');
        self.postMessage({
            type: 'ENCRYPT_RESULT',
            payload: { ciphertext: encrypted, duration: performance.now() - startTime }
        });
    } else if (type === 'DECRYPT') {
        sendProgress(30, 'Decrypting...');
        const decrypted = blowfishDecrypt(payload.ciphertext, payload.key);
        sendProgress(100, 'Complete');
        self.postMessage({
            type: 'DECRYPT_RESULT',
            payload: { plaintext: decrypted, duration: performance.now() - startTime }
        });
    }
};

function blowfishEncrypt(text, key) {
    // Simplified Blowfish-like encryption
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const keyBytes = encoder.encode(key);

    // Pad to 8-byte blocks
    const padLen = 8 - (data.length % 8);
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) padded[i] = padLen;

    // 16 rounds of Feistel-like cipher
    for (let round = 0; round < 16; round++) {
        sendProgress(30 + round * 4, `Round ${round + 1}/16...`);
        for (let i = 0; i < padded.length; i += 8) {
            let L = (padded[i] << 24) | (padded[i+1] << 16) | (padded[i+2] << 8) | padded[i+3];
            let R = (padded[i+4] << 24) | (padded[i+5] << 16) | (padded[i+6] << 8) | padded[i+7];
            const keyPart = keyBytes[round % keyBytes.length];
            L ^= F(R, keyPart);
            [L, R] = [R, L];
            padded[i] = (L >> 24) & 0xFF; padded[i+1] = (L >> 16) & 0xFF;
            padded[i+2] = (L >> 8) & 0xFF; padded[i+3] = L & 0xFF;
            padded[i+4] = (R >> 24) & 0xFF; padded[i+5] = (R >> 16) & 0xFF;
            padded[i+6] = (R >> 8) & 0xFF; padded[i+7] = R & 0xFF;
        }
    }
    return btoa(String.fromCharCode(...padded));
}

function blowfishDecrypt(ciphertext, key) {
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(key);

    // 16 rounds reverse
    for (let round = 15; round >= 0; round--) {
        for (let i = 0; i < data.length; i += 8) {
            let L = (data[i] << 24) | (data[i+1] << 16) | (data[i+2] << 8) | data[i+3];
            let R = (data[i+4] << 24) | (data[i+5] << 16) | (data[i+6] << 8) | data[i+7];
            [L, R] = [R, L];
            const keyPart = keyBytes[round % keyBytes.length];
            L ^= F(R, keyPart);
            data[i] = (L >> 24) & 0xFF; data[i+1] = (L >> 16) & 0xFF;
            data[i+2] = (L >> 8) & 0xFF; data[i+3] = L & 0xFF;
            data[i+4] = (R >> 24) & 0xFF; data[i+5] = (R >> 16) & 0xFF;
            data[i+6] = (R >> 8) & 0xFF; data[i+7] = R & 0xFF;
        }
    }

    // Remove padding
    const padLen = data[data.length - 1];
    return new TextDecoder().decode(data.slice(0, data.length - padLen));
}

function F(x, key) {
    return ((x * 0x5bd1e995) ^ (key * 0x1b873593)) >>> 0;
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
