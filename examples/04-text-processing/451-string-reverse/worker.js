self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'REVERSE') reverse(payload.text, payload.mode);
};

function reverse(text, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Reversing...' } });

    let result;

    switch (mode) {
        case 'chars':
            result = reverseChars(text);
            break;
        case 'words':
            result = reverseWords(text);
            break;
        case 'both':
            result = reverseBoth(text);
            break;
        case 'lines':
            result = reverseLines(text);
            break;
        default:
            result = text;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            mode,
            duration: performance.now() - startTime
        }
    });
}

function reverseChars(str) {
    // Handle Unicode properly using spread operator
    return [...str].reverse().join('');
}

function reverseWords(str) {
    return str.split(/(\s+)/).reverse().join('');
}

function reverseBoth(str) {
    // Reverse both character order and word order
    return str.split(/(\s+)/).map(part => {
        if (/^\s+$/.test(part)) return part;
        return [...part].reverse().join('');
    }).reverse().join('');
}

function reverseLines(str) {
    return str.split('\n').reverse().join('\n');
}
