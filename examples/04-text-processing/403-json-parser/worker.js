/**
 * JSON Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseJSON(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseJSON(text) {
    const startTime = performance.now();

    sendProgress(10, 'Parsing JSON...');

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        sendError('Invalid JSON: ' + e.message);
        return;
    }

    sendProgress(40, 'Analyzing structure...');

    const stats = analyzeStructure(parsed, text.length);

    sendProgress(70, 'Formatting output...');

    const structure = formatStructure(parsed, stats);

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            structure: structure,
            duration: endTime - startTime,
            stats: stats
        }
    });
}

function analyzeStructure(obj, inputSize) {
    let totalKeys = 0;
    let maxDepth = 0;
    const typeCounts = {};

    function traverse(value, depth) {
        maxDepth = Math.max(maxDepth, depth);
        const type = getType(value);

        typeCounts[type] = (typeCounts[type] || 0) + 1;

        if (type === 'object' && value !== null) {
            const keys = Object.keys(value);
            totalKeys += keys.length;
            for (const key of keys) {
                traverse(value[key], depth + 1);
            }
        } else if (type === 'array') {
            for (const item of value) {
                traverse(item, depth + 1);
            }
        }
    }

    traverse(obj, 0);

    return {
        inputSize: inputSize,
        totalKeys: totalKeys,
        maxDepth: maxDepth,
        rootType: getType(obj),
        typeCounts: typeCounts
    };
}

function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function formatStructure(obj, stats) {
    const lines = [];

    lines.push('=== JSON Structure Analysis ===\n');
    lines.push(`Root Type: ${stats.rootType}`);
    lines.push(`Total Keys: ${stats.totalKeys}`);
    lines.push(`Max Depth: ${stats.maxDepth}`);
    lines.push('\nType Distribution:');

    for (const [type, count] of Object.entries(stats.typeCounts)) {
        lines.push(`  ${type}: ${count}`);
    }

    lines.push('\n=== Data Preview ===\n');

    // Show truncated preview
    const preview = JSON.stringify(obj, null, 2);
    if (preview.length > 5000) {
        lines.push(preview.slice(0, 5000));
        lines.push('\n... (truncated)');
    } else {
        lines.push(preview);
    }

    return lines.join('\n');
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
