/**
 * Tree Walker Web Worker
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
    const visited = [];
    function walk(node, depth = 0, path = 'root') {
        if (!node || typeof node !== 'object') {
            visited.push({ path, value: node, depth, type: typeof node });
            return;
        }
        visited.push({ path, depth, type: Array.isArray(node) ? 'array' : 'object', childCount: Object.keys(node).length });
        for (const [key, value] of Object.entries(node)) {
            walk(value, depth + 1, path + '.' + key);
        }
    }
    walk(data);
    return { output: visited.slice(0, 50), stats: { count: visited.length, maxDepth: Math.max(...visited.map(v => v.depth)) } };
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
