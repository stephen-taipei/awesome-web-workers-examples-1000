/**
 * Inverted Index Web Worker
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
    const inverted = {};
    items.forEach((item, docId) => {
        const text = typeof item === 'string' ? item : JSON.stringify(item);
        const terms = text.toLowerCase().split(/\W+/).filter(t => t);
        terms.forEach((term, pos) => {
            if (!inverted[term]) inverted[term] = {};
            if (!inverted[term][docId]) inverted[term][docId] = [];
            inverted[term][docId].push(pos);
        });
    });
    return { output: inverted, stats: { count: items.length, terms: Object.keys(inverted).length } };
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
