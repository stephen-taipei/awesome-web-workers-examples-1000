/**
 * Excel Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseSheet(payload.sheetData);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseSheet(sheetData) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Parsing rows...');

        const lines = sheetData.split('\n').filter(l => l.trim());
        const delimiter = sheetData.includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim());
        const rows = [];
        const stats = { rows: 0, columns: headers.length, formulas: 0, numbers: 0, strings: 0 };

        sendProgress(20, 'Processing cells...');

        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(delimiter).map(c => c.trim());
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                const cell = cells[j] || '';
                const parsed = parseCell(cell);
                row[headers[j]] = parsed;
                if (parsed.type === 'formula') stats.formulas++;
                else if (parsed.type === 'number') stats.numbers++;
                else stats.strings++;
            }
            rows.push(row);
            stats.rows++;

            if (i % 500 === 0) {
                sendProgress(20 + Math.floor((i / lines.length) * 70), `Processing row ${i}...`);
            }
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ headers, rows, stats, duration });
    } catch (error) {
        sendError('Parse error: ' + error.message);
    }
}

function parseCell(value) {
    if (value.startsWith('=')) {
        return { type: 'formula', value: value, display: '[Formula]' };
    }
    const num = parseFloat(value);
    if (!isNaN(num) && value.trim() !== '') {
        return { type: 'number', value: num, display: num };
    }
    return { type: 'string', value: value, display: value };
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
