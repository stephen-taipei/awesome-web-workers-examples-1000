self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.mode);
};

function process(text, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Converting...' } });

    let result, breakdown = [];

    if (mode === 'encode') {
        const encoded = encode(text);
        result = encoded.result;
        breakdown = encoded.breakdown;
    } else {
        result = decode(text);
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            breakdown,
            mode,
            duration: performance.now() - startTime
        }
    });
}

function encode(text) {
    const breakdown = [];
    const binaryArray = [];

    for (let i = 0; i < text.length; i++) {
        const ascii = text.charCodeAt(i);
        const binary = ascii.toString(2).padStart(8, '0');
        binaryArray.push(binary);
        breakdown.push({
            char: text[i],
            ascii,
            binary
        });
    }

    return {
        result: binaryArray.join(' '),
        breakdown
    };
}

function decode(binary) {
    // Remove all non-binary characters except spaces
    const cleaned = binary.replace(/[^01\s]/g, '');
    const bytes = cleaned.split(/\s+/).filter(b => b.length > 0);

    let result = '';
    for (const byte of bytes) {
        // Handle bytes of any length
        const paddedByte = byte.padStart(8, '0');
        const charCode = parseInt(paddedByte, 2);
        if (!isNaN(charCode) && charCode > 0) {
            result += String.fromCharCode(charCode);
        }
    }

    return result;
}
