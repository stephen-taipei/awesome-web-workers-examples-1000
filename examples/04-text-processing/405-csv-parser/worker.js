/**
 * CSV Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseCSV(payload.text, payload.delimiter, payload.hasHeader);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseCSV(text, delimiter, hasHeader) {
    const startTime = performance.now();

    sendProgress(10, 'Splitting lines...');

    const lines = text.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) {
        sendError('No data found');
        return;
    }

    sendProgress(30, 'Parsing rows...');

    const rows = [];
    const totalLines = lines.length;

    for (let i = 0; i < totalLines; i++) {
        const row = parseLine(lines[i], delimiter);
        rows.push(row);

        if (i % 1000 === 0) {
            const progress = 30 + Math.floor((i / totalLines) * 50);
            sendProgress(progress, `Parsing row ${i + 1} of ${totalLines}...`);
        }
    }

    sendProgress(80, 'Organizing data...');

    let headers;
    let data;

    if (hasHeader && rows.length > 0) {
        headers = rows[0];
        data = rows.slice(1);
    } else {
        const columnCount = rows.length > 0 ? rows[0].length : 0;
        headers = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
        data = rows;
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            headers: headers,
            data: data,
            duration: endTime - startTime,
            stats: {
                rowCount: data.length,
                columnCount: headers.length
            }
        }
    });
}

function parseLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // End of quoted field
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === delimiter) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }

    // Push last field
    result.push(current.trim());

    return result;
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
