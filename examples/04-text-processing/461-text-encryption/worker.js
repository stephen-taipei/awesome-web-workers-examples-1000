self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.key, payload.mode);
};

function process(text, key, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: mode === 'encrypt' ? 'Encrypting...' : 'Decrypting...' } });

    let result;
    let hex = '';

    if (mode === 'encrypt') {
        // XOR encrypt and encode as base64
        const encrypted = xorCrypt(text, key);
        hex = toHex(encrypted);
        result = btoa(encrypted);
    } else {
        // Decode from base64 and XOR decrypt
        try {
            const decoded = atob(text);
            result = xorCrypt(decoded, key);
        } catch (e) {
            result = xorCrypt(text, key);
        }
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            hex,
            mode,
            keyLength: key.length,
            duration: performance.now() - startTime
        }
    });
}

function xorCrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return result;
}

function toHex(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        hex += code.toString(16).padStart(2, '0') + ' ';
    }
    return hex.trim();
}
