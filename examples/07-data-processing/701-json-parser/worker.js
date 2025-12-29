/**
 * JSON Parser Web Worker
 * Parses and analyzes JSON data in background thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseJSON(payload.jsonString);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseJSON(jsonString) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Parsing JSON...');
        const parsed = JSON.parse(jsonString);

        sendProgress(50, 'Analyzing structure...');
        const analysis = analyzeStructure(parsed);

        sendProgress(90, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ parsed, analysis, duration });
    } catch (error) {
        sendError('JSON parse error: ' + error.message);
    }
}

function analyzeStructure(obj) {
    const stats = {
        totalKeys: 0,
        maxDepth: 0,
        types: {},
        arrayLengths: []
    };

    let processedNodes = 0;
    const totalEstimate = estimateNodes(obj);

    function traverse(value, depth) {
        processedNodes++;
        if (processedNodes % 10000 === 0) {
            const percent = Math.min(50 + Math.floor((processedNodes / totalEstimate) * 40), 89);
            sendProgress(percent, `Analyzing... (${processedNodes.toLocaleString()} nodes)`);
        }

        const type = Array.isArray(value) ? 'array' : typeof value;
        stats.types[type] = (stats.types[type] || 0) + 1;
        stats.maxDepth = Math.max(stats.maxDepth, depth);

        if (type === 'array') {
            stats.arrayLengths.push(value.length);
            for (let i = 0; i < value.length; i++) {
                traverse(value[i], depth + 1);
            }
        } else if (type === 'object' && value !== null) {
            const keys = Object.keys(value);
            stats.totalKeys += keys.length;
            for (const key of keys) {
                traverse(value[key], depth + 1);
            }
        }
    }

    traverse(obj, 0);
    return stats;
}

function estimateNodes(obj) {
    const json = JSON.stringify(obj);
    return Math.max(1000, Math.floor(json.length / 10));
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendResult(data) {
    self.postMessage({
        type: 'RESULT',
        payload: data
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
