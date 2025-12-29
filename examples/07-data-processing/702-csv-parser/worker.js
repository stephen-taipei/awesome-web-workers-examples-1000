/**
 * CSV Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseCSV(payload.csvString, payload.delimiter, payload.hasHeader);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseCSV(csvString, delimiter, hasHeader) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Splitting lines...');
        const lines = csvString.split('\n').filter(line => line.trim());

        sendProgress(20, 'Parsing headers...');
        const headers = hasHeader ? parseCSVLine(lines[0], delimiter) : null;
        const dataLines = hasHeader ? lines.slice(1) : lines;

        sendProgress(30, 'Parsing rows...');
        const rows = [];
        const totalLines = dataLines.length;

        for (let i = 0; i < totalLines; i++) {
            rows.push(parseCSVLine(dataLines[i], delimiter));

            if (i % 1000 === 0) {
                const percent = 30 + Math.floor((i / totalLines) * 60);
                sendProgress(percent, `Parsing row ${i.toLocaleString()} of ${totalLines.toLocaleString()}...`);
            }
        }

        sendProgress(95, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({
            headers,
            rows,
            rowCount: rows.length,
            columnCount: headers ? headers.length : (rows[0] ? rows[0].length : 0),
            duration
        });
    } catch (error) {
        sendError('CSV parse error: ' + error.message);
    }
}

function parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
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
