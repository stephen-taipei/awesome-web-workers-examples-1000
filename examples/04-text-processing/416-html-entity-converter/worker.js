/**
 * HTML Entity Converter Web Worker
 */

const ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '\u00A0': '&nbsp;',
    '\u00A9': '&copy;',
    '\u00AE': '&reg;',
    '\u2122': '&trade;',
    '\u20AC': '&euro;',
    '\u00A3': '&pound;',
    '\u00A5': '&yen;',
    '\u00A2': '&cent;'
};

const DECODE_MAP = {
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'quot': '"',
    'apos': "'",
    'nbsp': '\u00A0',
    'copy': '\u00A9',
    'reg': '\u00AE',
    'trade': '\u2122',
    'euro': '\u20AC',
    'pound': '\u00A3',
    'yen': '\u00A5',
    'cent': '\u00A2',
    'mdash': '\u2014',
    'ndash': '\u2013',
    'lsquo': '\u2018',
    'rsquo': '\u2019',
    'ldquo': '\u201C',
    'rdquo': '\u201D',
    'bull': '\u2022',
    'hellip': '\u2026'
};

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'ENCODE':
            encodeEntities(payload.text);
            break;
        case 'DECODE':
            decodeEntities(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function encodeEntities(text) {
    const startTime = performance.now();

    sendProgress(30, 'Encoding entities...');

    let result = '';
    let entityCount = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const codePoint = char.codePointAt(0);

        if (ENTITIES[char]) {
            result += ENTITIES[char];
            entityCount++;
        } else if (codePoint > 127) {
            result += '&#' + codePoint + ';';
            entityCount++;
        } else {
            result += char;
        }
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
                entityCount: entityCount
            }
        }
    });
}

function decodeEntities(text) {
    const startTime = performance.now();

    sendProgress(30, 'Decoding entities...');

    let entityCount = 0;

    // Decode named entities
    let result = text.replace(/&([a-zA-Z]+);/g, (match, name) => {
        if (DECODE_MAP[name]) {
            entityCount++;
            return DECODE_MAP[name];
        }
        return match;
    });

    // Decode numeric entities (decimal)
    result = result.replace(/&#(\d+);/g, (match, num) => {
        entityCount++;
        return String.fromCodePoint(parseInt(num, 10));
    });

    // Decode numeric entities (hexadecimal)
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
        entityCount++;
        return String.fromCodePoint(parseInt(hex, 16));
    });

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
                entityCount: entityCount
            }
        }
    });
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
