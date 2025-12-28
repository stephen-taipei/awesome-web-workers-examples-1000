/**
 * Triple DES - Web Worker (Simulation)
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    const startTime = performance.now();

    if (type === 'ENCRYPT') {
        sendProgress(20, 'First DES pass...');
        const key1 = payload.key.slice(0, 8);
        const key2 = payload.key.slice(8, 16);
        const key3 = payload.key.slice(16, 24);

        let data = xorEncrypt(payload.plaintext, key1);
        sendProgress(40, 'Second DES pass...');
        data = xorEncrypt(data, key2);
        sendProgress(60, 'Third DES pass...');
        data = xorEncrypt(data, key3);

        self.postMessage({
            type: 'ENCRYPT_RESULT',
            payload: { ciphertext: btoa(data), duration: performance.now() - startTime }
        });
    } else if (type === 'DECRYPT') {
        sendProgress(20, 'First DES pass...');
        const key1 = payload.key.slice(0, 8);
        const key2 = payload.key.slice(8, 16);
        const key3 = payload.key.slice(16, 24);

        let data = atob(payload.ciphertext);
        data = xorEncrypt(data, key3);
        sendProgress(40, 'Second DES pass...');
        data = xorEncrypt(data, key2);
        sendProgress(60, 'Third DES pass...');
        data = xorEncrypt(data, key1);

        self.postMessage({
            type: 'DECRYPT_RESULT',
            payload: { plaintext: data, duration: performance.now() - startTime }
        });
    }
};

function xorEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
