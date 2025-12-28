self.onmessage = function(e) {
    const { type, version, count, format } = e.data;

    if (type === 'generate') {
        const startTime = performance.now();
        const uuids = [];

        // UUID v4 generator
        function generateV4() {
            const bytes = new Uint8Array(16);
            for (let i = 0; i < 16; i++) {
                bytes[i] = Math.floor(Math.random() * 256);
            }

            // Set version (4) and variant (10xx)
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;

            return bytes;
        }

        // UUID v1 generator (simplified)
        let clockSeq = Math.floor(Math.random() * 0x3fff);
        const nodeId = new Uint8Array(6);
        for (let i = 0; i < 6; i++) {
            nodeId[i] = Math.floor(Math.random() * 256);
        }
        nodeId[0] |= 0x01; // Multicast bit

        function generateV1() {
            const bytes = new Uint8Array(16);

            // Timestamp: 100-nanosecond intervals since Oct 15, 1582
            const now = Date.now();
            const gregorianOffset = 122192928000000000n;
            const timestamp = BigInt(now) * 10000n + gregorianOffset;

            // Time low (4 bytes)
            const timeLow = Number(timestamp & 0xffffffffn);
            bytes[0] = (timeLow >> 24) & 0xff;
            bytes[1] = (timeLow >> 16) & 0xff;
            bytes[2] = (timeLow >> 8) & 0xff;
            bytes[3] = timeLow & 0xff;

            // Time mid (2 bytes)
            const timeMid = Number((timestamp >> 32n) & 0xffffn);
            bytes[4] = (timeMid >> 8) & 0xff;
            bytes[5] = timeMid & 0xff;

            // Time high and version (2 bytes)
            const timeHigh = Number((timestamp >> 48n) & 0x0fffn);
            bytes[6] = ((timeHigh >> 8) & 0x0f) | 0x10; // Version 1
            bytes[7] = timeHigh & 0xff;

            // Clock sequence
            bytes[8] = ((clockSeq >> 8) & 0x3f) | 0x80; // Variant
            bytes[9] = clockSeq & 0xff;

            // Node ID
            for (let i = 0; i < 6; i++) {
                bytes[10 + i] = nodeId[i];
            }

            clockSeq = (clockSeq + 1) & 0x3fff;

            return bytes;
        }

        function bytesToUuid(bytes, format) {
            const hex = Array.from(bytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const standard = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

            switch (format) {
                case 'compact':
                    return hex;
                case 'braces':
                    return `{${standard}}`;
                case 'urn':
                    return `urn:uuid:${standard}`;
                default:
                    return standard;
            }
        }

        const generator = version === 1 ? generateV1 : generateV4;

        for (let i = 0; i < count; i++) {
            const bytes = generator();
            uuids.push(bytesToUuid(bytes, format));

            if (i % 1000 === 0) {
                self.postMessage({
                    type: 'progress',
                    data: { progress: i / count }
                });
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                uuids: uuids,
                count: count,
                time: endTime - startTime
            }
        });
    }
};
