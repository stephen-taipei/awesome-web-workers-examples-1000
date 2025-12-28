self.onmessage = async function(e) {
    if (e.data.type === 'DERIVE') {
        const startTime = performance.now();
        sendProgress(20, 'Generating Alice\'s keys...');
        const alice = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

        sendProgress(40, 'Generating Bob\'s keys...');
        const bob = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

        sendProgress(60, 'Alice derives shared secret...');
        const aliceBits = await crypto.subtle.deriveBits(
            { name: 'ECDH', public: bob.publicKey }, alice.privateKey, 256
        );

        sendProgress(80, 'Bob derives shared secret...');
        const bobBits = await crypto.subtle.deriveBits(
            { name: 'ECDH', public: alice.publicKey }, bob.privateKey, 256
        );

        const toHex = arr => Array.from(new Uint8Array(arr)).map(b => b.toString(16).padStart(2, '0')).join('');
        const aliceSecret = toHex(aliceBits);
        const bobSecret = toHex(bobBits);

        self.postMessage({
            type: 'RESULT',
            payload: { aliceSecret, bobSecret, match: aliceSecret === bobSecret, duration: performance.now() - startTime }
        });
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
