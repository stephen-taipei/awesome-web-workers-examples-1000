/**
 * Search Index Web Worker
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
    const index = {};
    items.forEach((item, docId) => {
        const text = typeof item === 'string' ? item : JSON.stringify(item);
        const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
        words.forEach(word => {
            if (!index[word]) index[word] = [];
            if (!index[word].includes(docId)) index[word].push(docId);
        });
    });
    return { output: { index, docCount: items.length, termCount: Object.keys(index).length }, stats: { count: items.length, terms: Object.keys(index).length } };
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
