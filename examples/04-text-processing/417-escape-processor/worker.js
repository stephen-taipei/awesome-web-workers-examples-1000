/**
 * Escape Processor Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'ESCAPE':
            escapeText(payload.text, payload.escapeType);
            break;
        case 'UNESCAPE':
            unescapeText(payload.text, payload.escapeType);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function escapeText(text, escapeType) {
    const startTime = performance.now();

    sendProgress(30, 'Escaping text...');

    let result;

    switch (escapeType) {
        case 'javascript':
            result = escapeJavaScript(text);
            break;
        case 'json':
            result = escapeJSON(text);
            break;
        case 'url':
            result = encodeURIComponent(text);
            break;
        case 'regex':
            result = escapeRegex(text);
            break;
        default:
            result = text;
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: endTime - startTime,
            stats: {
                inputLength: text.length,
                outputLength: result.length,
                escapeType: escapeType
            }
        }
    });
}

function unescapeText(text, escapeType) {
    const startTime = performance.now();

    sendProgress(30, 'Unescaping text...');

    let result;

    switch (escapeType) {
        case 'javascript':
            result = unescapeJavaScript(text);
            break;
        case 'json':
            result = unescapeJSON(text);
            break;
        case 'url':
            try {
                result = decodeURIComponent(text);
            } catch (e) {
                result = text;
            }
            break;
        case 'regex':
            result = unescapeRegex(text);
            break;
        default:
            result = text;
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: endTime - startTime,
            stats: {
                inputLength: text.length,
                outputLength: result.length,
                escapeType: escapeType
            }
        }
    });
}

function escapeJavaScript(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\f/g, '\\f')
        .replace(/\v/g, '\\v')
        .replace(/\0/g, '\\0');
}

function unescapeJavaScript(text) {
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\f/g, '\f')
        .replace(/\\v/g, '\v')
        .replace(/\\0/g, '\0')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

function escapeJSON(text) {
    return JSON.stringify(text);
}

function unescapeJSON(text) {
    try {
        // If it's a quoted string, parse it
        if (text.startsWith('"') && text.endsWith('"')) {
            return JSON.parse(text);
        }
        // Try wrapping in quotes
        return JSON.parse('"' + text + '"');
    } catch (e) {
        return text;
    }
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unescapeRegex(text) {
    return text.replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
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
