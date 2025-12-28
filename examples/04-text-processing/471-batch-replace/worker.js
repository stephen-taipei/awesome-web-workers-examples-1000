self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'REPLACE') replace(payload.text, payload.replacements, payload.caseSensitive, payload.useRegex);
};

function replace(text, replacementsStr, caseSensitive, useRegex) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Replacing...' } });

    // Parse replacements
    const lines = replacementsStr.split('\n').filter(l => l.trim());
    const replacements = lines.map(line => {
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) return null;
        return {
            find: line.slice(0, eqIndex),
            replace: line.slice(eqIndex + 1)
        };
    }).filter(r => r !== null);

    let result = text;
    const summary = [];
    let totalReplacements = 0;

    for (const r of replacements) {
        let count = 0;
        const flags = caseSensitive ? 'g' : 'gi';

        try {
            let regex;
            if (useRegex) {
                regex = new RegExp(r.find, flags);
            } else {
                // Escape special regex characters for literal search
                const escaped = r.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(escaped, flags);
            }

            const matches = result.match(regex);
            count = matches ? matches.length : 0;
            result = result.replace(regex, r.replace);
        } catch (e) {
            // Invalid regex, skip
            count = 0;
        }

        summary.push({
            find: r.find,
            replace: r.replace,
            count
        });

        totalReplacements += count;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            summary,
            totalReplacements,
            duration: performance.now() - startTime
        }
    });
}
