/**
 * Salsa20 - Web Worker
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    const startTime = performance.now();

    if (type === 'ENCRYPT') {
        sendProgress(20, 'Generating nonce...');
        const nonce = crypto.getRandomValues(new Uint8Array(8));
        sendProgress(50, 'Encrypting with Salsa20...');
        const ciphertext = salsa20(payload.plaintext, payload.key, nonce);
        self.postMessage({
            type: 'ENCRYPT_RESULT',
            payload: {
                ciphertext: btoa(String.fromCharCode(...nonce) + String.fromCharCode(...ciphertext)),
                duration: performance.now() - startTime
            }
        });
    } else if (type === 'DECRYPT') {
        sendProgress(50, 'Decrypting...');
        const data = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
        const nonce = data.slice(0, 8);
        const ciphertext = data.slice(8);
        const plaintext = salsa20Decrypt(ciphertext, payload.key, nonce);
        self.postMessage({
            type: 'DECRYPT_RESULT',
            payload: { plaintext: new TextDecoder().decode(plaintext), duration: performance.now() - startTime }
        });
    }
};

function salsa20(text, key, nonce) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const keyBytes = encoder.encode(key.padEnd(32, '0').slice(0, 32));
    return xorWithKeystream(data, keyBytes, nonce);
}

function salsa20Decrypt(data, key, nonce) {
    const keyBytes = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
    return xorWithKeystream(data, keyBytes, nonce);
}

function xorWithKeystream(data, key, nonce) {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        const block = Math.floor(i / 64);
        const keystream = generateSalsa20Block(key, nonce, block);
        result[i] = data[i] ^ keystream[i % 64];
    }
    return result;
}

function generateSalsa20Block(key, nonce, counter) {
    const sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
    const state = new Uint32Array(16);

    state[0] = u8to32(sigma, 0); state[5] = u8to32(sigma, 4);
    state[10] = u8to32(sigma, 8); state[15] = u8to32(sigma, 12);
    for (let i = 0; i < 4; i++) { state[1 + i] = u8to32(key, i * 4); state[11 + i] = u8to32(key, 16 + i * 4); }
    state[6] = u8to32(nonce, 0); state[7] = u8to32(nonce, 4);
    state[8] = counter & 0xFFFFFFFF; state[9] = 0;

    const x = new Uint32Array(state);
    for (let i = 0; i < 10; i++) {
        x[ 4] ^= rotl(x[ 0]+x[12], 7); x[ 8] ^= rotl(x[ 4]+x[ 0], 9);
        x[12] ^= rotl(x[ 8]+x[ 4],13); x[ 0] ^= rotl(x[12]+x[ 8],18);
        x[ 9] ^= rotl(x[ 5]+x[ 1], 7); x[13] ^= rotl(x[ 9]+x[ 5], 9);
        x[ 1] ^= rotl(x[13]+x[ 9],13); x[ 5] ^= rotl(x[ 1]+x[13],18);
        x[14] ^= rotl(x[10]+x[ 6], 7); x[ 2] ^= rotl(x[14]+x[10], 9);
        x[ 6] ^= rotl(x[ 2]+x[14],13); x[10] ^= rotl(x[ 6]+x[ 2],18);
        x[ 3] ^= rotl(x[15]+x[11], 7); x[ 7] ^= rotl(x[ 3]+x[15], 9);
        x[11] ^= rotl(x[ 7]+x[ 3],13); x[15] ^= rotl(x[11]+x[ 7],18);
        x[ 1] ^= rotl(x[ 0]+x[ 3], 7); x[ 2] ^= rotl(x[ 1]+x[ 0], 9);
        x[ 3] ^= rotl(x[ 2]+x[ 1],13); x[ 0] ^= rotl(x[ 3]+x[ 2],18);
        x[ 6] ^= rotl(x[ 5]+x[ 4], 7); x[ 7] ^= rotl(x[ 6]+x[ 5], 9);
        x[ 4] ^= rotl(x[ 7]+x[ 6],13); x[ 5] ^= rotl(x[ 4]+x[ 7],18);
        x[11] ^= rotl(x[10]+x[ 9], 7); x[ 8] ^= rotl(x[11]+x[10], 9);
        x[ 9] ^= rotl(x[ 8]+x[11],13); x[10] ^= rotl(x[ 9]+x[ 8],18);
        x[12] ^= rotl(x[15]+x[14], 7); x[13] ^= rotl(x[12]+x[15], 9);
        x[14] ^= rotl(x[13]+x[12],13); x[15] ^= rotl(x[14]+x[13],18);
    }
    for (let i = 0; i < 16; i++) x[i] = (x[i] + state[i]) >>> 0;
    return new Uint8Array(x.buffer);
}

function u8to32(a, i) { return a[i] | (a[i+1] << 8) | (a[i+2] << 16) | (a[i+3] << 24); }
function rotl(v, n) { return ((v << n) | (v >>> (32 - n))) >>> 0; }
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
