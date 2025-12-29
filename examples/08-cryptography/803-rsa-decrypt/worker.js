/**
 * RSA Decryption - Web Worker
 */
self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'TEST') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Generating RSA key pair...');
            const keyPair = await crypto.subtle.generateKey(
                { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
                false, ['encrypt', 'decrypt']
            );

            sendProgress(40, 'Encrypting message...');
            const encrypted = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' }, keyPair.publicKey, new TextEncoder().encode(payload.message)
            );
            const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

            sendProgress(70, 'Decrypting message...');
            const decrypted = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' }, keyPair.privateKey, encrypted
            );
            const decryptedText = new TextDecoder().decode(decrypted);

            sendProgress(100, 'Complete');
            self.postMessage({
                type: 'RESULT',
                payload: { original: payload.message, encrypted: encryptedBase64, decrypted: decryptedText, duration: performance.now() - startTime }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message } });
        }
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
