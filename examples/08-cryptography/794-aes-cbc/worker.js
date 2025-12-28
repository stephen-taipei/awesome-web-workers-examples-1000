/**
 * AES-CBC Encryption - Web Worker
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    if (type === 'ENCRYPT') {
        try {
            const startTime = performance.now();
            const { plaintext, password } = payload;
            const encoder = new TextEncoder();

            sendProgress(20, 'Generating IV...');
            const iv = crypto.getRandomValues(new Uint8Array(16));

            sendProgress(40, 'Deriving key...');
            const key = await deriveKey(password);

            sendProgress(60, 'Encrypting...');
            const ciphertext = await crypto.subtle.encrypt(
                { name: 'AES-CBC', iv: iv },
                key,
                encoder.encode(plaintext)
            );

            const duration = performance.now() - startTime;
            self.postMessage({
                type: 'ENCRYPT_RESULT',
                payload: {
                    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
                    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                    duration
                }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message } });
        }
    } else if (type === 'DECRYPT') {
        try {
            const startTime = performance.now();
            const { ciphertext, iv, password } = payload;
            const decoder = new TextDecoder();

            sendProgress(40, 'Deriving key...');
            const key = await deriveKey(password);

            sendProgress(70, 'Decrypting...');
            const ivBytes = new Uint8Array(iv.match(/.{2}/g).map(b => parseInt(b, 16)));
            const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-CBC', iv: ivBytes },
                key,
                ciphertextBytes
            );

            const duration = performance.now() - startTime;
            self.postMessage({
                type: 'DECRYPT_RESULT',
                payload: { plaintext: decoder.decode(plaintext), duration }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: 'Decryption failed' } });
        }
    }
};

async function deriveKey(password) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: encoder.encode('cbc-salt'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-CBC', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
