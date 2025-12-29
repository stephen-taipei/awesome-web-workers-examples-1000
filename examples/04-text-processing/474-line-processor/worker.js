self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.options);
};

function process(text, options) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    let lines = text.split('\n');
    const originalLines = lines.length;

    // Trim whitespace
    if (options.trimLines) {
        lines = lines.map(l => l.trim());
    }

    // Remove empty lines
    if (options.removeEmpty) {
        lines = lines.filter(l => l.length > 0);
    }

    // Find duplicates before removing
    const counts = {};
    lines.forEach(l => {
        counts[l] = (counts[l] || 0) + 1;
    });
    const duplicates = Object.entries(counts)
        .filter(([_, count]) => count > 1)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

    // Remove duplicates
    if (options.removeDuplicates) {
        lines = [...new Set(lines)];
    }

    // Sort lines
    if (options.sortLines) {
        lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }

    // Reverse order
    if (options.reverseSort) {
        lines.reverse();
    }

    // Add line numbers
    if (options.addNumbers) {
        const padLength = String(lines.length).length;
        lines = lines.map((l, i) => `${String(i + 1).padStart(padLength, ' ')}. ${l}`);
    }

    const result = lines.join('\n');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result,
            originalLines,
            resultLines: lines.length,
            removed: originalLines - lines.length,
            duplicates,
            duration: performance.now() - startTime
        }
    });
}
