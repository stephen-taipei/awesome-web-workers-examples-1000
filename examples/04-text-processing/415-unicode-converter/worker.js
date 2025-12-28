/**
 * Unicode Converter Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'TO_UNICODE':
            toUnicodeEscape(payload.text);
            break;
        case 'FROM_UNICODE':
            fromUnicodeEscape(payload.text);
            break;
        case 'INFO':
            getCodePointInfo(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function toUnicodeEscape(text) {
    const startTime = performance.now();

    sendProgress(30, 'Converting to Unicode escape...');

    const result = [];
    for (const char of text) {
        const codePoint = char.codePointAt(0);
        if (codePoint > 0xFFFF) {
            result.push('\\u{' + codePoint.toString(16).toUpperCase() + '}');
        } else if (codePoint > 127) {
            result.push('\\u' + codePoint.toString(16).toUpperCase().padStart(4, '0'));
        } else {
            result.push(char);
        }
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    const codePoints = [...text].length;

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result.join(''),
            duration: endTime - startTime,
            stats: {
                charCount: text.length,
                codePointCount: codePoints
            }
        }
    });
}

function fromUnicodeEscape(text) {
    const startTime = performance.now();

    sendProgress(30, 'Parsing Unicode escapes...');

    try {
        // Handle \u{XXXXX} format (ES6)
        let result = text.replace(/\\u\{([0-9a-fA-F]+)\}/g, (match, hex) => {
            return String.fromCodePoint(parseInt(hex, 16));
        });

        // Handle \uXXXX format
        result = result.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });

        const endTime = performance.now();

        sendProgress(100, 'Done');

        const codePoints = [...result].length;

        self.postMessage({
            type: 'RESULT',
            payload: {
                result: result,
                duration: endTime - startTime,
                stats: {
                    charCount: result.length,
                    codePointCount: codePoints
                }
            }
        });
    } catch (e) {
        sendError('Invalid Unicode escape sequence');
    }
}

function getCodePointInfo(text) {
    const startTime = performance.now();

    sendProgress(30, 'Analyzing code points...');

    const lines = [];
    let index = 0;

    for (const char of text) {
        const codePoint = char.codePointAt(0);
        const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
        const name = getUnicodeCategory(codePoint);

        lines.push(`[${index}] '${char}' U+${hex} (${codePoint}) - ${name}`);
        index++;
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: lines.join('\n'),
            duration: endTime - startTime,
            stats: {
                charCount: text.length,
                codePointCount: index
            }
        }
    });
}

function getUnicodeCategory(codePoint) {
    if (codePoint <= 0x7F) return 'Basic Latin';
    if (codePoint <= 0xFF) return 'Latin-1 Supplement';
    if (codePoint <= 0x17F) return 'Latin Extended-A';
    if (codePoint <= 0x24F) return 'Latin Extended-B';
    if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) return 'CJK Unified Ideographs';
    if (codePoint >= 0x3040 && codePoint <= 0x309F) return 'Hiragana';
    if (codePoint >= 0x30A0 && codePoint <= 0x30FF) return 'Katakana';
    if (codePoint >= 0xAC00 && codePoint <= 0xD7AF) return 'Hangul Syllables';
    if (codePoint >= 0x1F600 && codePoint <= 0x1F64F) return 'Emoticons';
    if (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) return 'Miscellaneous Symbols and Pictographs';
    if (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) return 'Transport and Map Symbols';
    return 'Other';
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
