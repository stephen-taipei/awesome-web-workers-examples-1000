/**
 * Histogram Builder Web Worker
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
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
    const binWidth = (max - min) / binCount || 1;
    const bins = Array(binCount).fill(0);
    values.forEach(v => {
        const bin = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
        bins[bin]++;
    });
    const histogram = bins.map((count, i) => ({
        bin: i,
        range: [(min + i * binWidth).toFixed(2), (min + (i + 1) * binWidth).toFixed(2)],
        count,
        percentage: (count / values.length * 100).toFixed(1) + '%'
    }));
    return { output: histogram, stats: { count: values.length, bins: binCount } };
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
