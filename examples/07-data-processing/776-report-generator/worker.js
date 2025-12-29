/**
 * Report Generator Web Worker
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
    const report = {
        title: 'Data Analysis Report',
        generated: new Date().toISOString(),
        summary: {
            totalRecords: items.length,
            numericValues: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            average: values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0,
            min: values.length ? Math.min(...values) : null,
            max: values.length ? Math.max(...values) : null,
            range: values.length ? Math.max(...values) - Math.min(...values) : 0
        },
        distribution: {
            positive: values.filter(v => v > 0).length,
            zero: values.filter(v => v === 0).length,
            negative: values.filter(v => v < 0).length
        }
    };
    return { output: report, stats: { count: items.length, processed: items.length } };
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
