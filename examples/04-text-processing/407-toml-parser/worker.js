/**
 * TOML Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseTOML(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseTOML(text) {
    const startTime = performance.now();

    sendProgress(10, 'Preprocessing...');

    const lines = text.split('\n');

    sendProgress(30, 'Parsing TOML...');

    try {
        const result = {};
        let currentSection = result;
        let sectionCount = 0;
        let keyCount = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Skip empty lines and comments
            if (!line || line.startsWith('#')) continue;

            // Section header
            if (line.startsWith('[')) {
                const match = line.match(/^\[([^\]]+)\]$/);
                if (match) {
                    const path = match[1].split('.');
                    currentSection = result;

                    for (const key of path) {
                        if (!currentSection[key]) {
                            currentSection[key] = {};
                        }
                        currentSection = currentSection[key];
                    }
                    sectionCount++;
                }
                continue;
            }

            // Key-value pair
            const kvMatch = line.match(/^([^=]+)=(.*)$/);
            if (kvMatch) {
                const key = kvMatch[1].trim();
                const value = kvMatch[2].trim();
                currentSection[key] = parseValue(value);
                keyCount++;
            }
        }

        sendProgress(80, 'Converting to JSON...');

        const json = JSON.stringify(result, null, 2);

        const endTime = performance.now();

        sendProgress(100, 'Done');

        self.postMessage({
            type: 'RESULT',
            payload: {
                json: json,
                duration: endTime - startTime,
                stats: { sectionCount, keyCount }
            }
        });
    } catch (e) {
        sendError('Parse error: ' + e.message);
    }
}

function parseValue(value) {
    // String (quoted)
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Array
    if (value.startsWith('[') && value.endsWith(']')) {
        const inner = value.slice(1, -1).trim();
        if (!inner) return [];

        const items = [];
        let current = '';
        let depth = 0;
        let inString = false;

        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];

            if (char === '"' && inner[i - 1] !== '\\') {
                inString = !inString;
            }

            if (!inString) {
                if (char === '[') depth++;
                else if (char === ']') depth--;
                else if (char === ',' && depth === 0) {
                    items.push(parseValue(current.trim()));
                    current = '';
                    continue;
                }
            }

            current += char;
        }

        if (current.trim()) {
            items.push(parseValue(current.trim()));
        }

        return items;
    }

    // Date (simple detection)
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value;
    }

    // Integer
    if (/^-?\d+$/.test(value)) {
        return parseInt(value, 10);
    }

    // Float
    if (/^-?\d+\.\d+$/.test(value)) {
        return parseFloat(value);
    }

    return value;
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
