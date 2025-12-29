/**
 * Statistics Calculator Web Worker
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
    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const mode = values.sort((a, b) => values.filter(v => v === a).length - values.filter(v => v === b).length).pop();
    return { output: { count: n, mean: mean.toFixed(4), median, mode, variance: variance.toFixed(4), stdDev: stdDev.toFixed(4), min: sorted[0], max: sorted[n - 1] }, stats: { count: n, processed: n } };
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
