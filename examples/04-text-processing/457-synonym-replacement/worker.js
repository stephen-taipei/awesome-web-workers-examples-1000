self.onmessage = function(e) {
    const { text, synonyms, caseSensitive } = e.data;
    const startTime = performance.now();

    let processedText = text;
    let count = 0;

    try {
        // Create regex for all keys
        // Escape special regex characters
        const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const keys = Object.keys(synonyms).sort((a, b) => b.length - a.length); // Longest match first

        if (keys.length > 0) {
            const pattern = new RegExp(
                `\\b(${keys.map(escapeRegExp).join('|')})\\b`,
                caseSensitive ? 'g' : 'gi'
            );

            processedText = text.replace(pattern, (matched) => {
                count++;
                // Handle case preservation if not case sensitive
                // If the key exists directly, use it.
                // If case insensitive, we need to find which key matched.

                let key = matched;
                if (!caseSensitive) {
                    // Find the actual key in synonyms that matches this (ignoring case)
                    // Since we constructed regex from keys, one must match.
                    key = keys.find(k => k.toLowerCase() === matched.toLowerCase());
                }

                let replacement = synonyms[key];

                // Simple case preservation logic
                if (!caseSensitive) {
                    if (matched === matched.toUpperCase()) {
                        return replacement.toUpperCase();
                    }
                    if (matched[0] === matched[0].toUpperCase()) {
                        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
                    }
                }

                return replacement;
            });
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            processedText: processedText,
            count: count,
            time: endTime - startTime
        });
    } catch (err) {
        self.postMessage({
            type: 'error',
            error: err.message
        });
    }
};
