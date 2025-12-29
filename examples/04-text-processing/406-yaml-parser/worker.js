/**
 * YAML Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseYAML(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseYAML(text) {
    const startTime = performance.now();

    sendProgress(10, 'Preprocessing...');

    const lines = text.split('\n');
    const lineCount = lines.length;

    sendProgress(30, 'Parsing YAML...');

    try {
        const result = parse(lines);

        sendProgress(80, 'Converting to JSON...');

        const json = JSON.stringify(result, null, 2);
        const rootType = Array.isArray(result) ? 'array' : typeof result;

        const endTime = performance.now();

        sendProgress(100, 'Done');

        self.postMessage({
            type: 'RESULT',
            payload: {
                json: json,
                duration: endTime - startTime,
                stats: { lineCount, rootType }
            }
        });
    } catch (e) {
        sendError('Parse error: ' + e.message);
    }
}

function parse(lines) {
    const root = {};
    const stack = [{ indent: -1, obj: root, isArray: false }];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) continue;

        const indent = line.search(/\S/);
        const content = line.trim();

        // Pop stack until we find parent level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];

        // Array item
        if (content.startsWith('- ')) {
            const value = content.slice(2).trim();

            if (!Array.isArray(parent.obj)) {
                // Convert parent's current key to array
                const keys = Object.keys(parent.obj);
                const lastKey = keys[keys.length - 1];
                if (lastKey && parent.obj[lastKey] === null) {
                    parent.obj[lastKey] = [];
                    stack.push({ indent, obj: parent.obj[lastKey], isArray: true, key: lastKey });
                }
            }

            const currentParent = stack[stack.length - 1];
            if (Array.isArray(currentParent.obj)) {
                if (value.includes(': ')) {
                    // Object in array
                    const obj = {};
                    const [key, val] = splitFirst(value, ':');
                    obj[key.trim()] = parseValue(val.trim());
                    currentParent.obj.push(obj);
                    stack.push({ indent: indent + 2, obj, isArray: false });
                } else if (value) {
                    currentParent.obj.push(parseValue(value));
                } else {
                    // Start of object in array
                    const obj = {};
                    currentParent.obj.push(obj);
                    stack.push({ indent: indent + 2, obj, isArray: false });
                }
            }
        }
        // Key-value pair
        else if (content.includes(':')) {
            const [key, value] = splitFirst(content, ':');
            const keyTrim = key.trim();
            const valueTrim = value.trim();

            if (valueTrim === '') {
                // Nested object or array
                parent.obj[keyTrim] = null;
            } else {
                parent.obj[keyTrim] = parseValue(valueTrim);
            }
        }
    }

    // If root has only one key with nested content
    const keys = Object.keys(root);
    if (keys.length === 1 && root[keys[0]] === null) {
        return {};
    }

    return root;
}

function splitFirst(str, delimiter) {
    const idx = str.indexOf(delimiter);
    if (idx === -1) return [str, ''];
    return [str.slice(0, idx), str.slice(idx + 1)];
}

function parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null' || value === '~') return null;

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

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
