self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.variant);
};

function process(text, variant) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    let result = '';
    let changed = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const converted = convertChar(char, variant);

        if (converted !== char) changed++;
        result += converted;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            variant,
            changed,
            duration: performance.now() - startTime
        }
    });
}

function convertChar(char, variant) {
    const code = char.charCodeAt(0);

    switch (variant) {
        case 'rot13':
            return rot13(char, code);
        case 'rot5':
            return rot5(char, code);
        case 'rot18':
            return rot18(char, code);
        case 'rot47':
            return rot47(char, code);
        default:
            return char;
    }
}

function rot13(char, code) {
    if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + 13) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + 13) % 26) + 97);
    }
    return char;
}

function rot5(char, code) {
    if (code >= 48 && code <= 57) {
        return String.fromCharCode(((code - 48 + 5) % 10) + 48);
    }
    return char;
}

function rot18(char, code) {
    // ROT13 for letters, ROT5 for numbers
    if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + 13) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + 13) % 26) + 97);
    } else if (code >= 48 && code <= 57) {
        return String.fromCharCode(((code - 48 + 5) % 10) + 48);
    }
    return char;
}

function rot47(char, code) {
    // Rotate printable ASCII characters (33-126)
    if (code >= 33 && code <= 126) {
        return String.fromCharCode(((code - 33 + 47) % 94) + 33);
    }
    return char;
}
