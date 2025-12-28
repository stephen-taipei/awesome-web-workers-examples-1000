/**
 * Summary Generator Web Worker
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
    const values = items.map(i => typeof i === 'number' ? i : i.value || 0).filter(v => typeof v === 'number');
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const summary = {
        count: n,
        sum: values.reduce((a, b) => a + b, 0),
        mean: n ? values.reduce((a, b) => a + b, 0) / n : 0,
        median: n ? (n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2) : 0,
        min: n ? sorted[0] : null,
        max: n ? sorted[n - 1] : null,
        range: n ? sorted[n - 1] - sorted[0] : 0,
        q1: n >= 4 ? sorted[Math.floor(n * 0.25)] : null,
        q3: n >= 4 ? sorted[Math.floor(n * 0.75)] : null
    };
    return { output: summary, stats: { count: n, processed: n } };
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
