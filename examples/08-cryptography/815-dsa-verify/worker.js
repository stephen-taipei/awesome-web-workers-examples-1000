self.onmessage = async function(e) {
    if (e.data.type === 'TEST') {
        const startTime = performance.now();
        sendProgress(20, 'Generating keys...');
        const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
        sendProgress(50, 'Signing...');
        const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.privateKey, new TextEncoder().encode(e.data.payload.message));
        sendProgress(80, 'Verifying...');
        const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.publicKey, signature, new TextEncoder().encode(e.data.payload.message));
        self.postMessage({ type: 'RESULT', payload: { valid, duration: performance.now() - startTime }});
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
