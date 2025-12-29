self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'GENERATE') {
        const startTime = performance.now();
        sendProgress(30, 'Generating ECDSA key pair...');
        const keyPair = await crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: payload.curve },
            true, ['sign', 'verify']
        );
        sendProgress(70, 'Exporting keys...');
        const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        self.postMessage({ type: 'RESULT', payload: { publicKey, duration: performance.now() - startTime }});
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
