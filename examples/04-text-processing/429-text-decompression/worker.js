self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'DECOMPRESS') decompress(payload.data);
};

function decompress(data) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Decoding...' } });

    try {
        // Decode base64
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const codes = new Uint16Array(bytes.buffer);

        self.postMessage({ type: 'PROGRESS', payload: { percent: 60, message: 'Decompressing...' } });

        // LZW decompression
        const dict = {};
        let dictSize = 256;
        for (let i = 0; i < 256; i++) dict[i] = String.fromCharCode(i);

        let w = String.fromCharCode(codes[0]);
        let result = w;

        for (let i = 1; i < codes.length; i++) {
            const k = codes[i];
            let entry;

            if (dict[k] !== undefined) {
                entry = dict[k];
            } else if (k === dictSize) {
                entry = w + w[0];
            } else {
                throw new Error('Invalid compressed data');
            }

            result += entry;
            dict[dictSize++] = w + entry[0];
            w = entry;
        }

        self.postMessage({
            type: 'RESULT',
            payload: { result, duration: performance.now() - startTime, stats: { length: result.length } }
        });
    } catch (e) {
        self.postMessage({ type: 'ERROR', payload: { message: e.message } });
    }
}
