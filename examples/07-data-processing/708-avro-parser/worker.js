/**
 * Avro Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            processAvro(payload.schema, payload.data);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function processAvro(schema, data) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Validating schema...');

        const records = Array.isArray(data) ? data : [data];
        const stats = { records: records.length, fields: schema.fields.length, validated: 0, errors: 0 };
        const validated = [];
        const encoded = [];

        sendProgress(30, 'Processing records...');

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const validation = validateRecord(record, schema);

            if (validation.valid) {
                stats.validated++;
                validated.push(record);
                encoded.push(encodeRecord(record, schema));
            } else {
                stats.errors++;
            }

            if (i % 100 === 0) {
                sendProgress(30 + Math.floor((i / records.length) * 60), `Processing record ${i}...`);
            }
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ schema, validated, encoded, stats, duration });
    } catch (error) {
        sendError('Avro processing error: ' + error.message);
    }
}

function validateRecord(record, schema) {
    for (const field of schema.fields) {
        if (!(field.name in record)) {
            return { valid: false, error: `Missing field: ${field.name}` };
        }
        const value = record[field.name];
        const type = typeof field.type === 'string' ? field.type : field.type.type;

        if (type === 'int' && !Number.isInteger(value)) return { valid: false };
        if (type === 'string' && typeof value !== 'string') return { valid: false };
        if (type === 'boolean' && typeof value !== 'boolean') return { valid: false };
        if (type === 'double' && typeof value !== 'number') return { valid: false };
    }
    return { valid: true };
}

function encodeRecord(record, schema) {
    const bytes = [];
    for (const field of schema.fields) {
        const value = record[field.name];
        const type = typeof field.type === 'string' ? field.type : field.type.type;

        if (type === 'int') {
            bytes.push(...encodeVarint(value));
        } else if (type === 'string') {
            const strBytes = new TextEncoder().encode(value);
            bytes.push(...encodeVarint(strBytes.length));
            bytes.push(...strBytes);
        } else if (type === 'boolean') {
            bytes.push(value ? 1 : 0);
        } else if (type === 'double') {
            const buf = new ArrayBuffer(8);
            new DataView(buf).setFloat64(0, value, true);
            bytes.push(...new Uint8Array(buf));
        }
    }
    return bytes;
}

function encodeVarint(n) {
    const bytes = [];
    n = (n << 1) ^ (n >> 31);
    while (n > 0x7f) {
        bytes.push((n & 0x7f) | 0x80);
        n >>>= 7;
    }
    bytes.push(n);
    return bytes;
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
