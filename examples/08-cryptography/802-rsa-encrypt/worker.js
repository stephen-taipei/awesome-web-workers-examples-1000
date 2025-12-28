/**
 * RSA Encryption - Web Worker
 */
self.onmessage = async function(e) {
    const { type, payload } = e.data;
    try {
        if (type === 'GENERATE_KEYS') {
            sendProgress(20, 'Generating RSA-2048 key pair...');
            const keyPair = await crypto.subtle.generateKey(
                { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
                true, ['encrypt', 'decrypt']
            );
            const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
            const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
            sendProgress(100, 'Keys generated');
            self.postMessage({ type: 'KEYS_GENERATED', payload: { publicKey, privateKey } });
        } else if (type === 'ENCRYPT') {
            const startTime = performance.now();
            sendProgress(30, 'Importing public key...');
            const publicKey = await crypto.subtle.importKey('jwk', payload.publicKey,
                { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
            sendProgress(60, 'Encrypting...');
            const encrypted = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' }, publicKey, new TextEncoder().encode(payload.plaintext)
            );
            self.postMessage({
                type: 'ENCRYPT_RESULT',
                payload: { ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))), duration: performance.now() - startTime }
            });
        }
    } catch (error) {
        self.postMessage({ type: 'ERROR', payload: { message: error.message } });
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
