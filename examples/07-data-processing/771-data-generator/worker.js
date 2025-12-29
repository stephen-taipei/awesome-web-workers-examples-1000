/**
 * Data Generator Web Worker
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
    const config = typeof data === 'object' && !Array.isArray(data) ? data : { count: 10 };
    const count = config.count || 10;
    const generated = [];
    for (let i = 0; i < count; i++) {
        generated.push({
            id: i + 1,
            value: Math.floor(Math.random() * 1000),
            name: 'Generated_' + Math.random().toString(36).substr(2, 8),
            active: Math.random() > 0.5,
            timestamp: Date.now() + i
        });
    }
    return { output: generated, stats: { count: generated.length, processed: generated.length } };
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
