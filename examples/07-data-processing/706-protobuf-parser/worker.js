/**
 * Protobuf Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseProtobuf(new Uint8Array(payload.bytes));
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseProtobuf(bytes) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Parsing protobuf wire format...');

        const stats = { totalBytes: bytes.length, fields: 0, varints: 0, strings: 0 };
        const fields = [];
        let pos = 0;

        function readVarint() {
            let result = 0;
            let shift = 0;
            while (pos < bytes.length) {
                const byte = bytes[pos++];
                result |= (byte & 0x7F) << shift;
                if ((byte & 0x80) === 0) break;
                shift += 7;
            }
            stats.varints++;
            return result;
        }

        sendProgress(30, 'Decoding fields...');

        while (pos < bytes.length) {
            const tag = readVarint();
            const fieldNumber = tag >> 3;
            const wireType = tag & 0x7;
            stats.fields++;

            let value;
            let typeName;

            switch (wireType) {
                case 0:
                    value = readVarint();
                    typeName = 'varint';
                    break;
                case 1:
                    value = bytes.slice(pos, pos + 8);
                    pos += 8;
                    typeName = '64-bit';
                    break;
                case 2:
                    const len = readVarint();
                    value = bytes.slice(pos, pos + len);
                    pos += len;
                    try {
                        const text = new TextDecoder().decode(value);
                        if (/^[\x20-\x7E]*$/.test(text)) {
                            value = text;
                            typeName = 'string';
                            stats.strings++;
                        } else {
                            typeName = 'bytes';
                        }
                    } catch {
                        typeName = 'bytes';
                    }
                    break;
                case 5:
                    value = bytes.slice(pos, pos + 4);
                    pos += 4;
                    typeName = '32-bit';
                    break;
                default:
                    typeName = 'unknown';
                    value = null;
            }

            fields.push({ fieldNumber, wireType, typeName, value });

            if (stats.fields % 100 === 0) {
                sendProgress(30 + Math.floor((pos / bytes.length) * 60), `Decoded ${stats.fields} fields...`);
            }
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ fields, stats, duration });
    } catch (error) {
        sendError('Protobuf parse error: ' + error.message);
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
