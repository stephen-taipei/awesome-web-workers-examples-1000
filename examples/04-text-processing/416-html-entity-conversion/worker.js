// Basic HTML Entities Map
const ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

const REVERSE_ENTITIES = Object.entries(ENTITIES).reduce((acc, [key, val]) => {
    acc[val] = key;
    return acc;
}, {});

// More comprehensive decode regex for numeric entities too
const DECODE_REGEX = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/ig;

self.onmessage = function(e) {
    const { type, text } = e.data;
    const startTime = performance.now();

    try {
        let result = '';

        if (type === 'encode') {
            // Encode basic special chars
            result = text.replace(/[&<>"'`=\/]/g, function(s) {
                return ENTITIES[s];
            });
        } else if (type === 'decode') {
            result = text.replace(DECODE_REGEX, function(match, entity) {
                // Check named entities
                if (REVERSE_ENTITIES[match]) {
                    return REVERSE_ENTITIES[match];
                }

                // Check named entities (common ones map)
                // A full map is huge, we implement basic ones + common
                if (entity === 'amp') return '&';
                if (entity === 'lt') return '<';
                if (entity === 'gt') return '>';
                if (entity === 'quot') return '"';
                if (entity === 'apos') return "'";
                if (entity === 'nbsp') return ' ';

                // Check numeric entities
                if (entity.charAt(0) === '#') {
                    let code;
                    if (entity.charAt(1).toLowerCase() === 'x') {
                        code = parseInt(entity.substring(2), 16);
                    } else {
                        code = parseInt(entity.substring(1), 10);
                    }
                    if (!isNaN(code)) {
                        return String.fromCharCode(code);
                    }
                }

                return match; // Return original if unknown
            });
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            text: result,
            time: Math.round(endTime - startTime)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};
