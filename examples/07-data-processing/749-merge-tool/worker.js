/**
 * Merge Tool Web Worker
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
    const merged = items.reduce((acc, item) => {
        for (const [k, v] of Object.entries(item || {})) {
            if (acc[k] === undefined) acc[k] = v;
            else if (Array.isArray(acc[k]) && Array.isArray(v)) acc[k] = [...acc[k], ...v];
            else if (typeof acc[k] === 'object' && typeof v === 'object') acc[k] = { ...acc[k], ...v };
        }
        return acc;
    }, {});
    return { output: merged, stats: { count: items.length, keys: Object.keys(merged).length } };
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
