self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SEARCH') regexSearch(payload.text, payload.pattern);
};

function regexSearch(text, pattern) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Compiling regex...' } });

    let regex;
    try {
        regex = new RegExp(pattern, 'g');
    } catch (e) {
        self.postMessage({ type: 'ERROR', payload: { message: 'Invalid regex: ' + e.message } });
        return;
    }

    self.postMessage({ type: 'PROGRESS', payload: { percent: 60, message: 'Searching...' } });

    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push({ match: match[0], index: match.index, groups: match.slice(1) });
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            matches,
            duration: performance.now() - startTime,
            stats: { count: matches.length }
        }
    });
}
