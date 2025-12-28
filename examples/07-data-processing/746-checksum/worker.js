/**
 * Checksum Web Worker
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
    let checksum = 1;
    let s1 = 1, s2 = 0;
    for (let i = 0; i < str.length; i++) {
        s1 = (s1 + str.charCodeAt(i)) % 65521;
        s2 = (s2 + s1) % 65521;
    }
    checksum = (s2 << 16) | s1;
    return { output: { input: str.substring(0, 50), checksum: checksum.toString(16), algorithm: 'adler32' }, stats: { count: 1, processed: str.length } };
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
