// LZW Compression Worker

self.onmessage = function(e) {
    const { text } = e.data;

    try {
        const startTime = performance.now();

        // Use TextEncoder to get bytes (UTF-8)
        const encoder = new TextEncoder();
        const inputBytes = encoder.encode(text);

        // LZW Compression on bytes
        const compressed = lzwCompress(inputBytes);

        // Convert compressed array to Base64
        // Use binary string workaround for btoa
        let binary = '';
        const len = compressed.length;
        // Since LZW output codes can be > 255 (up to 4096 or more), we need to handle that.
        // Standard LZW outputs 12-bit or variable bit codes.
        // For simplicity in JS example, we'll output UTF-16 characters?
        // Or we just map codes to a custom byte stream.

        // Let's assume standard JS approach: LZW output is array of numbers.
        // To make it portable/printable, we can just join with comma? Or base64 a binary packing.
        // To be compatible with 429, let's output a Base64 string representing the sequence of 16-bit codes.

        const outputBuffer = new Uint16Array(compressed);
        const outputBytes = new Uint8Array(outputBuffer.buffer);

        // Convert to Base64 (Chunked to avoid stack overflow)
        for (let i = 0; i < outputBytes.length; i++) {
            binary += String.fromCharCode(outputBytes[i]);
        }
        const resultBase64 = btoa(binary);

        const endTime = performance.now();

        const originalSize = inputBytes.length;
        const compressedSize = resultBase64.length; // Approximate size
        const ratio = ((1 - compressedSize/originalSize) * 100).toFixed(2);

        self.postMessage({
            type: 'result',
            data: {
                result: resultBase64,
                originalSize: originalSize,
                compressedSize: compressedSize,
                ratio: ratio
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

// LZW Compression (Byte based, Fixed 12-bit dictionary size logic extended)
// Actually standard LZW starts with 256 dictionary.
function lzwCompress(uncompressed) {
    const dict = new Map();
    for (let i = 0; i < 256; i++) {
        // Map string (byte sequence) to code
        // Key needs to be primitive or unique. String(char) works for single byte.
        // For sequences, we can use comma separated string.
        dict.set(String(i), i);
    }

    let currentSequence = [];
    let nextCode = 256;
    const result = [];

    for (let i = 0; i < uncompressed.length; i++) {
        const char = uncompressed[i];
        const nextSequence = currentSequence.concat(char);
        const key = nextSequence.join(',');

        if (dict.has(key)) {
            currentSequence = nextSequence;
        } else {
            const currentKey = currentSequence.join(',');
            result.push(dict.get(currentKey));

            // Add new sequence to dict
            // Limit dictionary size? For this demo, let's let it grow or reset if too big?
            // Max 16-bit code: 65535.
            if (nextCode < 65535) {
                dict.set(key, nextCode++);
            }

            currentSequence = [char];
        }
    }

    if (currentSequence.length > 0) {
        const currentKey = currentSequence.join(',');
        result.push(dict.get(currentKey));
    }

    return result;
}
