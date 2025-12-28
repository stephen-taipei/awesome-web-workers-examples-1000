/**
 * Random Generator Web Worker
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
    const config = typeof data === 'object' && !Array.isArray(data) ? data : { count: 20, min: 0, max: 100 };
    const count = config.count || 20;
    const min = config.min || 0;
    const max = config.max || 100;
    const type = config.type || 'float';
    const generated = [];
    for (let i = 0; i < count; i++) {
        let value = Math.random() * (max - min) + min;
        if (type === 'integer') value = Math.floor(value);
        generated.push(value);
    }
    return { output: generated, stats: { count: generated.length, min: Math.min(...generated), max: Math.max(...generated) } };
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
