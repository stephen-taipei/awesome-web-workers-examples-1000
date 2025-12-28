/**
 * Schema Validator Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload.data);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function handleProcess(data) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Processing...');
        const result = processData(data);
        sendProgress(90, 'Finalizing...');
        result.duration = performance.now() - startTime;
        sendResult(result);
    } catch (error) {
        sendError('Processing error: ' + error.message);
    }
}

function processData(data) {
    const schema = {
        type: 'object',
        properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            age: { type: 'number', minimum: 0, maximum: 120 },
            email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' }
        }
    };

    const items = Array.isArray(data) ? data : [data];
    const stats = { count: items.length, valid: 0, invalid: 0 };
    const results = [];

    for (let i = 0; i < items.length; i++) {
        const errors = validateAgainstSchema(items[i], schema);
        if (errors.length === 0) {
            stats.valid++;
            results.push({ item: items[i], valid: true });
        } else {
            stats.invalid++;
            results.push({ item: items[i], valid: false, errors });
        }
        if (i % 500 === 0) {
            sendProgress(10 + Math.floor((i / items.length) * 80), `Validating ${i}...`);
        }
    }

    return { output: results.slice(0, 50), stats };
}

function validateAgainstSchema(item, schema) {
    const errors = [];
    for (const [prop, rules] of Object.entries(schema.properties)) {
        const value = item[prop];
        if (rules.type === 'number' && typeof value !== 'number') {
            errors.push(`${prop}: expected number`);
        }
        if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`${prop}: expected string`);
        }
        if (rules.minimum !== undefined && value < rules.minimum) {
            errors.push(`${prop}: below minimum`);
        }
        if (rules.maximum !== undefined && value > rules.maximum) {
            errors.push(`${prop}: above maximum`);
        }
        if (rules.pattern && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
            errors.push(`${prop}: pattern mismatch`);
        }
    }
    return errors;
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
