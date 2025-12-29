/**
 * Decompressor Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload.data);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function handleProcess(data) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Processing...');
        const result = processData(data);
        sendProgress(90, 'Finalizing...');
        result.duration = performance.now() - startTime;
        sendResult(result);
    } catch (error) {
        sendError('Processing error: ' + error.message);
    }
}

function processData(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let decompressed = '';
    let num = '';
    for (const char of str) {
        if (/\d/.test(char)) num += char;
        else { decompressed += char.repeat(parseInt(num) || 1); num = ''; }
    }
    return { output: { decompressed: decompressed.substring(0, 200), length: decompressed.length }, stats: { count: 1, processed: 1 } };
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
