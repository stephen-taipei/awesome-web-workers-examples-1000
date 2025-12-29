self.onmessage = async function(e) {
    if (e.data.type === 'GENERATE') {
        const startTime = performance.now();
        sendProgress(50, 'Generating DSA-equivalent keys (ECDSA P-256)...');
        const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
        const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        self.postMessage({ type: 'RESULT', payload: { publicKey, duration: performance.now() - startTime }});
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
