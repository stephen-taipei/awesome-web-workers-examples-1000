self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'WRAP') wrap(payload.text, payload.width, payload.mode, payload.preserveParagraphs);
};

function wrap(text, width, mode, preserveParagraphs) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Wrapping...' } });

    let result;

    if (preserveParagraphs) {
        const paragraphs = text.split(/\n\s*\n/);
        result = paragraphs.map(p => wrapParagraph(p.replace(/\n/g, ' '), width, mode)).join('\n\n');
    } else {
        result = wrapParagraph(text.replace(/\n/g, ' '), width, mode);
    }

    const lines = result.split('\n');
    const maxLineWidth = Math.max(...lines.map(l => l.length));

    self.postMessage({
        type: 'RESULT',
        payload: {
            result,
            width,
            lineCount: lines.length,
            maxLineWidth,
            duration: performance.now() - startTime
        }
    });
}

function wrapParagraph(text, width, mode) {
    switch (mode) {
        case 'word':
            return wrapWords(text, width);
        case 'char':
            return wrapChars(text, width);
        case 'hyphen':
            return wrapWithHyphen(text, width);
        default:
            return wrapWords(text, width);
    }
}

function wrapWords(text, width) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (currentLine.length === 0) {
            currentLine = word;
        } else if (currentLine.length + 1 + word.length <= width) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    return lines.join('\n');
}

function wrapChars(text, width) {
    const lines = [];
    let current = '';

    for (const char of text) {
        if (char === ' ' && current.length === 0) continue;
        current += char;
        if (current.length >= width) {
            lines.push(current);
            current = '';
        }
    }

    if (current.length > 0) {
        lines.push(current);
    }

    return lines.join('\n');
}

function wrapWithHyphen(text, width) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (currentLine.length === 0) {
            if (word.length > width) {
                // Hyphenate long word
                let remaining = word;
                while (remaining.length > width) {
                    lines.push(remaining.slice(0, width - 1) + '-');
                    remaining = remaining.slice(width - 1);
                }
                currentLine = remaining;
            } else {
                currentLine = word;
            }
        } else if (currentLine.length + 1 + word.length <= width) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            if (word.length > width) {
                let remaining = word;
                while (remaining.length > width) {
                    lines.push(remaining.slice(0, width - 1) + '-');
                    remaining = remaining.slice(width - 1);
                }
                currentLine = remaining;
            } else {
                currentLine = word;
            }
        }
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    return lines.join('\n');
}
