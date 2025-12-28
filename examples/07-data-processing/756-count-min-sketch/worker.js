/**
 * Count-Min Sketch Web Worker
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
    const width = 100;
    const depth = 4;
    const sketch = Array(depth).fill(null).map(() => Array(width).fill(0));
    items.forEach(item => {
        const key = JSON.stringify(item);
        for (let i = 0; i < depth; i++) {
            const hash = Math.abs((key + i).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), i)) % width;
            sketch[i][hash]++;
        }
    });
    return { output: { width, depth, totalCount: items.length, sketch: sketch.map(row => row.slice(0, 10)) }, stats: { count: items.length, processed: items.length } };
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
