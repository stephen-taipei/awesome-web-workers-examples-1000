/**
 * Hex Converter Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'TO_HEX':
            textToHex(payload.text);
            break;
        case 'FROM_HEX':
            hexToText(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function textToHex(text) {
    const startTime = performance.now();

    sendProgress(30, 'Converting to hex...');

    try {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);

        const hexArray = [];
        for (let i = 0; i < bytes.length; i++) {
            hexArray.push(bytes[i].toString(16).padStart(2, '0'));
        }

        const result = hexArray.join(' ');

        const endTime = performance.now();

        sendProgress(100, 'Done');

        self.postMessage({
            type: 'RESULT',
            payload: {
                result: result,
                duration: endTime - startTime,
                stats: {
                    inputLength: text.length + ' chars',
                    outputLength: hexArray.length + ' bytes'
                }
            }
        });
    } catch (e) {
        sendError('Conversion failed: ' + e.message);
    }
}

function hexToText(text) {
    const startTime = performance.now();

    sendProgress(30, 'Parsing hex...');

    try {
        // Remove common separators and prefixes
        const cleanHex = text.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');

        if (cleanHex.length % 2 !== 0) {
            sendError('Invalid hex string: odd number of characters');
            return;
        }

        sendProgress(60, 'Converting to text...');

        const bytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
        }

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
                    outputLength: result.length + ' chars'
                }
            }
        });
    } catch (e) {
        sendError('Conversion failed: ' + e.message);
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
