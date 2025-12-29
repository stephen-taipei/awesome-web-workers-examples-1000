/**
 * Data Sampler Web Worker
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
    const k = Math.min(10, Math.ceil(items.length * 0.1));
    const reservoir = [];
    for (let i = 0; i < items.length; i++) {
        if (i < k) reservoir.push(items[i]);
        else {
            const j = Math.floor(Math.random() * (i + 1));
            if (j < k) reservoir[j] = items[i];
        }
    }
    return { output: reservoir, stats: { count: items.length, sampled: reservoir.length } };
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
