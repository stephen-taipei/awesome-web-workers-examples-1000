/**
 * Scrypt Key Derivation - Web Worker
 * Pure JavaScript Scrypt implementation
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;
    if (type === 'DERIVE') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Preparing...');

            const { password, salt, N, r, p, dkLen } = payload;
            const encoder = new TextEncoder();

            const passwordBytes = encoder.encode(password);
            const saltBytes = encoder.encode(salt);

            sendProgress(20, 'Running Scrypt...');

            const key = await scrypt(passwordBytes, saltBytes, N, r, p, dkLen);

            sendProgress(90, 'Formatting result...');

            const keyHex = Array.from(key)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    key: keyHex,
                    N: N,
                    r: r,
                    p: p,
                    duration: duration
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                payload: { message: error.message }
            });
        }
    }
};

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

// Scrypt implementation using PBKDF2-HMAC-SHA256
async function scrypt(password, salt, N, r, p, dkLen) {
    // Validate parameters
    if (N <= 1 || (N & (N - 1)) !== 0) {
        throw new Error('N must be a power of 2 greater than 1');
    }

    const MFLen = 128 * r;

    // Generate initial key material using PBKDF2
    const B = await pbkdf2(password, salt, 1, p * MFLen);

    sendProgress(30, 'Processing blocks...');

    // Process each block
    const blockSize = MFLen;
    for (let i = 0; i < p; i++) {
        const block = B.subarray(i * blockSize, (i + 1) * blockSize);
        scryptROMix(block, N, r);
        sendProgress(30 + Math.floor((i + 1) / p * 50), `Processing block ${i + 1}/${p}...`);
    }

    sendProgress(85, 'Deriving final key...');

    // Derive the final key
    return await pbkdf2(password, B, 1, dkLen);
}

// PBKDF2 using Web Crypto API
async function pbkdf2(password, salt, iterations, dkLen) {
    const key = await crypto.subtle.importKey(
        'raw',
        password,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        key,
        dkLen * 8
    );

    return new Uint8Array(bits);
}

// ScryptROMix
function scryptROMix(B, N, r) {
    const X = new Uint32Array(32 * r);
    const V = new Array(N);

    // Copy B to X
    const view = new DataView(B.buffer, B.byteOffset, B.byteLength);
    for (let i = 0; i < 32 * r; i++) {
        X[i] = view.getUint32(i * 4, true);
    }

    // Build table V
    for (let i = 0; i < N; i++) {
        V[i] = X.slice();
        scryptBlockMix(X, r);
    }

    // Mix with table
    for (let i = 0; i < N; i++) {
        const j = X[16 * (2 * r - 1)] % N;
        for (let k = 0; k < 32 * r; k++) {
            X[k] ^= V[j][k];
        }
        scryptBlockMix(X, r);
    }

    // Copy X back to B
    for (let i = 0; i < 32 * r; i++) {
        view.setUint32(i * 4, X[i], true);
    }
}

// ScryptBlockMix
function scryptBlockMix(B, r) {
    const X = new Uint32Array(16);
    const Y = new Uint32Array(32 * r);

    // Copy last block to X
    for (let i = 0; i < 16; i++) {
        X[i] = B[16 * (2 * r - 1) + i];
    }

    for (let i = 0; i < 2 * r; i++) {
        // XOR
        for (let j = 0; j < 16; j++) {
            X[j] ^= B[16 * i + j];
        }

        // Salsa20/8
        salsa20_8(X);

        // Copy to Y
        const dest = i < r ? i * 2 : (i - r) * 2 + 1;
        for (let j = 0; j < 16; j++) {
            Y[16 * dest + j] = X[j];
        }
    }

    // Copy Y back to B
    for (let i = 0; i < 32 * r; i++) {
        B[i] = Y[i];
    }
}

// Salsa20/8 core
function salsa20_8(B) {
    const x = B.slice();

    for (let i = 0; i < 8; i += 2) {
        x[ 4] ^= rotl32(x[ 0] + x[12], 7);
        x[ 8] ^= rotl32(x[ 4] + x[ 0], 9);
        x[12] ^= rotl32(x[ 8] + x[ 4], 13);
        x[ 0] ^= rotl32(x[12] + x[ 8], 18);
        x[ 9] ^= rotl32(x[ 5] + x[ 1], 7);
        x[13] ^= rotl32(x[ 9] + x[ 5], 9);
        x[ 1] ^= rotl32(x[13] + x[ 9], 13);
        x[ 5] ^= rotl32(x[ 1] + x[13], 18);
        x[14] ^= rotl32(x[10] + x[ 6], 7);
        x[ 2] ^= rotl32(x[14] + x[10], 9);
        x[ 6] ^= rotl32(x[ 2] + x[14], 13);
        x[10] ^= rotl32(x[ 6] + x[ 2], 18);
        x[ 3] ^= rotl32(x[15] + x[11], 7);
        x[ 7] ^= rotl32(x[ 3] + x[15], 9);
        x[11] ^= rotl32(x[ 7] + x[ 3], 13);
        x[15] ^= rotl32(x[11] + x[ 7], 18);
        x[ 1] ^= rotl32(x[ 0] + x[ 3], 7);
        x[ 2] ^= rotl32(x[ 1] + x[ 0], 9);
        x[ 3] ^= rotl32(x[ 2] + x[ 1], 13);
        x[ 0] ^= rotl32(x[ 3] + x[ 2], 18);
        x[ 6] ^= rotl32(x[ 5] + x[ 4], 7);
        x[ 7] ^= rotl32(x[ 6] + x[ 5], 9);
        x[ 4] ^= rotl32(x[ 7] + x[ 6], 13);
        x[ 5] ^= rotl32(x[ 4] + x[ 7], 18);
        x[11] ^= rotl32(x[10] + x[ 9], 7);
        x[ 8] ^= rotl32(x[11] + x[10], 9);
        x[ 9] ^= rotl32(x[ 8] + x[11], 13);
        x[10] ^= rotl32(x[ 9] + x[ 8], 18);
        x[12] ^= rotl32(x[15] + x[14], 7);
        x[13] ^= rotl32(x[12] + x[15], 9);
        x[14] ^= rotl32(x[13] + x[12], 13);
        x[15] ^= rotl32(x[14] + x[13], 18);
    }

    for (let i = 0; i < 16; i++) {
        B[i] = (B[i] + x[i]) >>> 0;
    }
}

function rotl32(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
}
