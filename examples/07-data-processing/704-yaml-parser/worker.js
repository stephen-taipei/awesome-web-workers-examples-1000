/**
 * YAML Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseYAML(payload.yamlString);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseYAML(yamlString) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Parsing YAML...');

        const lines = yamlString.split('\n');
        const stats = { lines: lines.length, keys: 0, arrays: 0, scalars: 0 };
        const result = {};
        const stack = [{ indent: -1, obj: result, isArray: false }];

        for (let i = 0; i < lines.length; i++) {
            if (i % 100 === 0) {
                sendProgress(10 + Math.floor((i / lines.length) * 80), `Processing line ${i}...`);
            }

            let line = lines[i];

            if (line.trim().startsWith('#') || !line.trim()) continue;

            const indent = line.search(/\S/);
            line = line.trim();

            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }

            const current = stack[stack.length - 1];

            if (line.startsWith('- ')) {
                stats.arrays++;
                const value = line.substring(2).trim();

                if (!Array.isArray(current.obj)) {
                    current.obj = [];
                }

                if (value.includes(':')) {
                    const colonIndex = value.indexOf(':');
                    const key = value.substring(0, colonIndex).trim();
                    const val = value.substring(colonIndex + 1).trim();
                    const newObj = {};
                    newObj[key] = parseValue(val);
                    current.obj.push(newObj);
                    stack.push({ indent: indent + 2, obj: newObj, isArray: false });
                } else if (value) {
                    current.obj.push(parseValue(value));
                } else {
                    const newObj = {};
                    current.obj.push(newObj);
                    stack.push({ indent: indent + 2, obj: newObj, isArray: false });
                }
            } else if (line.includes(':')) {
                stats.keys++;
                const colonIndex = line.indexOf(':');
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();

                if (value) {
                    stats.scalars++;
                    current.obj[key] = parseValue(value);
                } else {
                    current.obj[key] = {};
                    stack.push({ indent: indent, obj: current.obj[key], isArray: false });
                }
            }
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ parsed: result, stats, duration });
    } catch (error) {
        sendError('YAML parse error: ' + error.message);
    }
}

function parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null' || value === '~') return null;
    if (/^-?\d+$/.test(value)) return parseInt(value);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

function sendResult(data) {
    self.postMessage({ type: 'RESULT', payload: data });
}

function sendError(message) {
    self.postMessage({ type: 'ERROR', payload: { message } });
}
