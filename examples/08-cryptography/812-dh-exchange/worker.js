// DH Exchange - Using ECDH as underlying implementation
self.onmessage = async function(e) {
    if (e.data.type === 'EXCHANGE') {
        const startTime = performance.now();
        sendProgress(20, 'Generating Alice\'s DH keys...');
        const alice = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);

        sendProgress(40, 'Generating Bob\'s DH keys...');
        const bob = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);

        sendProgress(60, 'Computing shared secret...');
        const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: bob.publicKey }, alice.privateKey, 256);

        sendProgress(80, 'Deriving symmetric key...');
        const sharedKey = await crypto.subtle.importKey('raw', sharedBits, { name: 'AES-GCM' }, false, ['encrypt']);
        const exportedKey = await crypto.subtle.exportKey('raw', await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']));

        const sharedSecret = Array.from(new Uint8Array(sharedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
        self.postMessage({ type: 'RESULT', payload: { sharedSecret, duration: performance.now() - startTime }});
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
