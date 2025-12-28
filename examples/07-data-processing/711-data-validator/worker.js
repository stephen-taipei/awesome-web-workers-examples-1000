/**
 * Data Validator Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'VALIDATE':
            validateData(payload.data, payload.rules);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function validateData(data, rules) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Starting validation...');

        const records = Array.isArray(data) ? data : [data];
        const stats = { total: records.length, valid: 0, invalid: 0, errors: [] };
        const results = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const validation = validateRecord(record, rules, i);
            results.push(validation);

            if (validation.valid) {
                stats.valid++;
            } else {
                stats.invalid++;
                stats.errors.push(...validation.errors.map(e => ({ index: i, ...e })));
            }

            if (i % 500 === 0) {
                sendProgress(10 + Math.floor((i / records.length) * 80), `Validating record ${i}...`);
            }
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ results, stats, duration });
    } catch (error) {
        sendError('Validation error: ' + error.message);
    }
}

function validateRecord(record, rules, index) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const value = record[field];

        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({ field, message: 'Required field missing' });
            continue;
        }

        if (value === undefined || value === null) continue;

        if (rule.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                errors.push({ field, message: 'Invalid email format', value });
            }
        }

        if (rule.type === 'number') {
            if (typeof value !== 'number') {
                errors.push({ field, message: 'Expected number', value });
            } else {
                if (rule.min !== undefined && value < rule.min) {
                    errors.push({ field, message: `Value below minimum (${rule.min})`, value });
                }
                if (rule.max !== undefined && value > rule.max) {
                    errors.push({ field, message: `Value above maximum (${rule.max})`, value });
                }
            }
        }

        if (rule.type === 'string') {
            if (typeof value !== 'string') {
                errors.push({ field, message: 'Expected string', value });
            } else {
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push({ field, message: `String too short`, value });
                }
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push({ field, message: `String too long`, value });
                }
            }
        }
    }

    return { index, valid: errors.length === 0, errors };
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
