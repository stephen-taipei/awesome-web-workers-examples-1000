self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'SIGN') {
        const startTime = performance.now();
        sendProgress(30, 'Generating ECDSA P-256 key pair...');
        const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
        sendProgress(60, 'Signing message...');
        const signature = await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' }, keyPair.privateKey, new TextEncoder().encode(payload.message)
        );
        self.postMessage({
            type: 'RESULT',
            payload: { signature: btoa(String.fromCharCode(...new Uint8Array(signature))), duration: performance.now() - startTime }
        });
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
