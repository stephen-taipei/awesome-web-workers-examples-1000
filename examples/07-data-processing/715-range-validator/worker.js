/**
 * Range Validator Web Worker
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
    const ranges = { value: { min: 0, max: 100 } };
    const results = items.map(item => {
        const checks = {};
        for (const [field, range] of Object.entries(ranges)) {
            if (item[field] !== undefined) {
                checks[field] = { value: item[field], inRange: item[field] >= range.min && item[field] <= range.max };
            }
        }
        return { item, checks };
    });
    return { output: results, stats: { count: items.length, processed: items.length } };
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
