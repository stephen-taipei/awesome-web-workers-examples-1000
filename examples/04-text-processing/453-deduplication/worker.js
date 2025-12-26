self.onmessage = function(e) {
    const { text, ignoreCase, trimWhitespace } = e.data;
    const startTime = performance.now();

    // Split lines
    const lines = text.split(/\r?\n/);
    const originalCount = lines.length;

    // Use Set for O(1) lookups
    // If ignoreCase is true, we need to track seen keys separately to preserve original casing of first occurrence

    const uniqueLines = [];
    const seen = new Set();

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (trimWhitespace) {
            line = line.trim();
        }

        // Key for uniqueness check
        let key = line;
        if (ignoreCase) {
            key = key.toLowerCase();
        }

        if (!seen.has(key)) {
            seen.add(key);
            uniqueLines.push(line);
        }
    }

    const result = uniqueLines.join('\n');
    const newCount = uniqueLines.length;

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        result: result,
        originalCount: originalCount,
        newCount: newCount,
        duration: endTime - startTime
    });
};
