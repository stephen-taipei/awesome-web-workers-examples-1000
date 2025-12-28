/**
 * Bloom Filter Web Worker
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
    const items = Array.isArray(data) ? data : [data];
    const size = 1000;
    const filter = new Array(size).fill(0);
    const hash1 = s => Math.abs(String(s).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % size;
    const hash2 = s => Math.abs(String(s).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0)) % size;
    items.forEach(item => {
        const key = JSON.stringify(item);
        filter[hash1(key)] = 1;
        filter[hash2(key)] = 1;
    });
    const setBits = filter.reduce((a, b) => a + b, 0);
    return { output: { size, setBits, fillRatio: (setBits / size * 100).toFixed(1) + '%' }, stats: { count: items.length, processed: items.length } };
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
