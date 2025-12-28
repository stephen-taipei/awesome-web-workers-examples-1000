self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'TOKENIZE') tokenize(payload.text);
};

function tokenize(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Tokenizing...' } });

    const tokens = [];
    const regex = /(\w+(?:'\w+)?)|([^\w\s])|(\s+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
            tokens.push({ value: match[1], type: 'word', index: match.index });
        } else if (match[2]) {
            tokens.push({ value: match[2], type: 'punctuation', index: match.index });
        } else if (match[3]) {
            tokens.push({ value: match[3], type: 'whitespace', index: match.index });
        }
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            tokens: tokens.filter(t => t.type !== 'whitespace'),
            duration: performance.now() - startTime
        }
    });
}
