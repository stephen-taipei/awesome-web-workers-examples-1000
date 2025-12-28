/**
 * HyperLogLog Web Worker
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
    const m = 16;
    const registers = new Array(m).fill(0);
    items.forEach(item => {
        const key = JSON.stringify(item);
        const hash = Math.abs(key.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0));
        const index = hash % m;
        const w = Math.floor(hash / m);
        const rho = 32 - Math.floor(Math.log2(w + 1));
        registers[index] = Math.max(registers[index], rho);
    });
    const sum = registers.reduce((a, b) => a + Math.pow(2, -b), 0);
    const estimate = Math.round(0.7213 / (1 + 1.079 / m) * m * m / sum);
    const actual = new Set(items.map(i => JSON.stringify(i))).size;
    return { output: { estimate, actual, error: ((estimate - actual) / actual * 100).toFixed(1) + '%' }, stats: { count: items.length, processed: items.length } };
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
