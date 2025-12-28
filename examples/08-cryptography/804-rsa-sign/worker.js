/**
 * RSA Digital Signature - Web Worker
 */
self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'SIGN') {
        try {
            const startTime = performance.now();
            sendProgress(20, 'Generating RSA key pair...');
            const keyPair = await crypto.subtle.generateKey(
                { name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
                true, ['sign', 'verify']
            );

            sendProgress(60, 'Signing message...');
            const signature = await crypto.subtle.sign(
                { name: 'RSA-PSS', saltLength: 32 },
                keyPair.privateKey,
                new TextEncoder().encode(payload.message)
            );

            sendProgress(100, 'Complete');
            self.postMessage({
                type: 'RESULT',
                payload: { signature: btoa(String.fromCharCode(...new Uint8Array(signature))), duration: performance.now() - startTime }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message } });
        }
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
