self.onmessage = function(e) {
    const { text, align, width, padChar } = e.data;
    const start = performance.now();

    const lines = text.split('\n');
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.length >= width) return trimmed; // Or truncate? Let's just return if too long.

        const paddingNeeded = width - trimmed.length;

        if (align === 'left') {
            return trimmed + padChar.repeat(paddingNeeded);
        } else if (align === 'right') {
            return padChar.repeat(paddingNeeded) + trimmed;
        } else if (align === 'center') {
            const leftPad = Math.floor(paddingNeeded / 2);
            const rightPad = paddingNeeded - leftPad;
            return padChar.repeat(leftPad) + trimmed + padChar.repeat(rightPad);
        }
        return line;
    });

    const result = processedLines.join('\n');
    const end = performance.now();
    self.postMessage({ result, time: end - start, lineCount: lines.length });
};
