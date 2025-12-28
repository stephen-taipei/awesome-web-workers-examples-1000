/**
 * DES Encryption - Web Worker
 * Simplified DES-like simulation (for educational purposes)
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    if (type === 'ENCRYPT') {
        try {
            const startTime = performance.now();
            const { plaintext, key } = payload;

            sendProgress(30, 'Processing blocks...');
            const ciphertext = desEncrypt(plaintext, key);

            const duration = performance.now() - startTime;
            self.postMessage({
                type: 'ENCRYPT_RESULT',
                payload: { ciphertext, duration }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message } });
        }
    } else if (type === 'DECRYPT') {
        try {
            const startTime = performance.now();
            const { ciphertext, key } = payload;

            sendProgress(30, 'Processing blocks...');
            const plaintext = desDecrypt(ciphertext, key);

            const duration = performance.now() - startTime;
            self.postMessage({
                type: 'DECRYPT_RESULT',
                payload: { plaintext, duration }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: 'Decryption failed' } });
        }
    }
};

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

// Simplified DES-like encryption (XOR-based for demonstration)
function desEncrypt(plaintext, key) {
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    const keyBytes = encoder.encode(key);

    // Pad to 8-byte blocks
    const paddedLength = Math.ceil(plaintextBytes.length / 8) * 8;
    const padded = new Uint8Array(paddedLength);
    padded.set(plaintextBytes);

    // PKCS5 padding
    const padValue = paddedLength - plaintextBytes.length || 8;
    for (let i = plaintextBytes.length; i < paddedLength; i++) {
        padded[i] = padValue;
    }

    sendProgress(50, 'Encrypting...');

    // Simple Feistel-like rounds
    const result = new Uint8Array(paddedLength);
    for (let block = 0; block < paddedLength; block += 8) {
        for (let round = 0; round < 16; round++) {
            for (let i = 0; i < 8; i++) {
                const keyByte = keyBytes[(i + round) % 8];
                const sboxValue = sbox[(padded[block + i] + keyByte + round) % 256];
                result[block + i] = padded[block + i] ^ sboxValue ^ keyByte;
                padded[block + i] = result[block + i];
            }
        }
    }

    sendProgress(90, 'Encoding...');

    // Convert to hex
    return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
}

function desDecrypt(ciphertext, key) {
    const keyBytes = new TextEncoder().encode(key);

    // Parse hex
    const ciphertextBytes = new Uint8Array(
        ciphertext.match(/.{2}/g).map(h => parseInt(h, 16))
    );

    sendProgress(50, 'Decrypting...');

    // Reverse Feistel-like rounds
    const result = new Uint8Array(ciphertextBytes.length);
    result.set(ciphertextBytes);

    for (let block = 0; block < result.length; block += 8) {
        for (let round = 15; round >= 0; round--) {
            const temp = new Uint8Array(8);
            for (let i = 0; i < 8; i++) {
                const keyByte = keyBytes[(i + round) % 8];
                // Find original value by trying all possibilities
                for (let orig = 0; orig < 256; orig++) {
                    const sboxValue = sbox[(orig + keyByte + round) % 256];
                    if ((orig ^ sboxValue ^ keyByte) === result[block + i]) {
                        temp[i] = orig;
                        break;
                    }
                }
            }
            for (let i = 0; i < 8; i++) {
                result[block + i] = temp[i];
            }
        }
    }

    // Remove PKCS5 padding
    const padValue = result[result.length - 1];
    const unpaddedLength = result.length - padValue;

    return new TextDecoder().decode(result.slice(0, unpaddedLength));
}

// Simple S-box
const sbox = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
    sbox[i] = (i * 167 + 73) % 256;
}
