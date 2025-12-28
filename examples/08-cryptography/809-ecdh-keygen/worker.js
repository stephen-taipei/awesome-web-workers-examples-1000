self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'GENERATE') {
        const startTime = performance.now();
        sendProgress(50, 'Generating ECDH key pair...');
        const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: payload.curve }, true, ['deriveBits']);
        const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        self.postMessage({ type: 'RESULT', payload: { publicKey, duration: performance.now() - startTime }});
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
