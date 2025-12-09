// Regex Replace Worker

self.onmessage = function(e) {
    const { text, pattern, replacement, flags } = e.data;

    try {
        const startTime = performance.now();

        const regex = new RegExp(pattern, flags);

        // Count matches (optional, but requested)
        // If 'g' is set, matchAll or match length.
        let count = 0;
        if (flags.includes('g')) {
            const matches = text.match(regex);
            count = matches ? matches.length : 0;
        } else {
            count = regex.test(text) ? 1 : 0;
        }

        // Perform replacement
        const result = text.replace(regex, replacement);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                result: result,
                count: count
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};
