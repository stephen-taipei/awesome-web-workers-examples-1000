/**
 * MessagePack Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseMsgPack(new Uint8Array(payload.bytes));
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseMsgPack(bytes) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Parsing MessagePack...');

        const stats = { totalBytes: bytes.length, objects: 0, arrays: 0, strings: 0 };
        let pos = 0;

        function decode() {
            if (pos >= bytes.length) return null;
            const byte = bytes[pos++];

            if (byte <= 0x7f) return byte;

            if (byte >= 0x80 && byte <= 0x8f) {
                stats.objects++;
                const size = byte & 0x0f;
                const obj = {};
                for (let i = 0; i < size; i++) {
                    const key = decode();
                    const value = decode();
                    obj[key] = value;
                }
                return obj;
            }

            if (byte >= 0x90 && byte <= 0x9f) {
                stats.arrays++;
                const size = byte & 0x0f;
                const arr = [];
                for (let i = 0; i < size; i++) {
                    arr.push(decode());
                }
                return arr;
            }

            if (byte >= 0xa0 && byte <= 0xbf) {
                stats.strings++;
                const len = byte & 0x1f;
                const str = new TextDecoder().decode(bytes.slice(pos, pos + len));
                pos += len;
                return str;
            }

            if (byte === 0xc0) return null;
            if (byte === 0xc2) return false;
            if (byte === 0xc3) return true;
            if (byte >= 0xe0) return byte - 256;

            return byte;
        }

        sendProgress(50, 'Decoding structure...');
        const decoded = decode();

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ decoded, stats, duration });
    } catch (error) {
        sendError('MessagePack parse error: ' + error.message);
    }
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

function sendResult(data) {
    self.postMessage({ type: 'RESULT', payload: data });
}

function sendError(message) {
    self.postMessage({ type: 'ERROR', payload: { message } });
}
