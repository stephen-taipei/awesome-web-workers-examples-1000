self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'TRANSFORM') transform(payload.text, payload.pattern, payload.replacement, payload.flags);
};

function transform(text, pattern, replacement, flags) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Compiling regex...' } });

    let regex;
    try {
        regex = new RegExp(pattern, flags);
    } catch (e) {
        self.postMessage({ type: 'ERROR', payload: { message: 'Invalid regex: ' + e.message } });
        return;
    }

    self.postMessage({ type: 'PROGRESS', payload: { percent: 60, message: 'Replacing...' } });

    let count = 0;
    const result = text.replace(regex, (match) => {
        count++;
        return replacement;
    });

    self.postMessage({
        type: 'RESULT',
        payload: { result, duration: performance.now() - startTime, stats: { count } }
    });
}
