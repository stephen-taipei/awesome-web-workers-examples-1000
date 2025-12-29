/**
 * AES Decryption - Web Worker
 * Uses Web Crypto API for AES-GCM decryption
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    if (type === 'DECRYPT') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Parsing input...');

            const { ciphertext, iv, password, keySize } = payload;
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();

            // Convert IV from hex
            const ivBytes = new Uint8Array(iv.match(/.{2}/g).map(b => parseInt(b, 16)));

            // Convert ciphertext from base64
            const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

            sendProgress(30, 'Deriving key from password...');

            // Derive key from password using PBKDF2
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('aes-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: keySize },
                false,
                ['decrypt']
            );

            sendProgress(60, 'Decrypting data...');

            // Decrypt the ciphertext
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBytes },
                key,
                ciphertextBytes
            );

            sendProgress(90, 'Formatting result...');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    plaintext: decoder.decode(plaintext),
                    duration: duration
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                payload: { message: 'Decryption failed. Check password, IV, and ciphertext.' }
            });
        }
    }
};

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
