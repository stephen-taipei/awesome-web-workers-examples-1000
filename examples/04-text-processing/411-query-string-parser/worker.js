/**
 * Query String Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseQueryStrings(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseQueryStrings(text) {
    const startTime = performance.now();

    sendProgress(10, 'Splitting queries...');

    const lines = text.split('\n').filter(line => line.trim());

    sendProgress(30, 'Parsing query strings...');

    const results = [];
    let totalParams = 0;

    for (let i = 0; i < lines.length; i++) {
        const query = lines[i].trim();
        const parsed = parseQueryString(query);
        results.push({
            original: query,
            parsed: parsed.params,
            paramCount: parsed.count
        });
        totalParams += parsed.count;

        if (i % 100 === 0) {
            const progress = 30 + Math.floor((i / lines.length) * 60);
            sendProgress(progress, `Parsing query ${i + 1} of ${lines.length}...`);
        }
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            results: results,
            duration: endTime - startTime,
            stats: {
                queryCount: lines.length,
                paramCount: totalParams
            }
        }
    });
}

function parseQueryString(queryString) {
    const params = {};
    let count = 0;

    // Remove leading ? if present
    if (queryString.startsWith('?')) {
        queryString = queryString.slice(1);
    }

    const pairs = queryString.split('&');

    for (const pair of pairs) {
        if (!pair) continue;

        const [rawKey, rawValue] = pair.split('=');
        const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
        const value = rawValue !== undefined
            ? decodeURIComponent(rawValue.replace(/\+/g, ' '))
            : '';

        count++;

        // Handle array notation: key[] or key[index]
        const arrayMatch = key.match(/^([^\[]+)\[([^\]]*)\]$/);
        if (arrayMatch) {
            const baseKey = arrayMatch[1];
            const index = arrayMatch[2];

            if (!params[baseKey]) {
                params[baseKey] = index ? {} : [];
            }

            if (index) {
                params[baseKey][index] = value;
            } else if (Array.isArray(params[baseKey])) {
                params[baseKey].push(value);
            }
        }
        // Handle nested notation: key[subkey]
        else if (key.includes('[')) {
            const parts = key.split(/[\[\]]+/).filter(Boolean);
            let current = params;

            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }

            current[parts[parts.length - 1]] = value;
        }
        // Handle multiple values for same key
        else if (params.hasOwnProperty(key)) {
            if (Array.isArray(params[key])) {
                params[key].push(value);
            } else {
                params[key] = [params[key], value];
            }
        }
        // Simple key=value
        else {
            params[key] = value;
        }
    }

    return { params, count };
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
