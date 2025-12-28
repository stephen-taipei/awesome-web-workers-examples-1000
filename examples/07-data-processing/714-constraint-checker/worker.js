/**
 * Constraint Checker Web Worker
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
    const constraints = [
        { field: 'value', check: v => v >= 0, message: 'must be non-negative' },
        { field: 'name', check: v => typeof v === 'string' && v.length > 0, message: 'must be non-empty string' }
    ];
    const results = items.map(item => {
        const violations = constraints.filter(c => item[c.field] !== undefined && !c.check(item[c.field]));
        return { item, valid: violations.length === 0, violations: violations.map(v => v.message) };
    });
    return { output: results, stats: { count: items.length, valid: results.filter(r => r.valid).length } };
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
