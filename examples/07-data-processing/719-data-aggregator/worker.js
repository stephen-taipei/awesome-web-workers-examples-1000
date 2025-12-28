/**
 * Data Aggregator Web Worker
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
    const aggregated = {};
    items.forEach(item => {
        const key = item.category || 'default';
        if (!aggregated[key]) aggregated[key] = { count: 0, sum: 0 };
        aggregated[key].count++;
        aggregated[key].sum += item.value || 0;
    });
    for (const key in aggregated) aggregated[key].avg = aggregated[key].sum / aggregated[key].count;
    return { output: aggregated, stats: { count: items.length, groups: Object.keys(aggregated).length } };
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
