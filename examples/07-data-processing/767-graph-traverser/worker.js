/**
 * Graph Traverser Web Worker
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
    const nodes = items.map(i => i.id || i.name || String(i));
    const edges = items.filter(i => i.edges).flatMap(i => i.edges);
    const adj = {};
    nodes.forEach(n => adj[n] = []);
    edges.forEach(e => { if (adj[e.from]) adj[e.from].push(e.to); });
    const visited = [];
    const seen = new Set();
    const queue = nodes.slice(0, 1);
    while (queue.length && visited.length < 50) {
        const node = queue.shift();
        if (seen.has(node)) continue;
        seen.add(node);
        visited.push(node);
        (adj[node] || []).forEach(n => queue.push(n));
    }
    return { output: { visited, order: 'BFS' }, stats: { count: nodes.length, visited: visited.length } };
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
