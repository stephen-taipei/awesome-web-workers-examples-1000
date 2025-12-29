self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.alphabet, payload.mode);
};

function process(text, alphabet, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    const standardAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let fromAlphabet, toAlphabet;

    if (mode === 'encrypt') {
        fromAlphabet = standardAlphabet;
        toAlphabet = alphabet;
    } else {
        fromAlphabet = alphabet;
        toAlphabet = standardAlphabet;
    }

    // Create mapping
    const map = {};
    for (let i = 0; i < 26; i++) {
        map[fromAlphabet[i]] = toAlphabet[i];
        map[fromAlphabet[i].toLowerCase()] = toAlphabet[i].toLowerCase();
    }

    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        result += map[char] || char;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            alphabet,
            mode,
            duration: performance.now() - startTime
        }
    });
}
