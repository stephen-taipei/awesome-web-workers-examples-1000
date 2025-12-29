/**
 * INI Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseINI(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseINI(text) {
    const startTime = performance.now();

    sendProgress(10, 'Preprocessing...');

    const lines = text.split('\n');

    sendProgress(30, 'Parsing INI...');

    const result = {};
    let currentSection = null;
    let sectionCount = 0;
    let keyCount = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Skip empty lines and comments
        if (!line || line.startsWith(';') || line.startsWith('#')) {
            continue;
        }

        // Section header
        if (line.startsWith('[') && line.endsWith(']')) {
            const sectionName = line.slice(1, -1).trim();
            result[sectionName] = {};
            currentSection = sectionName;
            sectionCount++;
            continue;
        }

        // Key-value pair
        const eqIndex = line.indexOf('=');
        if (eqIndex !== -1) {
            const key = line.slice(0, eqIndex).trim();
            let value = line.slice(eqIndex + 1).trim();

            // Parse value
            value = parseValue(value);

            if (currentSection) {
                result[currentSection][key] = value;
            } else {
                result[key] = value;
            }
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
}

function parseValue(value) {
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    // Boolean
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1') {
        return true;
    }
    if (value.toLowerCase() === 'false' || value.toLowerCase() === 'no' || value === '0') {
        return false;
    }

    // Number
    if (/^-?\d+$/.test(value)) {
        return parseInt(value, 10);
    }
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
