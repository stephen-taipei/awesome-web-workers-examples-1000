/**
 * Mock Generator Web Worker
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
    const config = typeof data === 'object' && !Array.isArray(data) ? data : { count: 10 };
    const count = config.count || 10;
    const mocked = [];
    for (let i = 0; i < count; i++) {
        mocked.push({
            id: i + 1,
            userId: 'user_' + (1000 + i),
            action: ['view', 'click', 'purchase', 'signup'][i % 4],
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            metadata: { source: 'mock', index: i }
        });
    }
    return { output: mocked, stats: { count: mocked.length, processed: mocked.length } };
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
