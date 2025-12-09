self.onmessage = function(e) {
    const { text, mode } = e.data;
    const start = performance.now();

    let result = text;
    let lines = [];

    if (mode === 'remove-all') {
        // Remove lines that are empty or whitespace only
        lines = text.split('\n').filter(line => line.trim().length > 0);
        result = lines.join('\n');
    } else if (mode === 'collapse') {
        // Collapse consecutive empty lines into a single empty line
        // Regex: Replace 2 or more newlines with 2 newlines (one empty line in between)
        // Need to handle CR/LF variations if needed, but assuming \n normalization or simple text
        result = text.replace(/\n{3,}/g, '\n\n');
        // Check start/end?
        lines = result.split('\n');
    } else if (mode === 'add-between') {
        // Add an empty line between every non-empty line
        lines = text.split('\n');
        // Filter out existing empty lines first? Or just interleave?
        // Let's assume we want to space out content.
        const contentLines = lines.filter(line => line.trim().length > 0);
        result = contentLines.join('\n\n');
        lines = result.split('\n');
    }

    if (mode !== 'collapse' && mode !== 'add-between') {
         // lines calculated above
    } else {
         lines = result.split('\n');
    }

    const end = performance.now();
    self.postMessage({ result, time: end - start, lineCount: lines.length });
};
