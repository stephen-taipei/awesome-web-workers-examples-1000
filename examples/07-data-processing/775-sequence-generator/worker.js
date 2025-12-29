/**
 * Sequence Generator Web Worker
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
    const config = typeof data === 'object' && !Array.isArray(data) ? data : { start: 1, end: 20, step: 1 };
    const start = config.start || 1;
    const end = config.end || 20;
    const step = config.step || 1;
    const sequence = [];
    for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        sequence.push(i);
        if (sequence.length > 10000) break;
    }
    return { output: sequence, stats: { count: sequence.length, start, end, step } };
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
