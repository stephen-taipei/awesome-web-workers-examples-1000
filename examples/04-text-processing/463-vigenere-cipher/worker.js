self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.key, payload.mode);
};

function process(text, key, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    let result = '';
    let keyIndex = 0;
    const steps = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0);

        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            const isUpper = code >= 65 && code <= 90;
            const base = isUpper ? 65 : 97;
            const charValue = code - base;
            const keyChar = key[keyIndex % key.length];
            const keyValue = keyChar.charCodeAt(0) - 65;

            let newValue;
            if (mode === 'encrypt') {
                newValue = (charValue + keyValue) % 26;
            } else {
                newValue = (charValue - keyValue + 26) % 26;
            }

            const newChar = String.fromCharCode(newValue + base);
            result += newChar;

            if (steps.length < 20) {
                steps.push({
                    plain: char,
                    key: keyChar,
                    cipher: newChar
                });
            }

            keyIndex++;
        } else {
            result += char;
        }
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            key,
            mode,
            steps,
            duration: performance.now() - startTime
        }
    });
}
