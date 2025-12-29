self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.shift, payload.mode);
};

function process(text, shift, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    // For decryption, reverse the shift
    const actualShift = mode === 'decrypt' ? (26 - (shift % 26)) : (shift % 26);

    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0);

        if (code >= 65 && code <= 90) {
            // Uppercase
            result += String.fromCharCode(((code - 65 + actualShift) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
            // Lowercase
            result += String.fromCharCode(((code - 97 + actualShift) % 26) + 97);
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
            shift,
            mode,
            duration: performance.now() - startTime
        }
    });
}
