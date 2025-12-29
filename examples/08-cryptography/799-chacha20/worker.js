/**
 * ChaCha20 - Web Worker
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    const startTime = performance.now();

    if (type === 'ENCRYPT') {
        sendProgress(20, 'Generating nonce...');
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        sendProgress(50, 'Encrypting...');
        const ciphertext = chacha20(payload.plaintext, payload.key, nonce);
        self.postMessage({
            type: 'ENCRYPT_RESULT',
            payload: {
                ciphertext: btoa(String.fromCharCode(...ciphertext)),
                nonce: Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join(''),
                duration: performance.now() - startTime
            }
        });
    } else if (type === 'DECRYPT') {
        sendProgress(50, 'Decrypting...');
        const nonce = new Uint8Array(payload.nonce.match(/.{2}/g).map(h => parseInt(h, 16)));
        const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
        const plaintext = chacha20Decrypt(ciphertext, payload.key, nonce);
        self.postMessage({
            type: 'DECRYPT_RESULT',
            payload: { plaintext: new TextDecoder().decode(plaintext), duration: performance.now() - startTime }
        });
    }
};

function chacha20(text, key, nonce) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const keyBytes = encoder.encode(key.padEnd(32, '0').slice(0, 32));
    const result = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
        const block = Math.floor(i / 64);
        const keystream = generateKeystream(keyBytes, nonce, block);
        result[i] = data[i] ^ keystream[i % 64];
    }
    return result;
}

function chacha20Decrypt(data, key, nonce) {
    const keyBytes = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
    const result = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
        const block = Math.floor(i / 64);
        const keystream = generateKeystream(keyBytes, nonce, block);
        result[i] = data[i] ^ keystream[i % 64];
    }
    return result;
}

function generateKeystream(key, nonce, counter) {
    // Simplified ChaCha20 quarter-round simulation
    const state = new Uint32Array(16);
    state[0] = 0x61707865; state[1] = 0x3320646e;
    state[2] = 0x79622d32; state[3] = 0x6b206574;
    for (let i = 0; i < 8; i++) state[4 + i] = key[i * 4] | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24);
    state[12] = counter;
    for (let i = 0; i < 3; i++) state[13 + i] = nonce[i * 4] | (nonce[i * 4 + 1] << 8) | (nonce[i * 4 + 2] << 16) | (nonce[i * 4 + 3] << 24);

    const working = new Uint32Array(state);
    for (let i = 0; i < 10; i++) {
        quarterRound(working, 0, 4, 8, 12); quarterRound(working, 1, 5, 9, 13);
        quarterRound(working, 2, 6, 10, 14); quarterRound(working, 3, 7, 11, 15);
        quarterRound(working, 0, 5, 10, 15); quarterRound(working, 1, 6, 11, 12);
        quarterRound(working, 2, 7, 8, 13); quarterRound(working, 3, 4, 9, 14);
    }
    for (let i = 0; i < 16; i++) working[i] = (working[i] + state[i]) >>> 0;
    return new Uint8Array(working.buffer);
}

function quarterRound(s, a, b, c, d) {
    s[a] = (s[a] + s[b]) >>> 0; s[d] ^= s[a]; s[d] = (s[d] << 16 | s[d] >>> 16) >>> 0;
    s[c] = (s[c] + s[d]) >>> 0; s[b] ^= s[c]; s[b] = (s[b] << 12 | s[b] >>> 20) >>> 0;
    s[a] = (s[a] + s[b]) >>> 0; s[d] ^= s[a]; s[d] = (s[d] << 8 | s[d] >>> 24) >>> 0;
    s[c] = (s[c] + s[d]) >>> 0; s[b] ^= s[c]; s[b] = (s[b] << 7 | s[b] >>> 25) >>> 0;
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
