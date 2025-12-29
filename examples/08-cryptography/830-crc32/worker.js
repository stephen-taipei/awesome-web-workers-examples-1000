// CRC32 lookup table
const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c;
}

self.onmessage = function(e) {
    if (e.data.type === 'CALCULATE') {
        const bytes = new TextEncoder().encode(e.data.payload.text);
        let crc = 0xFFFFFFFF;

        for (let i = 0; i < bytes.length; i++) {
            crc = crc32Table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }

        crc = (crc ^ 0xFFFFFFFF) >>> 0;

        self.postMessage({
            type: 'RESULT',
            payload: {
                hex: crc.toString(16).toUpperCase().padStart(8, '0'),
                decimal: crc.toString(),
                size: bytes.length
            }
        });
    }
};
