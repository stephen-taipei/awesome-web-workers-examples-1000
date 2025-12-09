self.onmessage = function(e) {
    const { text, mode } = e.data;
    const startTime = performance.now();

    let convertedText = '';

    if (mode === 'toFull') {
        // Half to Full
        // ASCII 33-126 -> FF01-FF5E
        // Space 32 -> 12288 (Ideographic Space)
        convertedText = text.replace(/[\u0020-\u007E]/g, function(ch) {
            if (ch === ' ') return '\u3000';
            return String.fromCharCode(ch.charCodeAt(0) + 0xFEE0);
        });
    } else {
        // Full to Half
        // FF01-FF5E -> 33-126
        // 12288 -> 32
        convertedText = text.replace(/[\uFF01-\uFF5E\u3000]/g, function(ch) {
            if (ch === '\u3000') return ' ';
            return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
        });
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        convertedText: convertedText,
        time: endTime - startTime
    });
};
