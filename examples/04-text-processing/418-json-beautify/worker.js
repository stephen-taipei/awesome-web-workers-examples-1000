/**
 * JSON Beautify Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'BEAUTIFY':
            beautifyJSON(payload.text, payload.indent);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function beautifyJSON(text, indent) {
    const startTime = performance.now();

    sendProgress(20, 'Parsing JSON...');

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        sendError('Invalid JSON: ' + e.message);
        return;
    }

    sendProgress(60, 'Formatting...');

    let indentValue;
    if (indent === 'tab') {
        indentValue = '\t';
    } else {
        indentValue = parseInt(indent, 10);
    }

    const result = JSON.stringify(parsed, null, indentValue);
    const lineCount = result.split('\n').length;

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: endTime - startTime,
            stats: {
                inputSize: text.length,
                outputSize: result.length,
                lineCount: lineCount
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
