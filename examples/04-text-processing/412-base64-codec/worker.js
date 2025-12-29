/**
 * Base64 Codec Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'ENCODE':
            encodeBase64(payload.text);
            break;
        case 'DECODE':
            decodeBase64(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function encodeBase64(text) {
    const startTime = performance.now();

    sendProgress(20, 'Converting to UTF-8...');

    try {
        // Convert string to UTF-8 bytes
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);

        sendProgress(50, 'Encoding to Base64...');

        // Convert bytes to base64
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const result = btoa(binary);

        const endTime = performance.now();

        sendProgress(100, 'Done');

        self.postMessage({
            type: 'RESULT',
            payload: {
                result: result,
                duration: endTime - startTime,
                stats: {
                    inputLength: text.length,
                    outputLength: result.length,
                    operation: 'Encode'
                }
            }
        });
    } catch (e) {
        sendError('Encoding failed: ' + e.message);
    }
}

function decodeBase64(text) {
    const startTime = performance.now();

    sendProgress(20, 'Validating Base64...');

    try {
        // Clean up the input (remove whitespace)
        const cleanText = text.replace(/\s/g, '');

        sendProgress(50, 'Decoding from Base64...');

        // Decode base64 to binary
        const binary = atob(cleanText);

        // Convert binary to UTF-8
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
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
                    inputLength: text.length,
                    outputLength: result.length,
                    operation: 'Decode'
                }
            }
        });
    } catch (e) {
        sendError('Decoding failed: Invalid Base64 string');
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
