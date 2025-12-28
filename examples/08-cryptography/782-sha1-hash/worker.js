/**
 * SHA-1 Hash Generator - Web Worker
 * Pure JavaScript SHA-1 implementation
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'HASH') {
        const startTime = performance.now();
        sendProgress(10, 'Preparing data...');

        const text = payload.text;
        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        sendProgress(30, 'Computing SHA-1...');
        const hash = sha1(data);

        sendProgress(90, 'Formatting result...');
        const duration = performance.now() - startTime;

        self.postMessage({
            type: 'RESULT',
            payload: {
                hash: hash,
                duration: duration,
                inputSize: data.length
            }
        });
    }
};

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

// SHA-1 Implementation
function sha1(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Initialize hash values
    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;

    // Pre-processing: adding padding bits
    const bitLength = bytes.length * 8;
    const paddingLength = (((bytes.length + 8) >> 6) + 1) * 64;
    const padded = new Uint8Array(paddingLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;

    // Append length in big-endian
    const view = new DataView(padded.buffer);
    view.setUint32(paddingLength - 4, bitLength >>> 0, false);

    // Process message in 512-bit chunks
    for (let i = 0; i < paddingLength; i += 64) {
        const w = new Uint32Array(80);

        // Break chunk into sixteen 32-bit big-endian words
        for (let j = 0; j < 16; j++) {
            w[j] = view.getUint32(i + j * 4, false);
        }

        // Extend the sixteen 32-bit words into eighty 32-bit words
        for (let j = 16; j < 80; j++) {
            const temp = w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16];
            w[j] = (temp << 1) | (temp >>> 31);
        }

        let a = h0, b = h1, c = h2, d = h3, e = h4;

        for (let j = 0; j < 80; j++) {
            let f, k;
            if (j < 20) {
                f = (b & c) | (~b & d);
                k = 0x5a827999;
            } else if (j < 40) {
                f = b ^ c ^ d;
                k = 0x6ed9eba1;
            } else if (j < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8f1bbcdc;
            } else {
                f = b ^ c ^ d;
                k = 0xca62c1d6;
            }

            const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) >>> 0;
            e = d;
            d = c;
            c = ((b << 30) | (b >>> 2)) >>> 0;
            b = a;
            a = temp;
        }

        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
    }

    // Convert to hex string
    function toHex(n) {
        return n.toString(16).padStart(8, '0');
    }

    return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}
