/**
 * Compressor Web Worker
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
    let compressed = '';
    let count = 1;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === str[i + 1]) count++;
        else { compressed += (count > 1 ? count : '') + str[i]; count = 1; }
    }
    const ratio = (compressed.length / str.length * 100).toFixed(1);
    return { output: { original: str.length, compressed: compressed.length, ratio: ratio + '%', preview: compressed.substring(0, 100) }, stats: { count: 1, processed: 1 } };
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
