/**
 * JSON Minify Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'MINIFY':
            minifyJSON(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function minifyJSON(text) {
    const startTime = performance.now();

    sendProgress(20, 'Parsing JSON...');

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        sendError('Invalid JSON: ' + e.message);
        return;
    }

    sendProgress(60, 'Minifying...');

    const result = JSON.stringify(parsed);

    const inputSize = text.length;
    const outputSize = result.length;
    const reduction = ((inputSize - outputSize) / inputSize * 100).toFixed(1);

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: endTime - startTime,
            stats: {
                inputSize: inputSize,
                outputSize: outputSize,
                reduction: reduction
            }
        }
    });
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
