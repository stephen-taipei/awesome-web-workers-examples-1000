/**
 * Topological Sorter Web Worker
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
    const nodes = [...new Set(items.map(i => [i.from, i.to, i.id, i.name]).flat().filter(Boolean))];
    const edges = items.filter(i => i.from && i.to);
    const adj = {}; const inDegree = {};
    nodes.forEach(n => { adj[n] = []; inDegree[n] = 0; });
    edges.forEach(e => { adj[e.from].push(e.to); inDegree[e.to] = (inDegree[e.to] || 0) + 1; });
    const queue = nodes.filter(n => inDegree[n] === 0);
    const sorted = [];
    while (queue.length) {
        const node = queue.shift();
        sorted.push(node);
        (adj[node] || []).forEach(n => { inDegree[n]--; if (inDegree[n] === 0) queue.push(n); });
    }
    return { output: { sorted, hasCircular: sorted.length !== nodes.length }, stats: { count: nodes.length, processed: sorted.length } };
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
