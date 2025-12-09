self.onmessage = function(e) {
    const { text, pattern, flags } = e.data;

    try {
        const startTime = performance.now();
        const regex = new RegExp(pattern, flags);
        const matches = [];

        let match;
        // If 'g' flag is not set, exec returns the first match once.
        // If 'g' is set, we loop.

        if (flags.includes('g')) {
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    text: match[0],
                    index: match.index,
                    groups: match.groups
                });
            }
        } else {
            match = regex.exec(text);
            if (match) {
                matches.push({
                    text: match[0],
                    index: match.index,
                    groups: match.groups
                });
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                matches: matches,
                time: endTime - startTime
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: { message: error.message } });
    }
};
