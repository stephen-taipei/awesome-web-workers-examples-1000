self.onmessage = function(e) {
    const { type, text } = e.data;
    const startTime = performance.now();

    try {
        let result = '';

        if (type === 'escape') {
            // Uses JSON.stringify to handle standard JS escaping
            // But we remove the surrounding quotes for convenience
            result = JSON.stringify(text);
            if (result.startsWith('"') && result.endsWith('"')) {
                result = result.substring(1, result.length - 1);
            }
        } else if (type === 'unescape') {
            // Add quotes back and parse
            // Handle edge case where user might already have provided quotes
            let toParse = text;
            if (!toParse.startsWith('"')) {
                toParse = '"' + toParse + '"';
            }
            try {
                result = JSON.parse(toParse);
            } catch (err) {
                // Fallback manual unescape if JSON.parse fails (e.g. single quotes)
                result = text.replace(/\\(.)/g, function(match, char) {
                    switch(char) {
                        case 'n': return '\n';
                        case 'r': return '\r';
                        case 't': return '\t';
                        case 'b': return '\b';
                        case 'f': return '\f';
                        case '"': return '"';
                        case "'": return "'";
                        case '\\': return '\\';
                        default: return char;
                    }
                });
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            text: result,
            time: Math.round(endTime - startTime)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};
