/**
 * Distribution Analyzer Web Worker
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
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance) || 1;
    const skewness = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / n;
    const kurtosis = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / n - 3;
    const isNormal = Math.abs(skewness) < 2 && Math.abs(kurtosis) < 7;
    return { output: { count: n, mean: mean.toFixed(4), stdDev: stdDev.toFixed(4), skewness: skewness.toFixed(4), kurtosis: kurtosis.toFixed(4), isNormal, distribution: isNormal ? 'Approximately Normal' : 'Non-Normal' }, stats: { count: n, processed: n } };
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
