self.onmessage = function(e) {
    const { text, lang } = e.data;
    const startTime = performance.now();

    try {
        const html = highlight(text, lang);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            html: html,
            time: Math.round(endTime - startTime)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function highlight(code, lang) {
    let tokens = [];

    // Simple tokenizer based on Regex
    // This is not a parser, just lexical analysis

    if (lang === 'js' || lang === 'css' || lang === 'python' || lang === 'html') {
        // Common patterns
        const patterns = {
            'js': [
                { type: 'comment', regex: /\/\/.*|\/\*[\s\S]*?\*\//g },
                { type: 'string', regex: /"(\\\.|[^"\\])*"|'(\\\.|[^'\\])*'|`(\\\.|[^`\\])*`/g },
                { type: 'keyword', regex: /\b(function|return|if|else|for|while|const|let|var|class|import|export|from|async|await|try|catch|new|this|typeof)\b/g },
                { type: 'builtin', regex: /\b(console|window|document|Math|JSON|Promise|Array|Object)\b/g },
                { type: 'number', regex: /\b\d+(\.\d+)?\b/g },
                { type: 'operator', regex: /[\+\-\*\/%=&|<>!]+/g },
                { type: 'function', regex: /\b\w+(?=\()/g } // word followed by (
            ],
            'python': [
                { type: 'comment', regex: /#.*/g },
                { type: 'string', regex: /"(\\\.|[^"\\])*"|'(\\\.|[^'\\])*'/g },
                { type: 'keyword', regex: /\b(def|return|if|else|elif|for|while|import|from|class|try|except|with|as|pass|lambda|global|nonlocal|True|False|None)\b/g },
                { type: 'builtin', regex: /\b(print|len|range|str|int|float|list|dict|set|open)\b/g },
                { type: 'number', regex: /\b\d+(\.\d+)?\b/g },
                { type: 'operator', regex: /[\+\-\*\/%=&|<>!]+/g },
                { type: 'function', regex: /\b\w+(?=\()/g }
            ],
            'css': [
                { type: 'comment', regex: /\/\*[\s\S]*?\*\//g },
                { type: 'string', regex: /"(\\\.|[^"\\])*"|'(\\\.|[^'\\])*'/g },
                // Selectors (heuristic: start of line or after })
                { type: 'keyword', regex: /@\w+/g }, // @media, @import
                { type: 'number', regex: /#([0-9a-fA-F]{3}){1,2}\b|\b\d+(px|em|rem|%|vh|vw|s|ms)?\b/g },
                { type: 'builtin', regex: /:[a-z-]+/g }, // pseudo-classes
                // Properties? Hard to distinguish without context in simple regex
            ],
            'html': [
                { type: 'comment', regex: /<!--[\s\S]*?-->/g },
                { type: 'keyword', regex: /<\/?[a-zA-Z0-9-]+/g }, // tags
                { type: 'string', regex: /"(\\\.|[^"\\])*"|'(\\\.|[^'\\])*'/g },
                { type: 'operator', regex: /=/g }
            ]
        };

        const langPatterns = patterns[lang] || patterns['js'];

        // Tokenizing strategy:
        // We can't just run regexes independently because they overlap (e.g. keyword inside string).
        // Correct way: Combined regex or prioritize.
        // Simple way: "Eat" the string from start.

        let remaining = code;
        let resultHtml = '';

        while (remaining.length > 0) {
            let bestMatch = null;
            let bestType = null;
            let bestIndex = Infinity;

            // Find the earliest match among all patterns
            for (let p of langPatterns) {
                // Reset regex
                p.regex.lastIndex = 0;
                const match = p.regex.exec(remaining);
                if (match) {
                    if (match.index < bestIndex) {
                        bestIndex = match.index;
                        bestMatch = match[0];
                        bestType = p.type;
                    }
                }
            }

            // Check if match starts at 0?
            // If bestIndex > 0, then we have plain text before match
            // However, regex might match something later inside a string if we are not careful.
            // But we treat "earliest match" as the winner. This assumes patterns are mutually exclusive enough or prioritized by "earliest wins".
            // Problem: "function" inside "var x = 'function';"
            // Our string regex will match "'function'" starting at index 8. Keyword "function" regex matches at 9.
            // So string wins. Correct.

            if (bestMatch !== null) {
                // Append plain text before match
                if (bestIndex > 0) {
                    resultHtml += escapeHtml(remaining.substring(0, bestIndex));
                }

                // Append token
                resultHtml += `<span class="token-${bestType}">${escapeHtml(bestMatch)}</span>`;

                // Advance
                remaining = remaining.substring(bestIndex + bestMatch.length);
            } else {
                // No more matches
                resultHtml += escapeHtml(remaining);
                remaining = '';
            }
        }

        return resultHtml;
    }

    return escapeHtml(code);
}
