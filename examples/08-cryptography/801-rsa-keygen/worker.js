/**
 * RSA Key Generation - Web Worker
 */
self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'GENERATE') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Generating RSA key pair...');

            const keyPair = await crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: payload.keySize,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: 'SHA-256'
                },
                true,
                ['encrypt', 'decrypt']
            );

            sendProgress(80, 'Exporting keys...');

            const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
            const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

            self.postMessage({
                type: 'RESULT',
                payload: { publicKey, privateKey, duration: performance.now() - startTime }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message } });
        }
    }
};

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
