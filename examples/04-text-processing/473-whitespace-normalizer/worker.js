self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'NORMALIZE') normalize(payload.text, payload.options);
};

function normalize(text, options) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Normalizing...' } });

    let result = text;

    // Convert tabs to spaces
    if (options.tabsToSpaces) {
        result = result.replace(/\t/g, '    ');
    }

    // Process line by line
    if (options.trimLines || options.collapseSpaces || options.removeTrailing) {
        const lines = result.split('\n');
        result = lines.map(line => {
            let processed = line;

            // Collapse multiple spaces
            if (options.collapseSpaces) {
                processed = processed.replace(/ {2,}/g, ' ');
            }

            // Trim each line
            if (options.trimLines) {
                processed = processed.trim();
            } else if (options.removeTrailing) {
                // Only remove trailing whitespace
                processed = processed.replace(/\s+$/, '');
            }

            return processed;
        }).join('\n');
    }

    // Collapse multiple blank lines
    if (options.collapseLines) {
        result = result.replace(/\n{3,}/g, '\n\n');
    }

    const originalSize = text.length;
    const newSize = result.length;
    const saved = originalSize - newSize;
    const percent = originalSize > 0 ? ((saved / originalSize) * 100).toFixed(1) : 0;

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            originalSize,
            newSize,
            saved,
            percent,
            duration: performance.now() - startTime
        }
    });
}
