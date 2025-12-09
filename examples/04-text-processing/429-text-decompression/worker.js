// LZW Decompression Worker

self.onmessage = function(e) {
    const { compressed } = e.data;

    try {
        const startTime = performance.now();

        // Decode Base64 to Uint16Array codes
        const binary = atob(compressed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const codes = new Uint16Array(bytes.buffer);

        const resultBytes = lzwDecompress(codes);

        // Decode UTF-8 bytes to string
        const decoder = new TextDecoder();
        const resultText = decoder.decode(new Uint8Array(resultBytes));

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                result: resultText,
                size: resultBytes.length
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function lzwDecompress(compressed) {
    // Initialize Dictionary with 0-255
    const dict = new Map();
    for (let i = 0; i < 256; i++) {
        dict.set(i, [i]);
    }

    let nextCode = 256;
    let w = [compressed[0]];
    let result = [...w]; // Result is array of bytes

    for (let i = 1; i < compressed.length; i++) {
        const k = compressed[i];
        let entry;

        if (dict.has(k)) {
            entry = dict.get(k);
        } else if (k === nextCode) {
            entry = w.concat([w[0]]);
        } else {
            throw new Error("Bad compression code: " + k);
        }

        result = result.concat(entry);

        // Add w+entry[0] to dict
        if (nextCode < 65535) {
            dict.set(nextCode++, w.concat([entry[0]]));
        }

        w = entry;
    }

    return result;
}
