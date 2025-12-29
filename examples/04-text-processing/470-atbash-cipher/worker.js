self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text);
};

function process(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    let result = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0);

        if (code >= 65 && code <= 90) {
            // Uppercase: A(65) -> Z(90), B(66) -> Y(89), etc.
            result += String.fromCharCode(90 - (code - 65));
        } else if (code >= 97 && code <= 122) {
            // Lowercase: a(97) -> z(122), b(98) -> y(121), etc.
            result += String.fromCharCode(122 - (code - 97));
        } else {
            // Non-alphabetic characters remain unchanged
            result += char;
        }
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            duration: performance.now() - startTime
        }
    });
}
