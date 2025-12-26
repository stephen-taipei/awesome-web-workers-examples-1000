self.onmessage = function(e) {
    const text = e.data.text;
    const startTime = performance.now();

    try {
        const result = analyzeUnicode(text);
        const endTime = performance.now();

        self.postMessage({
            result: result,
            time: endTime - startTime
        });
    } catch (err) {
        self.postMessage({
            error: err.toString(),
            time: performance.now() - startTime
        });
    }
};

function analyzeUnicode(str) {
    const result = [];

    // 使用 for...of 循環正確處理 surrogate pairs (Emoji 等)
    for (const char of str) {
        const codePoint = char.codePointAt(0);

        // UTF-16 Units
        let utf16 = '';
        for (let i = 0; i < char.length; i++) {
            utf16 += '\\u' + char.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
        }

        // HTML Entity
        const html = `&#${codePoint};`;

        // JS Escape
        let js = '';
        if (codePoint <= 0xFFFF) {
             js = '\\u' + codePoint.toString(16).padStart(4, '0').toUpperCase();
        } else {
             js = '\\u{' + codePoint.toString(16).toUpperCase() + '}';
        }

        result.push({
            char: char,
            codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
            utf16: utf16,
            html: html,
            js: js
        });
    }

    return result;
}
