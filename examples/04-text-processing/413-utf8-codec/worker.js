/**
 * UTF-8 Codec Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'ENCODE':
            encodeUTF8(payload.text);
            break;
        case 'DECODE':
            decodeUTF8(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function encodeUTF8(text) {
    const startTime = performance.now();

    sendProgress(30, 'Encoding to UTF-8...');

    try {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);

        sendProgress(70, 'Converting to array...');

        // Convert to array format for display
        const byteArray = Array.from(bytes);
        const result = '[' + byteArray.join(', ') + ']';

        // Also create hex representation
        const hexString = byteArray.map(b => b.toString(16).padStart(2, '0')).join(' ');

        const endTime = performance.now();

        sendProgress(100, 'Done');

        self.postMessage({
            type: 'RESULT',
            payload: {
                result: `Byte Array:\n${result}\n\nHex:\n${hexString}`,
                duration: endTime - startTime,
                stats: {
                    inputLength: text.length + ' characters',
                    outputLength: bytes.length + ' bytes',
                    operation: 'Encode'
                }
            }
        });
    } catch (e) {
        sendError('Encoding failed: ' + e.message);
    }
}

function decodeUTF8(text) {
    const startTime = performance.now();

    sendProgress(30, 'Parsing byte array...');

    try {
        // Try to parse as byte array [1, 2, 3] or hex string "48 65 6c 6c 6f"
        let bytes;

        if (text.trim().startsWith('[')) {
            // Parse as array
            const numbers = text.match(/\d+/g);
            if (numbers) {
                bytes = new Uint8Array(numbers.map(n => parseInt(n, 10)));
            }
        } else if (/^[0-9a-fA-F\s]+$/.test(text.trim())) {
            // Parse as hex string
            const hexValues = text.trim().split(/\s+/);
            bytes = new Uint8Array(hexValues.map(h => parseInt(h, 16)));
        } else {
            sendError('Invalid format. Use [byte array] or hex string.');
            return;
        }

        sendProgress(70, 'Decoding UTF-8...');

        const decoder = new TextDecoder('utf-8');
        const result = decoder.decode(bytes);

        const endTime = performance.now();

        sendProgress(100, 'Done');

        self.postMessage({
            type: 'RESULT',
            payload: {
                result: result,
                duration: endTime - startTime,
                stats: {
                    inputLength: bytes.length + ' bytes',
                    outputLength: result.length + ' characters',
                    operation: 'Decode'
                }
            }
        });
    } catch (e) {
        sendError('Decoding failed: ' + e.message);
    }
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
