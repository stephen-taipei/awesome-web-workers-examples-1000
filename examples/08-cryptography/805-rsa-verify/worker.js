/**
 * RSA Signature Verification - Web Worker
 */
self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'TEST') {
        try {
            const startTime = performance.now();
            sendProgress(20, 'Generating RSA key pair...');
            const keyPair = await crypto.subtle.generateKey(
                { name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
                false, ['sign', 'verify']
            );

            sendProgress(40, 'Signing message...');
            const signature = await crypto.subtle.sign(
                { name: 'RSA-PSS', saltLength: 32 },
                keyPair.privateKey,
                new TextEncoder().encode(payload.message)
            );

            sendProgress(70, 'Verifying signature...');
            const messageToVerify = payload.tamper ? payload.message + ' (tampered)' : payload.message;
            const valid = await crypto.subtle.verify(
                { name: 'RSA-PSS', saltLength: 32 },
                keyPair.publicKey,
                signature,
                new TextEncoder().encode(messageToVerify)
            );

            sendProgress(100, 'Complete');
            self.postMessage({
                type: 'RESULT',
                payload: { valid, duration: performance.now() - startTime }
            });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message } });
        }
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
