/**
 * Path Finder Web Worker
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
    const nodes = [...new Set(items.map(i => [i.from, i.to]).flat().filter(Boolean))];
    const edges = items.filter(i => i.from && i.to);
    const adj = {};
    nodes.forEach(n => adj[n] = []);
    edges.forEach(e => adj[e.from].push({ to: e.to, weight: e.weight || 1 }));
    const start = nodes[0];
    const end = nodes[nodes.length - 1];
    const dist = {}; const prev = {};
    nodes.forEach(n => dist[n] = Infinity);
    dist[start] = 0;
    const queue = [...nodes];
    while (queue.length) {
        queue.sort((a, b) => dist[a] - dist[b]);
        const u = queue.shift();
        (adj[u] || []).forEach(({ to, weight }) => {
            const alt = dist[u] + weight;
            if (alt < dist[to]) { dist[to] = alt; prev[to] = u; }
        });
    }
    const path = []; let curr = end;
    while (curr && path.length < 100) { path.unshift(curr); curr = prev[curr]; }
    return { output: { path, distance: dist[end], start, end }, stats: { count: nodes.length, pathLength: path.length } };
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
