/**
 * Binary Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseBinary(new Uint8Array(payload.bytes), payload.endian, payload.wordSize);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseBinary(bytes, endian, wordSize) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Analyzing binary data...');

        const view = new DataView(bytes.buffer);
        const littleEndian = endian === 'little';
        const stats = { totalBytes: bytes.length, words: 0, printableChars: 0 };
        const analysis = {
            hex: [],
            decimal: [],
            ascii: '',
            words: []
        };

        sendProgress(30, 'Processing bytes...');

        for (let i = 0; i < bytes.length; i++) {
            analysis.hex.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
            analysis.decimal.push(bytes[i]);
            analysis.ascii += (bytes[i] >= 32 && bytes[i] < 127) ? String.fromCharCode(bytes[i]) : '.';
            if (bytes[i] >= 32 && bytes[i] < 127) stats.printableChars++;

            if (i % 1000 === 0) {
                sendProgress(30 + Math.floor((i / bytes.length) * 40), `Processing byte ${i}...`);
            }
        }

        sendProgress(75, 'Analyzing words...');

        const bytesPerWord = wordSize / 8;
        for (let i = 0; i + bytesPerWord <= bytes.length; i += bytesPerWord) {
            let value;
            switch (wordSize) {
                case 8:
                    value = view.getUint8(i);
                    break;
                case 16:
                    value = view.getUint16(i, littleEndian);
                    break;
                case 32:
                    value = view.getUint32(i, littleEndian);
                    break;
            }
            analysis.words.push(value);
            stats.words++;
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ analysis, stats, duration });
    } catch (error) {
        sendError('Binary parse error: ' + error.message);
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
