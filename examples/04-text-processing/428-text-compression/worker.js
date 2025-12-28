self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'COMPRESS') compress(payload.text);
};

function compress(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Compressing...' } });

    // Simple LZW-like compression
    const dict = {};
    let dictSize = 256;
    for (let i = 0; i < 256; i++) dict[String.fromCharCode(i)] = i;

    const result = [];
    let w = '';

    for (const c of text) {
        const wc = w + c;
        if (dict[wc] !== undefined) {
            w = wc;
        } else {
            result.push(dict[w]);
            dict[wc] = dictSize++;
            w = c;
        }
    }
    if (w) result.push(dict[w]);

    self.postMessage({ type: 'PROGRESS', payload: { percent: 70, message: 'Encoding...' } });

    // Convert to bytes and base64
    const bytes = new Uint16Array(result);
    const binary = String.fromCharCode(...new Uint8Array(bytes.buffer));
    const compressed = btoa(binary);

    const originalSize = new TextEncoder().encode(text).length;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: compressed,
            duration: performance.now() - startTime,
            stats: { original: originalSize, compressed: compressedSize, ratio }
        }
    });
}
