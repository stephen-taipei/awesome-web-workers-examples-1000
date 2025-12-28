self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'EXTRACT') extract(payload.text, payload.delimiter, payload.columns, payload.hasHeader);
};

function extract(text, delimiter, columnsSpec, hasHeader) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Extracting...' } });

    // Parse column specification
    const columnIndices = parseColumnSpec(columnsSpec);

    // Split into rows
    const lines = text.split('\n').filter(l => l.trim());
    const allRows = lines.map(line => line.split(delimiter));

    // Get headers if applicable
    let headers = [];
    let dataRows = allRows;

    if (hasHeader && allRows.length > 0) {
        headers = columnIndices.map(i => allRows[0][i - 1] || `Column ${i}`);
        dataRows = allRows.slice(1);
    }

    // Extract columns
    const extractedRows = dataRows.map(row => {
        return columnIndices.map(i => row[i - 1] || '');
    });

    // Generate result text
    const resultLines = [];
    if (headers.length > 0) {
        resultLines.push(headers.join(delimiter));
    }
    extractedRows.forEach(row => {
        resultLines.push(row.join(delimiter));
    });

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: resultLines.join('\n'),
            headers,
            rows: extractedRows,
            rowCount: extractedRows.length,
            columnCount: columnIndices.length,
            duration: performance.now() - startTime
        }
    });
}

function parseColumnSpec(spec) {
    const indices = new Set();

    const parts = spec.split(',').map(p => p.trim());
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    if (i > 0) indices.add(i);
                }
            }
        } else {
            const num = parseInt(part);
            if (!isNaN(num) && num > 0) {
                indices.add(num);
            }
        }
    }

    return [...indices].sort((a, b) => a - b);
}
