self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    // Split by double newline or more
    // Normalize newlines first
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split by \n\s*\n
    // This handles:
    // \n\n (standard blank line)
    // \n  \n (blank line with spaces)
    // \n\n\n (multiple blank lines)
    const paragraphs = normalized.split(/\n\s*\n/);

    const validParagraphs = paragraphs
        .map(p => p.trim())
        .filter(p => p.length > 0);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        paragraphs: validParagraphs,
        time: endTime - startTime
    });
};
