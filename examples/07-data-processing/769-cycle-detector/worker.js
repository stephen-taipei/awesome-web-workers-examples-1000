/**
 * Cycle Detector Web Worker
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
    const adj = {};
    nodes.forEach(n => adj[n] = []);
    edges.forEach(e => adj[e.from].push(e.to));
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];
    function dfs(node, path = []) {
        if (recStack.has(node)) { cycles.push([...path, node]); return true; }
        if (visited.has(node)) return false;
        visited.add(node); recStack.add(node);
        for (const neighbor of (adj[node] || [])) {
            if (dfs(neighbor, [...path, node])) return true;
        }
        recStack.delete(node);
        return false;
    }
    nodes.forEach(n => dfs(n));
    return { output: { hasCycle: cycles.length > 0, cycles: cycles.slice(0, 5) }, stats: { count: nodes.length, processed: nodes.length } };
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
