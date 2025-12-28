/**
 * Parquet Reader Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            processColumnar(payload.data);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function processColumnar(data) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Converting to columnar format...');

        if (!Array.isArray(data) || data.length === 0) {
            sendResult({ columns: {}, stats: { rows: 0, columns: 0 }, duration: 0 });
            return;
        }

        const columns = {};
        const columnNames = Object.keys(data[0]);

        for (const name of columnNames) {
            columns[name] = { values: [], type: null, stats: {} };
        }

        sendProgress(30, 'Extracting columns...');

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            for (const name of columnNames) {
                columns[name].values.push(row[name]);
            }
            if (i % 1000 === 0) {
                sendProgress(30 + Math.floor((i / data.length) * 40), `Processing row ${i}...`);
            }
        }

        sendProgress(75, 'Calculating statistics...');

        for (const name of columnNames) {
            const col = columns[name];
            col.type = inferType(col.values);
            col.stats = calculateColumnStats(col.values, col.type);
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ columns, stats: { rows: data.length, columns: columnNames.length }, duration });
    } catch (error) {
        sendError('Processing error: ' + error.message);
    }
}

function inferType(values) {
    const sample = values.find(v => v !== null && v !== undefined);
    if (sample === undefined) return 'null';
    if (typeof sample === 'number') return Number.isInteger(sample) ? 'int' : 'double';
    if (typeof sample === 'boolean') return 'boolean';
    if (typeof sample === 'string') return 'string';
    return 'unknown';
}

function calculateColumnStats(values, type) {
    const stats = { nullCount: values.filter(v => v === null || v === undefined).length };

    if (type === 'int' || type === 'double') {
        const nums = values.filter(v => typeof v === 'number');
        stats.min = Math.min(...nums);
        stats.max = Math.max(...nums);
        stats.sum = nums.reduce((a, b) => a + b, 0);
        stats.avg = stats.sum / nums.length;
    } else if (type === 'string') {
        const strs = values.filter(v => typeof v === 'string');
        stats.minLen = Math.min(...strs.map(s => s.length));
        stats.maxLen = Math.max(...strs.map(s => s.length));
        stats.distinctCount = new Set(strs).size;
    } else if (type === 'boolean') {
        stats.trueCount = values.filter(v => v === true).length;
        stats.falseCount = values.filter(v => v === false).length;
    }

    return stats;
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
