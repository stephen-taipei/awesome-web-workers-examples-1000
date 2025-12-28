/**
 * AES Encryption - Web Worker
 * Uses Web Crypto API for AES-GCM encryption
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    if (type === 'ENCRYPT') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Generating IV...');

            const { plaintext, password, keySize } = payload;
            const encoder = new TextEncoder();

            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

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
                ['encrypt']
            );

            sendProgress(60, 'Encrypting data...');

            // Encrypt the plaintext
            const ciphertext = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(plaintext)
            );

            sendProgress(90, 'Formatting result...');

            // Convert to base64
            const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
            const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    ciphertext: ciphertextBase64,
                    iv: ivHex,
                    keySize: keySize,
                    duration: duration
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                payload: { message: error.message }
            });
        }
    }
};

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
