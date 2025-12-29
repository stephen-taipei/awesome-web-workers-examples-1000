self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'JOIN') join(payload.text, payload.joinType, payload.customDelimiter, payload.formatType);
};

function join(text, joinType, customDelimiter, formatType) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Joining...' } });

    // Split into items
    let items = text.split('\n').filter(item => item.trim().length > 0);

    // Apply format
    items = items.map(item => formatItem(item.trim(), formatType));

    // Get delimiter
    const delimiter = getDelimiter(joinType, customDelimiter);

    // Join
    const result = items.join(delimiter);

    self.postMessage({
        type: 'RESULT',
        payload: {
            result,
            itemCount: items.length,
            duration: performance.now() - startTime
        }
    });
}

function getDelimiter(joinType, customDelimiter) {
    switch (joinType) {
        case 'comma': return ', ';
        case 'semicolon': return '; ';
        case 'pipe': return ' | ';
        case 'space': return ' ';
        case 'newline': return '\n';
        case 'custom': return customDelimiter;
        default: return ', ';
    }
}

function formatItem(item, formatType) {
    switch (formatType) {
        case 'quoted': return `"${item}"`;
        case 'single-quoted': return `'${item}'`;
        case 'brackets': return `[${item}]`;
        case 'braces': return `{${item}}`;
        case 'parens': return `(${item})`;
        default: return item;
    }
}
